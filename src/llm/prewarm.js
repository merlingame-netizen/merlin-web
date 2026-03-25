// M.E.R.L.I.N. — LLM Pre-warm System
// Health check on boot + background card pre-generation with 2-card buffer
// Guarantees card delivery within 3s (LLM or fallback)

import { generateCard, generateEffects } from './groq_client.js'
import { getFallbackCard } from '../data/fallback_cards.js'
import { buildNarratorContext } from './context_builder.js'

let _status = 'connecting' // connecting | ok | slow | error
let _cardBuffer = [] // max 2 pre-generated cards
let _prewarming = false
const _listeners = new Set()

export function getLLMStatus() { return _status }
export function getPrewarmedCard() {
  if (_cardBuffer.length > 0) return _cardBuffer.shift()
  return null
}
export function clearPrewarmedCard() { _cardBuffer = [] }

export function onStatusChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

function _emitStatus(s) {
  _status = s
  for (const fn of _listeners) fn(s)
}

export async function checkLLMHealth() {
  _emitStatus('connecting')

  for (let attempt = 0; attempt < 3; attempt++) {
    const t0 = Date.now()
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'narrator',
          system: 'Respond with: {"status":"ok"}',
          user: 'Health check. Reply JSON only.',
        }),
      })

      const elapsed = Date.now() - t0
      if (!res.ok) {
        console.warn(`[LLM] Health check attempt ${attempt + 1} failed: HTTP ${res.status}`)
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 10000))
          continue
        }
        _emitStatus('error')
        return 'error'
      }

      const status = elapsed < 3000 ? 'ok' : 'slow'
      console.log(`[LLM] Health OK (${elapsed}ms) — status: ${status}`)
      _emitStatus(status)
      return status
    } catch (err) {
      console.warn(`[LLM] Health check attempt ${attempt + 1} error:`, err.message)
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 10000))
        continue
      }
      _emitStatus('error')
      return 'error'
    }
  }
}

// Generate a single card with effects attached
async function _generateCardWithEffects(state) {
  const card = await generateCard(state)
  let effects
  try {
    effects = await generateEffects(state, card)
  } catch {
    effects = _defaultEffects()
  }
  card._effects = effects
  return card
}

function _defaultEffects() {
  return {
    effects_0: ['SHIFT_FACTION:druides:5', 'ADD_TENSION:5'],
    effects_1: ['SHIFT_FACTION:anciens:5', 'ADD_KARMA:10'],
    effects_2: ['SHIFT_FACTION:guerriers:5', 'MODIFY_BOND:5'],
  }
}

function _healingEffects() {
  return {
    effects_0: ['HEAL_LIFE:1', 'SHIFT_FACTION:druides:5'],
    effects_1: ['HEAL_LIFE:1', 'ADD_KARMA:10', 'SHIFT_FACTION:pretresses:5'],
    effects_2: ['SHIFT_FACTION:anciens:5', 'MODIFY_BOND:5'],
  }
}

// Last-resort card when everything else fails
function _emergencyCard() {
  return {
    id: 'emergency_prewarm',
    title: 'Un Moment de Calme',
    text: 'Le vent se tait, les ombres reculent. Un instant de paix dans la tempête.',
    choices: [
      { label: 'Se reposer', preview: 'Récupération' },
      { label: 'Méditer', preview: 'Réflexion' },
      { label: 'Continuer', preview: 'Avancer' },
    ],
    tags: ['recovery'],
    _effects: _defaultEffects(),
  }
}

function _buildFallbackWithEffects(state) {
  try {
    const ctx = buildNarratorContext(state)
    const card = getFallbackCard(ctx)
    if (card) {
      // Healing cards get healing effects
      card._effects = card.tags?.includes('healing')
        ? _healingEffects()
        : _defaultEffects()
      return card
    }
  } catch (err) {
    console.warn('[LLM] Context build failed, using minimal fallback:', err?.message)
  }
  // Fallback with empty context — still picks from the 56+ card pool
  try {
    const card = getFallbackCard({})
    card._effects = _defaultEffects()
    return card
  } catch {
    return null
  }
}

// Refill buffer in background (non-blocking)
function _refillBuffer(state) {
  if (_prewarming || _cardBuffer.length >= 2) return
  _prewarming = true

  _generateCardWithEffects(state)
    .then(card => {
      if (_cardBuffer.length < 2) _cardBuffer.push(card)
      console.log(`[LLM] Buffer refill OK — ${_cardBuffer.length} cards ready`)
    })
    .catch(err => {
      console.warn('[LLM] Buffer refill failed:', err.message)
    })
    .finally(() => { _prewarming = false })
}

// Pre-warm multiple cards at startup
export async function prewarmMultiple(state, count = 2) {
  if (!state?.run) {
    console.warn('[LLM] Skipping prewarm — run not initialized')
    return
  }
  console.log(`[LLM] Pre-warming ${count} cards...`)
  try {
    const promises = []
    for (let i = 0; i < count; i++) {
      promises.push(
        _generateCardWithEffects(state)
          .then(card => {
            if (card && _cardBuffer.length < 2) _cardBuffer.push(card)
          })
          .catch(err => console.warn(`[LLM] Prewarm ${i + 1} failed:`, err?.message ?? err))
      )
    }
    await Promise.allSettled(promises)
    console.log(`[LLM] Pre-warm done — ${_cardBuffer.length} cards in buffer`)
  } catch (err) {
    console.warn('[LLM] Pre-warm error:', err?.message ?? err)
  }
}

// Single card pre-warm (legacy compat)
export async function prewarmCard(state) {
  if (_prewarming || _cardBuffer.length >= 2) return
  _prewarming = true
  try {
    const card = await _generateCardWithEffects(state)
    if (_cardBuffer.length < 2) _cardBuffer.push(card)
  } catch (err) {
    console.warn('[Prewarm] Failed:', err.message)
  } finally {
    _prewarming = false
  }
}

// Get a card as fast as possible: buffer -> LLM race -> fallback
// Guaranteed to return within timeoutMs
export async function getPrewarmedCardOrFallback(state, timeoutMs = 3000) {
  // 1. Buffer available → instant
  if (_cardBuffer.length > 0) {
    const card = _cardBuffer.shift()
    _refillBuffer(state) // async refill, non-blocking
    console.log(`[LLM] Served from buffer (${_cardBuffer.length} remaining)`)
    return card
  }

  // 2. Race LLM vs timeout — catch LLM rejection so race never throws
  const llmPromise = _generateCardWithEffects(state)
    .catch(err => {
      console.warn('[LLM] Generation failed in race:', err?.message ?? err)
      return null
    })
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve(null), timeoutMs)
  )

  const result = await Promise.race([llmPromise, timeoutPromise])
  if (result) {
    _refillBuffer(state)
    console.log('[LLM] Served from fresh LLM generation')
    return result
  }

  // 3. Timeout or LLM failed → use fallback, let LLM finish in background for buffer
  llmPromise
    .then(card => { if (card && _cardBuffer.length < 2) _cardBuffer.push(card) })
    .catch(() => {})

  console.log('[LLM] Timeout/fail — serving fallback card')
  try {
    const fallback = _buildFallbackWithEffects(state)
    if (!fallback) return _emergencyCard()
    return fallback
  } catch (err) {
    console.error('[LLM] Fallback build failed:', err?.message ?? err)
    return _emergencyCard()
  }
}

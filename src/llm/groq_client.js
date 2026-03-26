// M.E.R.L.I.N. — Groq API Client (enriched pipeline with guardrails)

import { buildNarratorContext, buildGMContext } from './context_builder.js'
import { buildNarratorPrompt, buildGMPrompt } from './prompt_builder.js'
import { validateCard, validateEffects, recordCardText } from './guardrails.js'
import { recordEvent } from './event_selector.js'
import { getFallbackCard } from '../data/fallback_cards.js'

const API_URL = '/api/llm'
const MAX_RETRIES = 2

export async function generateCard(state) {
  const ctx = buildNarratorContext(state)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildNarratorPrompt(ctx)
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'narrator',
          system: prompt.system,
          user: prompt.user,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Try parsed first, then attempt JSON repair on raw
      let card = data.parsed
      if (!card && data.raw) {
        try {
          // Basic JSON repair: trim, fix trailing commas, extract JSON block
          let raw = data.raw.trim()
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (jsonMatch) raw = jsonMatch[0]
          raw = raw.replace(/,\s*([}\]])/g, '$1') // trailing commas
          card = JSON.parse(raw)
          console.log('[Narrator] JSON repaired from raw')
        } catch { /* repair failed */ }
      }

      if (card) {
        const validation = validateCard(card)
        if (validation.valid) {
          recordCardText(card.text)
          recordEvent(prompt.category)
          return card
        }
        console.warn(`[Narrator] Guardrail fail (attempt ${attempt}):`, validation.errors)
      } else {
        throw new Error('No parsed response')
      }
    } catch (err) {
      console.warn(`[Narrator] attempt ${attempt} failed:`, err.message)
    }
  }

  // Fallback: contextual card from 100+ pool
  console.warn('[Narrator] Using contextual fallback')
  return getFallbackCard(ctx)
}

export async function generateEffects(state, card) {
  const ctx = buildGMContext(state, card)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildGMPrompt(ctx)
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'gm',
          system: prompt.system,
          user: prompt.user,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.parsed) {
        const normalized = _normalizeEffects(data.parsed)
        const validation = validateEffects(normalized)
        if (validation.valid) return normalized
        console.warn(`[GM] Guardrail fail (attempt ${attempt}):`, validation.errors)
      } else {
        throw new Error('No parsed response')
      }
    } catch (err) {
      console.warn(`[GM] attempt ${attempt} failed:`, err.message)
    }
  }

  return _buildFallbackEffects(ctx)
}

function _normalizeEffects(raw) {
  return {
    effects_0: Array.isArray(raw.effects_0) ? raw.effects_0 : [],
    effects_1: Array.isArray(raw.effects_1) ? raw.effects_1 : [],
    effects_2: Array.isArray(raw.effects_2) ? raw.effects_2 : [],
  }
}

function _buildFallbackEffects() {
  return {
    effects_0: ['SHIFT_FACTION:guerriers:5', 'ADD_TENSION:5'],
    effects_1: ['SHIFT_FACTION:druides:5', 'ADD_KARMA:10'],
    effects_2: ['SHIFT_FACTION:anciens:5', 'MODIFY_BOND:5'],
  }
}

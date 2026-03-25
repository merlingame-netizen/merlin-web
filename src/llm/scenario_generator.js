// M.E.R.L.I.N. — Scenario Generator
// Generates 5-card narrative arcs via LLM, served sequentially
// Fallback: individual card generation if scenario fails

import { buildNarratorContext } from './context_builder.js'
import { TEMPLATES, interpolate } from '../data/prompt_templates.js'
import { validateCard } from './guardrails.js'

const API_URL = '/api/llm'
const SCENARIO_SIZE = 5

let _scenario = null    // { cards: [...], index: 0, title, intro }
let _generating = false
let _prefetching = false

export function getNextScenarioCard() {
  if (!_scenario || _scenario.index >= _scenario.cards.length) return null
  const card = _scenario.cards[_scenario.index]
  _scenario.index++
  console.log(`[Scenario] Serving card ${_scenario.index}/${_scenario.cards.length}: ${card.title}`)
  return card
}

export function hasCardsRemaining() {
  return _scenario && _scenario.index < _scenario.cards.length
}

export function cardsRemaining() {
  if (!_scenario) return 0
  return _scenario.cards.length - _scenario.index
}

export function clearScenario() {
  _scenario = null
}

export function getScenarioTitle() {
  return _scenario?.title || null
}

export function getScenarioIntro() {
  return _scenario?.intro || null
}

export async function generateScenario(state) {
  if (_generating) return false
  _generating = true

  try {
    const ctx = buildNarratorContext(state)
    const prompt = _buildScenarioPrompt(ctx)

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'scenario',
        system: prompt.system,
        user: prompt.user,
      }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    if (data.parsed?.cards && Array.isArray(data.parsed.cards)) {
      const validCards = _validateAndNormalize(data.parsed.cards)
      if (validCards.length >= 3) {
        const title = data.parsed.title || data.parsed.scenario_title || validCards[0]?.title || 'Rencontre en Broceliande'
        const intro = data.parsed.intro || null
        _scenario = { cards: validCards, index: 0, title, intro }
        console.log(`[Scenario] Generated ${validCards.length}-card arc: "${_scenario.title}"`)
        if (intro) console.log(`[Scenario] Intro: ${intro.slice(0, 80)}...`)
        return true
      }
      console.warn(`[Scenario] Only ${validCards.length} valid cards — insufficient`)
    }

    console.warn('[Scenario] Invalid response format')
    return false
  } catch (err) {
    console.warn('[Scenario] Generation failed:', err.message)
    return false
  } finally {
    _generating = false
  }
}

export function prefetchNextScenario(state) {
  if (_prefetching || _generating) return
  if (_scenario && _scenario.index < _scenario.cards.length - 1) return // still have cards

  _prefetching = true
  generateScenario(state)
    .catch(() => {})
    .finally(() => { _prefetching = false })
}

const VALID_SCENE_TAGS = new Set([
  'stream', 'bridge', 'merchant', 'stone_circle', 'campfire', 'ancient_tree',
  'cave', 'cairn', 'fountain', 'animal', 'fairy', 'menhir', 'dolmen', 'mist',
  'flower_bush', 'fork', 'boat', 'mushrooms', 'weapons', 'ruins', 'bird', 'totem',
])

function _validateAndNormalize(cards) {
  const valid = []
  for (const raw of cards.slice(0, SCENARIO_SIZE)) {
    // Resolve scene_tag — validate against known tags, default to 'glow'
    const rawTag = typeof raw.scene_tag === 'string' ? raw.scene_tag.toLowerCase().trim() : ''
    const scene_tag = VALID_SCENE_TAGS.has(rawTag) ? rawTag : 'glow'

    // Ensure proper structure
    const card = {
      id: `scenario_${Date.now()}_${valid.length}`,
      title: raw.title ?? 'Rencontre',
      text: raw.text ?? '',
      scene_tag,
      choices: Array.isArray(raw.choices) ? raw.choices.slice(0, 3) : [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    }

    // Normalize choices
    card.choices = card.choices.map(c => ({
      label: c.label ?? c[0] ?? '...',
      preview: c.preview ?? c[1] ?? '',
    }))

    // Pad to 3 choices if fewer
    while (card.choices.length < 3) {
      card.choices.push({ label: 'Continuer', preview: 'Avancer' })
    }

    // Soft validation — skip guardrails for length (LLM may slightly exceed)
    if (card.text.length >= 20 && card.title.length >= 2) {
      valid.push(card)
    }
  }
  return valid
}

function _buildScenarioPrompt(ctx) {
  const system = TEMPLATES.scenario_system
  const user = interpolate(TEMPLATES.scenario_user, {
    biome: ctx.biome ?? 'Broceliande',
    day: ctx.day ?? 1,
    season: ctx.season ?? 'Samhain',
    faction_states: ctx.faction_states ?? '',
    souffle: ctx.souffle ?? 3,
    life: ctx.life ?? 3,
    narrative_phase: ctx.narrative_phase ?? '',
    danger_context: ctx.danger_context ?? '',
    biome_context: ctx.biome_context ?? '',
  })
  return { system, user }
}

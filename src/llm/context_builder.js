// M.E.R.L.I.N. — Context Builder
// Builds complete LLM context from game state + registries (budget ~400 tokens)

import { FACTIONS, FACTION_INFO, BIOME_FACTIONS, getFactionLabel, SEASONS } from '../game/constants.js'
import { getBiome, getContextForLLM } from '../game/biome_system.js'
import { getCalendarContext } from '../game/calendar.js'
import { getPromiseContext } from '../game/promise_system.js'
import { buildRAGContext } from './rag_manager.js'
import { getDifficultyContextForLLM } from './difficulty_adapter.js'

// Registries are injected from main.js via setRegistries()
let _registries = null

export function setRegistries(reg) {
  _registries = reg
}

export function buildNarratorContext(state) {
  const { run } = state
  if (!run) return { error: 'run not initialized' }
  const biome = getBiome(run.biome_key)
  const season = SEASONS[run.season_index % SEASONS.length]

  // Build faction state string
  const factionStates = FACTIONS.map(f => {
    const rep = run.factions?.[f] ?? 50
    return `${FACTION_INFO[f].label}=${getFactionLabel(rep)}(${rep})`
  }).join(', ')

  // Dominant factions for this biome
  const dominantFactions = (BIOME_FACTIONS[run.biome_key] ?? ['anciens']).map(f =>
    `${FACTION_INFO[f]?.label ?? f}(${run.factions?.[f] ?? 50})`
  ).join(', ')

  const base = {
    // Faction state (replaces triade)
    faction_states: factionStates,
    dominant_factions: dominantFactions,
    souffle: run.souffle,
    life: run.life_essence,
    day: run.day,
    season,

    // Biome
    biome: biome.name,
    biome_key: run.biome_key,
    biome_context: getContextForLLM(run.biome_key),

    // Narrative phase
    narrative_phase: _getNarrativePhase(run.cards_played),
    danger_context: _getDangerContext(run),
    event_category: '',
    tags: (run.active_tags ?? []).join(', ') || 'aucun',

    // For GM
    cards_played: run.cards_played,
    tension: run.hidden?.tension ?? 0,
    karma: run.hidden?.karma ?? 0,
    danger_level: _getDangerLevel(run),
  }

  // Enrich with registries if available
  if (_registries) {
    const ragSections = {}

    ragSections.factions = `Factions: ${factionStates}`
    ragSections.danger = base.danger_context
    ragSections.biome = base.biome_context
    ragSections.calendar = getCalendarContext(run.day)
    ragSections.promises = getPromiseContext(state)

    if (_registries.profile) {
      const { getProfileContextForLLM } = _registries.profile
      ragSections.profile = getProfileContextForLLM(_registries.profileData)
    }
    if (_registries.decisions) {
      const { getPatternForLLM } = _registries.decisions
      ragSections.patterns = getPatternForLLM(_registries.decisionData)
    }
    if (_registries.narrative) {
      const { getNarrativeContextForLLM } = _registries.narrative
      ragSections.active_arc = getNarrativeContextForLLM(_registries.narrativeData)
    }
    if (_registries.session) {
      const { getSessionContextForLLM } = _registries.session
      ragSections.session = getSessionContextForLLM(_registries.sessionData)
    }
    if (_registries.relationship) {
      const { getRelationshipContextForLLM } = _registries.relationship
      ragSections.relationship = getRelationshipContextForLLM(_registries.relationshipData)
    }
    if (_registries.difficulty) {
      ragSections.danger = getDifficultyContextForLLM(
        _registries.difficultyData, run.life_essence
      ) + ' ' + (base.danger_context || '')
    }

    ragSections.bestiole = `Bestiole bond: ${state.bestiole?.bond ?? 50}/100`

    base.rag_context = buildRAGContext(ragSections)
  }

  return base
}

export function buildGMContext(state, card) {
  const base = buildNarratorContext(state)
  return {
    ...base,
    card_title: card.title,
    card_text: card.text,
    label_0: card.choices?.[0]?.label ?? '',
    label_1: card.choices?.[1]?.label ?? '',
    label_2: card.choices?.[2]?.label ?? '',
  }
}

function _getNarrativePhase(cardsPlayed) {
  if (cardsPlayed < 5) return 'Phase: Mise en place. '
  if (cardsPlayed < 15) return 'Phase: Montee dramatique. '
  if (cardsPlayed < 25) return 'Phase: Climax. '
  return 'Phase: Resolution. '
}

function _getDangerContext(run) {
  const dangers = []
  const f = run.factions ?? {}
  const hostiles = FACTIONS.filter(k => (f[k] ?? 50) <= 20)
  if (hostiles.length >= 2) {
    dangers.push(`[DANGER] ${hostiles.length} factions hostiles: ${hostiles.join(', ')}`)
  } else if (hostiles.length === 1) {
    dangers.push(`[ATTENTION] Faction hostile: ${hostiles[0]}`)
  }
  if (run.life_essence <= 1) dangers.push('[DANGER] Essence de vie critique!')
  if (run.souffle <= 0) dangers.push('[ATTENTION] Souffle epuise.')
  return dangers.length ? dangers.join(' ') + ' ' : ''
}

function _getDangerLevel(run) {
  const f = run.factions ?? {}
  const hostiles = FACTIONS.filter(k => (f[k] ?? 50) <= 20).length
  if (hostiles >= 2) return 3
  if (run.life_essence <= 1) return 2
  if (hostiles >= 1) return 1
  return 0
}

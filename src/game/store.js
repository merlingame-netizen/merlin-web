// M.E.R.L.I.N. — Central State Store
// Redux-like immutable state management — Faction reputation system

import { SOUFFLE_START, SOUFFLE_MAX, LIFE_ESSENCE_START, LIFE_ESSENCE_MAX, FACTIONS, ENDINGS, VICTORIES } from './constants.js'
import { applyEffects } from './effect_engine.js'
import { saveSlot, loadSlot, saveMeta, loadMeta } from './save_system.js'
import { activate, tickCooldowns } from './ogham_system.js'
import { getBondChange } from './bestiole_system.js'
import { unlockNode, computeRunEssences, getActivePerks } from './meta_progression.js'
import { setLanguage } from '../i18n/i18n.js'

const DEFAULT_FACTIONS = Object.fromEntries(FACTIONS.map(f => [f, 50]))

const DEFAULT_STATE = {
  version: '2.0.0',
  phase: 'menu',
  run: {
    factions: { ...DEFAULT_FACTIONS },
    souffle: SOUFFLE_START,
    life_essence: LIFE_ESSENCE_START,
    cards_played: 0,
    day: 1,
    season_index: 0,
    biome_index: 0,
    biome_key: 'broceliande',
    profile: null,
    active_tags: [],
    flags: {},
    gauges: { Vigueur: 50, Esprit: 50, Faveur: 50, Ressources: 50 },
    hidden: { karma: 0, tension: 0 },
    card_queue: [],
    active_promises: [],
    essences: 0,
    current_arc: null,
    current_card: null,
    ending: null,
    decision_history: [],
    event_history: [],
  },
  meta: {
    total_runs: 0,
    best_run_cards: 0,
    oghams_unlocked: ['beith', 'luis', 'quert'],
    faction_rep: {},
    essences: 0,
    essences_by_type: {},
    tree_nodes: [],
    endings_seen: [],
    language: 'fr',
  },
  bestiole: {
    bond: 50,
    active_skills: ['beith', 'luis', 'quert'],
    skill_cooldowns: {},
  },
  flags: {},
}

let _state = structuredClone(DEFAULT_STATE)
const _listeners = new Set()

export function getState() {
  return _state
}

export function subscribe(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

function _emit() {
  for (const fn of _listeners) fn(_state)
}

export function dispatch(action, payload = {}) {
  const prev = _state
  _state = _reduce(structuredClone(_state), action, payload)
  if (_state !== prev) _emit()
}

function _reduce(state, action, payload) {
  switch (action) {
    case 'NEW_RUN': {
      const run = structuredClone(DEFAULT_STATE.run)
      run.souffle = SOUFFLE_START
      run.life_essence = LIFE_ESSENCE_START
      run.factions = { ...DEFAULT_FACTIONS }
      if (payload.biome_key) run.biome_key = payload.biome_key
      if (payload.profile) run.profile = payload.profile
      state.run = run
      state.phase = payload.phase ?? 'game'
      state.meta.total_runs += 1
      return state
    }

    case 'SET_BIOME': {
      state.run.biome_key = payload.biome_key
      return state
    }

    case 'SET_PROFILE': {
      state.run.profile = payload.profile
      return state
    }

    case 'ADVANCE_DAY': {
      state.run.day += 1
      state.run.season_index = Math.floor((state.run.day - 1) / 7)
      return state
    }

    case 'SET_PHASE': {
      state.phase = payload.phase
      return state
    }

    case 'SET_CARD': {
      state.run.current_card = payload.card
      return state
    }

    case 'RESOLVE_CHOICE': {
      const { option_index, effects } = payload
      const result = applyEffects(state, effects, `card_option_${option_index}`)
      state = result.state
      state.run.cards_played += 1

      state.run.decision_history = state.run.decision_history ?? []
      state.run.decision_history.push({
        card: state.run.cards_played,
        option: option_index,
        effects: effects.slice(0, 5),
      })
      if (state.run.decision_history.length > 50) state.run.decision_history.shift()

      state.run.current_card = null

      // Check endings
      const ending = _checkEndings(state)
      if (ending) {
        state.run.ending = ending
        state.phase = 'ending'
        if (state.run.cards_played > state.meta.best_run_cards) {
          state.meta.best_run_cards = state.run.cards_played
        }
        if (ending.id && !state.meta.endings_seen.includes(ending.id)) {
          state.meta.endings_seen = [...state.meta.endings_seen, ending.id]
        }
        const earned = computeRunEssences(state.run)
        for (const [type, amount] of Object.entries(earned)) {
          state.meta.essences_by_type[type] = (state.meta.essences_by_type[type] ?? 0) + amount
        }
        state.meta.essences = Object.values(state.meta.essences_by_type).reduce((a, b) => a + b, 0)
        saveMeta(state.meta)
      }
      return state
    }

    case 'SHIFT_FACTION': {
      const { faction, delta } = payload
      if (state.run.factions[faction] == null) return state
      state.run.factions[faction] = Math.max(0, Math.min(100, state.run.factions[faction] + delta))
      return state
    }

    case 'APPLY_EFFECTS': {
      return applyEffects(state, payload.effects, payload.source || 'SYSTEM').state
    }

    case 'LOAD_SLOT': {
      const loaded = loadSlot(payload.slot)
      if (loaded) {
        _state = { ...DEFAULT_STATE, ...loaded }
        if (_state.run && !_state.run.factions) {
          _state.run.factions = { ...DEFAULT_FACTIONS }
        }
        return _state
      }
      return state
    }

    case 'SAVE_SLOT': {
      saveSlot(payload.slot, state)
      return state
    }

    case 'ACTIVATE_OGHAM': {
      const result = activate(payload.ogham_id, state)
      if (result.success) return result.state
      return state
    }

    case 'TICK_COOLDOWNS': {
      return tickCooldowns(state)
    }

    case 'UPDATE_BOND': {
      const delta = payload.delta ?? getBondChange(payload.option_index ?? 0, payload.card_tags)
      state.bestiole.bond = Math.max(0, Math.min(100, state.bestiole.bond + delta))
      return state
    }

    case 'UNLOCK_TREE_NODE': {
      const result = unlockNode(payload.node_id, state.meta)
      if (result.success) {
        state.meta = result.meta
        saveMeta(state.meta)
      }
      return state
    }

    case 'AWARD_ESSENCES': {
      const earned = computeRunEssences(state.run)
      for (const [type, amount] of Object.entries(earned)) {
        state.meta.essences_by_type[type] = (state.meta.essences_by_type[type] ?? 0) + amount
      }
      state.meta.essences = Object.values(state.meta.essences_by_type).reduce((a, b) => a + b, 0)
      saveMeta(state.meta)
      return state
    }

    case 'RECORD_ENDING': {
      const endingId = payload.ending_id
      if (endingId && !state.meta.endings_seen.includes(endingId)) {
        state.meta.endings_seen = [...state.meta.endings_seen, endingId]
        saveMeta(state.meta)
      }
      return state
    }

    case 'SET_LANGUAGE': {
      const lang = payload.language
      if (setLanguage(lang)) {
        state.meta.language = lang
        saveMeta(state.meta)
      }
      return state
    }

    case 'RESET': {
      return structuredClone(DEFAULT_STATE)
    }

    default:
      return state
  }
}

function _checkEndings(state) {
  const f = state.run.factions

  // Check victories first
  for (const [id, v] of Object.entries(VICTORIES)) {
    if (v.condition(state)) {
      return { type: 'victory', id, title: v.title, text: v.text }
    }
  }

  // Collect hostile factions (rep <= 20)
  const hostiles = FACTIONS.filter(k => (f[k] ?? 50) <= 20)

  // 2+ hostile factions = defeat
  if (hostiles.length >= 2) {
    const key = hostiles.slice(0, 2).sort().join('_') + '_hostile'
    const ending = ENDINGS[key]
    if (ending) {
      return { type: 'defeat', id: key, title: ending.title, text: ending.text }
    }
    return {
      type: 'defeat',
      id: key,
      title: 'L\'Exil',
      text: `Les ${hostiles.join(' et les ')} t'ont banni. Tu erres seul dans les brumes.`,
    }
  }

  // Life essence depleted
  if (state.run.life_essence <= 0) {
    return { type: 'defeat', id: 'life_zero', title: 'La Mort du Druide', text: 'Ton essence vitale s\'est eteinte. Merlin pleure.' }
  }

  return null
}

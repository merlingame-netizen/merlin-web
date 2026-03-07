// M.E.R.L.I.N. — Central State Store (ported from merlin_store.gd)
// Redux-like immutable state management

import { SOUFFLE_START, SOUFFLE_MAX, LIFE_ESSENCE_START, LIFE_ESSENCE_MAX, ENDINGS, VICTORIES } from './constants.js'
import { applyEffects } from './effect_engine.js'
import { saveSlot, loadSlot } from './save_system.js'

const DEFAULT_STATE = {
  version: '1.0.0',
  phase: 'menu', // menu | hub | game | ending
  run: {
    triade: { Corps: 0, Ame: 0, Monde: 0 }, // -1 BAS | 0 EQUILIBRE | 1 HAUT
    souffle: SOUFFLE_START,
    life_essence: LIFE_ESSENCE_START,
    cards_played: 0,
    day: 1,
    season_index: 0,
    biome_index: 0,
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
  },
  meta: {
    total_runs: 0,
    best_run_cards: 0,
    oghams_unlocked: ['beith', 'luis', 'quert'],
    faction_rep: {},
    aspects_alignment: { Corps: 0, Ame: 0, Monde: 0 },
    essences: 0,
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
      state.run = run
      state.phase = 'game'
      state.meta.total_runs += 1
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
      state.run.current_card = null

      // Souffle bonus: all 3 aspects at equilibre
      const t = state.run.triade
      if (t.Corps === 0 && t.Ame === 0 && t.Monde === 0) {
        state.run.souffle = Math.min(state.run.souffle + 1, SOUFFLE_MAX)
      }

      // Check endings
      const ending = _checkEndings(state)
      if (ending) {
        state.run.ending = ending
        state.phase = 'ending'
        if (state.run.cards_played > state.meta.best_run_cards) {
          state.meta.best_run_cards = state.run.cards_played
        }
      }
      return state
    }

    case 'SHIFT_ASPECT': {
      const { aspect, delta } = payload
      const cur = state.run.triade[aspect] ?? 0
      state.run.triade[aspect] = Math.max(-1, Math.min(1, cur + delta))
      return state
    }

    case 'APPLY_EFFECTS': {
      return applyEffects(state, payload.effects, payload.source || 'SYSTEM').state
    }

    case 'LOAD_SLOT': {
      const loaded = loadSlot(payload.slot)
      if (loaded) {
        _state = { ...DEFAULT_STATE, ...loaded }
        return _state
      }
      return state
    }

    case 'SAVE_SLOT': {
      saveSlot(payload.slot, state)
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
  const t = state.run.triade

  // Check victories first
  for (const [id, v] of Object.entries(VICTORIES)) {
    if (v.condition(state)) {
      return { type: 'victory', id, title: v.title, text: v.text }
    }
  }

  // Collect extremes
  const extremes = []
  for (const [aspect, val] of Object.entries(t)) {
    if (val !== 0) extremes.push({ aspect, val })
  }

  // 2+ extremes = ending
  if (extremes.length >= 2) {
    const key = _buildEndingKey(extremes)
    const ending = ENDINGS[key]
    if (ending) {
      return { type: 'defeat', id: key, title: ending.title, text: ending.text }
    }
  }

  // Life essence depleted
  if (state.run.life_essence <= 0) {
    return { type: 'defeat', id: 'life_zero', title: 'La Mort du Druide', text: 'Ton essence vitale s\'est éteinte. Merlin pleure.' }
  }

  return null
}

function _buildEndingKey(extremes) {
  const labels = extremes.slice(0, 2).map(({ aspect, val }) =>
    `${aspect.toLowerCase()}_${val < 0 ? 'bas' : 'haut'}`
  )
  labels.sort()
  return labels.join('+')
}

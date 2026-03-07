// M.E.R.L.I.N. — Effect Engine (ported from merlin_effect_engine.gd)

import { SOUFFLE_MAX, LIFE_ESSENCE_MAX } from './constants.js'

const VALID_CODES = {
  SHIFT_ASPECT: 2,       // SHIFT_ASPECT:Corps:1
  USE_SOUFFLE: 1,        // USE_SOUFFLE:1
  ADD_SOUFFLE: 1,        // ADD_SOUFFLE:2
  DAMAGE_LIFE: 1,        // DAMAGE_LIFE:1
  HEAL_LIFE: 1,          // HEAL_LIFE:1
  ADD_KARMA: 1,          // ADD_KARMA:10
  ADD_TENSION: 1,        // ADD_TENSION:15
  ADD_NARRATIVE_DEBT: 2, // ADD_NARRATIVE_DEBT:trahison:Description
  ADD_GAUGE: 2,          // ADD_GAUGE:Vigueur:10
  REMOVE_GAUGE: 2,       // REMOVE_GAUGE:Esprit:15
  SET_GAUGE: 2,          // SET_GAUGE:Faveur:50
  SET_FLAG: 2,           // SET_FLAG:met_druide:true
  ADD_TAG: 1,            // ADD_TAG:war_brewing
  REMOVE_TAG: 1,         // REMOVE_TAG:peace
  QUEUE_CARD: 1,         // QUEUE_CARD:card_001
  TRIGGER_ARC: 1,        // TRIGGER_ARC:druide_arc
  CREATE_PROMISE: 3,     // CREATE_PROMISE:oath_001:5:Description
  FULFILL_PROMISE: 1,    // FULFILL_PROMISE:oath_001
  BREAK_PROMISE: 1,      // BREAK_PROMISE:oath_001
  MODIFY_BOND: 1,        // MODIFY_BOND:5
  ADD_ESSENCES: 1,       // ADD_ESSENCES:3
  PROGRESS_MISSION: 1,   // PROGRESS_MISSION:1
}

export function applyEffects(state, effects, source = 'SYSTEM') {
  const applied = []
  const rejected = []

  for (const effect of effects) {
    if (typeof effect !== 'string') { rejected.push(effect); continue }
    const parsed = _parse(effect)
    if (!parsed.ok) { rejected.push(effect); continue }
    const ok = _apply(state, parsed)
    if (ok) applied.push(effect)
    else rejected.push(effect)
  }

  return { state, applied, rejected }
}

function _parse(code) {
  const parts = code.split(':')
  if (!parts.length) return { ok: false }
  const name = parts[0]
  if (!(name in VALID_CODES)) return { ok: false, error: `Unknown: ${name}` }
  const expected = VALID_CODES[name]
  const args = parts.slice(1)
  if (args.length !== expected) return { ok: false, error: `Bad args for ${name}` }
  return { ok: true, name, args }
}

function _apply(state, { name, args }) {
  const run = state.run

  switch (name) {
    case 'SHIFT_ASPECT': {
      const aspect = args[0]
      const delta = parseInt(args[1])
      if (!['Corps', 'Ame', 'Monde'].includes(aspect)) return false
      run.triade[aspect] = Math.max(-1, Math.min(1, (run.triade[aspect] ?? 0) + delta))
      return true
    }
    case 'USE_SOUFFLE': {
      const n = parseInt(args[0])
      if (run.souffle < n) return false
      run.souffle = Math.max(0, run.souffle - n)
      return true
    }
    case 'ADD_SOUFFLE': {
      run.souffle = Math.min(SOUFFLE_MAX, run.souffle + parseInt(args[0]))
      return true
    }
    case 'DAMAGE_LIFE': {
      run.life_essence = Math.max(0, run.life_essence - Math.abs(parseInt(args[0])))
      return true
    }
    case 'HEAL_LIFE': {
      run.life_essence = Math.min(LIFE_ESSENCE_MAX, run.life_essence + Math.abs(parseInt(args[0])))
      return true
    }
    case 'ADD_KARMA': {
      run.hidden.karma = (run.hidden.karma ?? 0) + parseInt(args[0])
      return true
    }
    case 'ADD_TENSION': {
      run.hidden.tension = Math.max(0, Math.min(100, (run.hidden.tension ?? 0) + parseInt(args[0])))
      return true
    }
    case 'ADD_NARRATIVE_DEBT': {
      run.hidden.narrative_debt = run.hidden.narrative_debt ?? []
      run.hidden.narrative_debt.push({ type: args[0], description: args[1], resolved: false })
      return true
    }
    case 'ADD_GAUGE': {
      run.gauges[args[0]] = Math.max(0, Math.min(100, (run.gauges[args[0]] ?? 50) + parseInt(args[1])))
      return true
    }
    case 'REMOVE_GAUGE': {
      run.gauges[args[0]] = Math.max(0, Math.min(100, (run.gauges[args[0]] ?? 50) - Math.abs(parseInt(args[1]))))
      return true
    }
    case 'SET_GAUGE': {
      run.gauges[args[0]] = Math.max(0, Math.min(100, parseInt(args[1])))
      return true
    }
    case 'SET_FLAG': {
      state.flags[args[0]] = args[1] === 'true' || args[1] === '1'
      return true
    }
    case 'ADD_TAG': {
      run.active_tags = run.active_tags ?? []
      if (!run.active_tags.includes(args[0])) run.active_tags.push(args[0])
      return true
    }
    case 'REMOVE_TAG': {
      run.active_tags = (run.active_tags ?? []).filter(t => t !== args[0])
      return true
    }
    case 'QUEUE_CARD': {
      run.card_queue = run.card_queue ?? []
      run.card_queue.push(args[0])
      return true
    }
    case 'TRIGGER_ARC': {
      run.current_arc = args[0]
      return true
    }
    case 'CREATE_PROMISE': {
      run.active_promises = run.active_promises ?? []
      run.active_promises.push({
        id: args[0],
        deadline_days: parseInt(args[1]),
        description: args[2],
        created_day: run.day ?? 1,
        status: 'active',
      })
      return true
    }
    case 'FULFILL_PROMISE': {
      const p = (run.active_promises ?? []).find(p => p.id === args[0])
      if (p) { p.status = 'fulfilled'; return true }
      return false
    }
    case 'BREAK_PROMISE': {
      const p = (run.active_promises ?? []).find(p => p.id === args[0])
      if (p) { p.status = 'broken'; return true }
      return false
    }
    case 'MODIFY_BOND': {
      state.bestiole.bond = Math.max(0, Math.min(100, (state.bestiole.bond ?? 50) + parseInt(args[0])))
      return true
    }
    case 'ADD_ESSENCES': {
      run.essences = (run.essences ?? 0) + parseInt(args[0])
      state.meta.essences = (state.meta.essences ?? 0) + parseInt(args[0])
      return true
    }
    case 'PROGRESS_MISSION': {
      return true // no-op for now
    }
    default:
      return false
  }
}

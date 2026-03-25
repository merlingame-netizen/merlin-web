// M.E.R.L.I.N. — Ogham System
// 18 skills: canUse(), activate(), cooldowns, Souffle cost
// Updated for faction reputation system

import { OGHAMS, SOUFFLE_MAX, LIFE_ESSENCE_MAX, FACTIONS, getFactionLabel } from './constants.js'
import { isOghamUnlocked } from './bestiole_system.js'

const COOLDOWNS = {
  beith: 3, luis: 5, quert: 4,
  fearn: 4, sail: 6, nion: 5,
  huath: 5, dair: 6, tinne: 7,
  coll: 6, muin: 5, gort: 5,
  ngetal: 6, straif: 4, ruis: 8,
  ailm: 10, onn: 10, ur: 15,
}

// Souffle costs adapted for max=1 system
const SOUFFLE_COST = {
  beith: 0, luis: 0, quert: 0,
  fearn: 0, sail: 1, nion: 0,
  huath: 0, dair: 0, tinne: 1,
  coll: 1, muin: 0, gort: 0,
  ngetal: 0, straif: 0, ruis: 1,
  ailm: 1, onn: 1, ur: 1,
}

export function canUse(oghamId, state) {
  const ogham = OGHAMS.find(o => o.id === oghamId)
  if (!ogham) return { usable: false, reason: 'Ogham inconnu' }

  const { bestiole, run } = state
  if (!isOghamUnlocked(ogham, bestiole.bond)) {
    return { usable: false, reason: 'Lien insuffisant' }
  }

  const cd = bestiole.skill_cooldowns?.[oghamId] ?? 0
  if (cd > 0) return { usable: false, reason: `Recharge: ${cd} tours` }

  const cost = SOUFFLE_COST[oghamId] ?? 0
  if (run.souffle < cost) {
    return { usable: false, reason: `Souffle insuffisant (${cost})` }
  }

  return { usable: true, cost }
}

export function activate(oghamId, state) {
  const check = canUse(oghamId, state)
  if (!check.usable) return { state, success: false, reason: check.reason }

  const newState = structuredClone(state)
  const { run, bestiole } = newState

  // Pay Souffle cost
  const cost = SOUFFLE_COST[oghamId] ?? 0
  if (cost > 0) run.souffle = Math.max(0, run.souffle - cost)

  // Set cooldown
  bestiole.skill_cooldowns = bestiole.skill_cooldowns ?? {}
  bestiole.skill_cooldowns[oghamId] = COOLDOWNS[oghamId] ?? 3

  // Apply effect
  const result = _applyOghamEffect(oghamId, newState)

  return { state: newState, success: true, message: result.message }
}

export function tickCooldowns(state) {
  const newState = structuredClone(state)
  const cds = newState.bestiole.skill_cooldowns ?? {}
  for (const key of Object.keys(cds)) {
    if (cds[key] > 0) cds[key]--
    if (cds[key] <= 0) delete cds[key]
  }
  newState.bestiole.skill_cooldowns = cds
  return newState
}

export function getOghamInfo(oghamId) {
  const ogham = OGHAMS.find(o => o.id === oghamId)
  if (!ogham) return null
  return {
    ...ogham,
    cooldown: COOLDOWNS[oghamId] ?? 3,
    cost: SOUFFLE_COST[oghamId] ?? 0,
  }
}

function _findMostHostile(factions) {
  let worst = FACTIONS[0], worstVal = 100
  for (const f of FACTIONS) {
    const val = factions[f] ?? 50
    if (val < worstVal) { worst = f; worstVal = val }
  }
  return { faction: worst, rep: worstVal }
}

function _findMostExtreme(factions) {
  let extreme = FACTIONS[0], extremeDist = 0
  for (const f of FACTIONS) {
    const dist = Math.abs((factions[f] ?? 50) - 50)
    if (dist > extremeDist) { extreme = f; extremeDist = dist }
  }
  return { faction: extreme, rep: factions[extreme] ?? 50 }
}

function _applyOghamEffect(id, state) {
  const { run } = state

  switch (id) {
    case 'beith': {
      // Reveal faction reputations
      const info = FACTIONS.map(f => `${f}: ${getFactionLabel(run.factions[f] ?? 50)} (${run.factions[f] ?? 50})`)
      return { message: `Revelation: ${info.join(', ')}` }
    }
    case 'luis': {
      // Appease most hostile faction (+15)
      const { faction, rep } = _findMostHostile(run.factions)
      if (rep < 50) {
        run.factions[faction] = Math.min(100, rep + 15)
        return { message: `${faction} apaises (+15 reputation)` }
      }
      return { message: 'Aucune faction hostile' }
    }
    case 'quert':
      run.souffle = Math.min(SOUFFLE_MAX, run.souffle + 1)
      return { message: 'Souffle d\'Ogham restaure' }
    case 'fearn': {
      // Rebalance most extreme faction toward 50
      const { faction, rep } = _findMostExtreme(run.factions)
      run.factions[faction] = 50
      return { message: `${faction} reequilibre (→50)` }
    }
    case 'sail':
      run.flags = run.flags ?? {}
      run.flags.immunity_next = true
      return { message: 'Prochains effets annules' }
    case 'nion':
      run.flags = run.flags ?? {}
      run.flags.foresight = 3
      return { message: '3 prochaines cartes revelees' }
    case 'huath':
      run.souffle = Math.min(SOUFFLE_MAX, run.souffle + 1)
      return { message: 'Souffle d\'Ogham restaure' }
    case 'dair':
      run.factions.guerriers = Math.min(100, (run.factions.guerriers ?? 50) + 10)
      return { message: 'Guerriers +10 reputation' }
    case 'tinne':
      run.flags = run.flags ?? {}
      run.flags.immunity_next = true
      return { message: 'Immunite 1 tour' }
    case 'coll':
      run.flags = run.flags ?? {}
      run.flags.double_positive = true
      return { message: 'Effets positifs doubles' }
    case 'muin': {
      // Swap reputation of two factions (most hostile ↔ most allied)
      const hostile = _findMostHostile(run.factions)
      let allied = FACTIONS[0], alliedVal = 0
      for (const f of FACTIONS) {
        if (f !== hostile.faction && (run.factions[f] ?? 50) > alliedVal) {
          allied = f; alliedVal = run.factions[f] ?? 50
        }
      }
      const tmp = run.factions[hostile.faction]
      run.factions[hostile.faction] = run.factions[allied]
      run.factions[allied] = tmp
      return { message: `${hostile.faction} ↔ ${allied} reputation echangee` }
    }
    case 'gort': {
      // Repair most hostile faction
      const { faction, rep } = _findMostHostile(run.factions)
      if (rep <= 30) {
        run.factions[faction] = Math.min(100, rep + 20)
        return { message: `${faction} repare (+20)` }
      }
      return { message: 'Aucune faction a reparer' }
    }
    case 'ngetal':
      run.life_essence = Math.min(LIFE_ESSENCE_MAX, run.life_essence + 1)
      return { message: '+1 Essence de Vie' }
    case 'straif': {
      // Reveal factions in danger
      const hostiles = FACTIONS.filter(f => (run.factions[f] ?? 50) <= 25)
      if (hostiles.length >= 2) return { message: `DANGER: ${hostiles.join(', ')} proches de l'hostilite!` }
      if (hostiles.length === 1) return { message: `ATTENTION: ${hostiles[0]} en danger.` }
      return { message: 'Aucune faction en danger.' }
    }
    case 'ruis':
      // Appease all hostile factions
      for (const f of FACTIONS) {
        if ((run.factions[f] ?? 50) <= 25) {
          run.factions[f] = Math.min(100, (run.factions[f] ?? 50) + 15)
        }
      }
      return { message: 'Toutes factions hostiles apaisees' }
    case 'ailm':
      // All factions to neutral
      for (const f of FACTIONS) run.factions[f] = 50
      return { message: 'Toutes factions → neutre' }
    case 'onn':
      run.life_essence = Math.min(LIFE_ESSENCE_MAX, run.life_essence + 2)
      return { message: '+2 Essence de Vie' }
    case 'ur':
      if (state.run.ending) {
        state.run.ending = null
        state.phase = 'game'
        return { message: 'Fin de partie annulee!' }
      }
      return { message: 'Aucune fin a annuler' }
    default:
      return { message: 'Ogham active' }
  }
}

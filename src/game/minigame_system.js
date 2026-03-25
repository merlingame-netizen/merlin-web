// M.E.R.L.I.N. — Minigame System
// Probabilistic resolution: threshold = 0.5 + bonuses
// 5 types: chance, bluff, observation, logique, finesse
// Updated for faction reputation system

import { BIOME_FACTIONS } from './constants.js'

const MINIGAME_TYPES = {
  chance:      { label: 'Chance',      icon: '🎲', baseThreshold: 0.45 },
  bluff:       { label: 'Bluff',       icon: '🎭', baseThreshold: 0.50 },
  observation: { label: 'Observation', icon: '👁', baseThreshold: 0.55 },
  logique:     { label: 'Logique',     icon: '🧩', baseThreshold: 0.50 },
  finesse:     { label: 'Finesse',     icon: '🎯', baseThreshold: 0.50 },
}

const FACTION_BONUSES = {
  chance:      'korrigans',
  bluff:       'korrigans',
  observation: 'druides',
  logique:     'pretresses',
  finesse:     'guerriers',
}

export function resolveMinigame(type, context = {}) {
  const config = MINIGAME_TYPES[type] ?? MINIGAME_TYPES.chance
  let threshold = config.baseThreshold

  const { factions = {}, souffle = 0, bond = 50, difficulty = 0, souffleBoost = false, biome_key = '' } = context

  if (souffleBoost) threshold -= 0.15

  const bonusFaction = FACTION_BONUSES[type]
  if (bonusFaction && factions[bonusFaction] != null) {
    const rep = factions[bonusFaction]
    if (rep >= 80) threshold -= 0.10
    else if (rep >= 60) threshold -= 0.05
    else if (rep <= 20) threshold += 0.05
  }

  const biomeFactions = BIOME_FACTIONS[biome_key] ?? []
  const hasAllied = biomeFactions.some(f => (factions[f] ?? 50) >= 70)
  if (hasAllied) threshold -= 0.03

  threshold -= (bond - 50) * 0.001
  threshold += difficulty * 0.05
  threshold = Math.max(0.15, Math.min(0.85, threshold))

  // d20 roll: 1-20
  const d20 = Math.floor(Math.random() * 20) + 1
  const dc = Math.max(2, Math.min(19, Math.round(threshold * 20)))
  const success = d20 >= dc
  const critical = d20 === 20
  const fumble = d20 === 1

  return { success, critical, fumble, roll: d20, threshold: dc, type, config }
}

export function getMinigameInfo(type) {
  return MINIGAME_TYPES[type] ?? MINIGAME_TYPES.chance
}

export { MINIGAME_TYPES }

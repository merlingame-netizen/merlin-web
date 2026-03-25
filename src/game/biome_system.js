// M.E.R.L.I.N. — Biome System (ported from merlin_biome_system.gd)

import { BIOME_DATA, BIOME_LIST } from '../data/biomes.js'

export function getBiome(key) {
  return BIOME_DATA[key] ?? BIOME_DATA.broceliande
}

export function isUnlocked(biomeKey, meta) {
  const biome = BIOME_DATA[biomeKey]
  if (!biome) return false
  if (!biome.unlock) return true
  const { runs_min = 0, endings_min = 0 } = biome.unlock
  return (meta.total_runs >= runs_min) &&
         ((meta.endings_seen?.length ?? 0) >= endings_min)
}

export function getUnlockedBiomes(meta) {
  return BIOME_LIST.filter(b => isUnlocked(b.key, meta))
}

export function getContextForLLM(biomeKey) {
  const b = getBiome(biomeKey)
  return `Biome: ${b.name}. Theme: ${b.theme}. Atmosphere: ${b.atmosphere}. Creatures: ${b.creatures.join(', ')}.`
}

export function getSeasonBonus(biomeKey, season) {
  const b = getBiome(biomeKey)
  return b.season_affinity === season
}

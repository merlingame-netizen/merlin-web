// M.E.R.L.I.N. — Bestiole System
// Bond 0-100, needs (faim/énergie/humeur), Ogham unlock by tier

const BOND_TIERS = [
  { tier: 'starter', minBond: 0 },
  { tier: 'unlock1', minBond: 20 },
  { tier: 'unlock2', minBond: 35 },
  { tier: 'unlock3', minBond: 50 },
  { tier: 'unlock4', minBond: 70 },
  { tier: 'unlock5', minBond: 90 },
]

export function getUnlockedTiers(bond) {
  return BOND_TIERS.filter(t => bond >= t.minBond).map(t => t.tier)
}

export function isOghamUnlocked(ogham, bond) {
  const tiers = getUnlockedTiers(bond)
  return tiers.includes(ogham.tier)
}

export function getAvailableOghams(oghams, bond) {
  return oghams.filter(o => isOghamUnlocked(o, bond))
}

export function computeMood(bond) {
  if (bond >= 80) return { label: 'Radieuse', emoji: '✨', bonus: 0.1 }
  if (bond >= 50) return { label: 'Contente', emoji: '😊', bonus: 0.05 }
  if (bond >= 25) return { label: 'Neutre',   emoji: '😐', bonus: 0 }
  return { label: 'Triste', emoji: '😢', bonus: -0.05 }
}

export function getBondChange(optionIndex, cardTags = []) {
  // Positive choices (left/prudent) increase bond slightly
  // Center choices (mystical) have neutral effect
  // Right choices (audacious) can decrease if risky
  const baseChange = optionIndex === 0 ? 2 : optionIndex === 1 ? 1 : -1
  const tagBonus = cardTags.includes('nature') || cardTags.includes('creature') ? 2 : 0
  return baseChange + tagBonus
}

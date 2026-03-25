// M.E.R.L.I.N. — Event Categories (6 weighted types)
// Ported from merlin_card_system.gd event distribution

export const EVENT_CATEGORIES = [
  { id: 'rencontre',   weight: 30, hint: 'Une rencontre inattendue.' },
  { id: 'dilemme',     weight: 20, hint: 'Un choix moral se présente.' },
  { id: 'danger',      weight: 18, hint: 'Le danger guette.' },
  { id: 'decouverte',  weight: 12, hint: 'Tu découvres quelque chose.' },
  { id: 'merveille',   weight: 12, hint: 'Un événement merveilleux.' },
  { id: 'catastrophe', weight: 8,  hint: 'Une catastrophe menace.' },
]

const TOTAL_WEIGHT = EVENT_CATEGORIES.reduce((s, c) => s + c.weight, 0)

export function selectCategory(recentHistory = [], pityCounter = 0) {
  const weights = EVENT_CATEGORIES.map(c => {
    let w = c.weight

    // Anti-repeat: reduce weight if category appeared in last 5 cards
    const recentCount = recentHistory.filter(h => h === c.id).length
    if (recentCount > 0) w *= Math.max(0.2, 1 - recentCount * 0.3)

    // Pity system: boost rare categories after long drought
    if (pityCounter > 5 && (c.id === 'merveille' || c.id === 'decouverte')) {
      w *= 1.5
    }
    if (pityCounter > 8 && c.id === 'catastrophe') {
      w *= 2.0
    }

    return { ...c, adjustedWeight: w }
  })

  const totalAdjusted = weights.reduce((s, c) => s + c.adjustedWeight, 0)
  let roll = Math.random() * totalAdjusted
  for (const cat of weights) {
    roll -= cat.adjustedWeight
    if (roll <= 0) return cat
  }
  return weights[weights.length - 1]
}

// M.E.R.L.I.N. — Dynamic Difficulty Adapter
// Tension tracking, fail-streak mercy, catastrophe blocking

export function createDifficultyState() {
  return {
    tension: 0,
    fail_streak: 0,
    recent_damage: 0,
    cards_since_rest: 0,
  }
}

export function updateDifficulty(diff, event) {
  const updated = { ...diff, cards_since_rest: diff.cards_since_rest + 1 }

  if (event.type === 'damage') {
    updated.recent_damage += event.amount ?? 1
    updated.fail_streak += 1
    updated.tension = Math.min(100, updated.tension + 10)
  } else if (event.type === 'heal' || event.type === 'rest') {
    updated.fail_streak = 0
    updated.recent_damage = Math.max(0, updated.recent_damage - 1)
    updated.tension = Math.max(0, updated.tension - 15)
    updated.cards_since_rest = 0
  } else if (event.type === 'choice') {
    updated.tension = Math.min(100, updated.tension + 2)
  }

  return updated
}

export function shouldBlockCatastrophe(diff, lifeEssence) {
  // Block catastrophes when player is struggling
  if (lifeEssence <= 15) return true
  if (diff.fail_streak >= 3) return true
  if (diff.tension >= 80 && diff.recent_damage >= 3) return true
  return false
}

export function getMercyBonus(diff) {
  // Give mercy bonuses after fail streaks
  if (diff.fail_streak >= 4) return { souffle_bonus: 1, heal_bonus: 2 }
  if (diff.fail_streak >= 2) return { souffle_bonus: 0, heal_bonus: 1 }
  return { souffle_bonus: 0, heal_bonus: 0 }
}

export function getDifficultyContextForLLM(diff, lifeEssence) {
  const parts = []

  if (shouldBlockCatastrophe(diff, lifeEssence)) {
    parts.push('DANGER: vie basse ou serie d\'echecs — EVITER catastrophes, proposer recuperation')
  } else if (diff.tension >= 60) {
    parts.push('Tension elevee — moment dramatique, consequences lourdes possibles')
  } else if (diff.tension <= 20 && diff.cards_since_rest > 8) {
    parts.push('Calme prolonge — introduire conflit ou defi')
  }

  if (diff.fail_streak >= 3) {
    parts.push(`Serie d'echecs (${diff.fail_streak}) — offrir un repit`)
  }

  return parts.join(' | ')
}

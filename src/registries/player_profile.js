// M.E.R.L.I.N. — Player Profile Registry
// 6 psycho axes, EMA learning rate, LLM context generation

const AXES = ['audace', 'prudence', 'altruisme', 'egoisme', 'exploration', 'conservation']
const EMA_ALPHA = 0.15 // exponential moving average learning rate

const AXIS_SIGNALS = {
  audace:       { option_bias: 2, tags: ['danger', 'combat', 'risque', 'defi'] },
  prudence:     { option_bias: 0, tags: ['prudemment', 'attendre', 'observer', 'refuge'] },
  altruisme:    { option_bias: 1, tags: ['aide', 'partage', 'sacrifice', 'compassion'] },
  egoisme:      { option_bias: 2, tags: ['profit', 'egoiste', 'voler', 'abandonner'] },
  exploration:  { option_bias: 2, tags: ['explorer', 'inconnu', 'aventure', 'chercher'] },
  conservation: { option_bias: 0, tags: ['rester', 'garder', 'proteger', 'conserver'] },
}

export function createProfile() {
  const scores = {}
  for (const axis of AXES) scores[axis] = 0.5
  return { scores, samples: 0 }
}

export function updateProfile(profile, optionIndex, cardText, choiceLabel) {
  const updated = { ...profile, scores: { ...profile.scores }, samples: profile.samples + 1 }
  const text = `${cardText} ${choiceLabel}`.toLowerCase()

  for (const axis of AXES) {
    const signals = AXIS_SIGNALS[axis]
    let signal = 0

    // Option position bias (left=0 prudent, center=1 balanced, right=2 bold)
    if (optionIndex === signals.option_bias) signal += 0.3

    // Tag matching from card/choice text
    for (const tag of signals.tags) {
      if (text.includes(tag)) signal += 0.2
    }

    // EMA update
    const clamped = Math.min(1, signal)
    updated.scores[axis] = updated.scores[axis] * (1 - EMA_ALPHA) + clamped * EMA_ALPHA
  }

  return updated
}

export function getDominantTraits(profile, topN = 3) {
  return Object.entries(profile.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .filter(([, v]) => v > 0.55)
    .map(([k]) => k)
}

export function getProfileContextForLLM(profile) {
  const dominant = getDominantTraits(profile)
  if (dominant.length === 0) return ''
  return `Profil joueur: ${dominant.join(', ')} (${profile.samples} decisions)`
}

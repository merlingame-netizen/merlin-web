// M.E.R.L.I.N. — Groq API Client (calls /api/llm serverless route)

const API_URL = '/api/llm'

// Fallback card pool when LLM is unavailable
const FALLBACK_CARDS = [
  {
    title: 'Le Carrefour des Vents',
    text: 'Trois chemins s\'ouvrent devant toi dans la brume de Brocéliande. Merlin attend, ses yeux brillant d\'une lumière ancienne.',
    choices: [
      { label: 'Prendre le chemin de gauche', preview: 'Vers la forêt obscure...' },
      { label: 'Consulter les Oghams gravés', preview: 'Coûte 1 Souffle, révèle les secrets' },
      { label: 'Avancer tout droit', preview: 'La voie directe a ses dangers' },
    ],
  },
  {
    title: 'L\'Appel du Corbeau',
    text: 'Un corbeau noir comme la nuit se pose sur ton épaule et croasse trois fois. Son regard transperce ton âme.',
    choices: [
      { label: 'Écouter le message du corbeau', preview: 'L\'Âme s\'éveille...' },
      { label: 'Offrir nourriture en échange', preview: 'Coûte 1 Souffle, crée un lien' },
      { label: 'Chasser l\'oiseau de mauvais augure', preview: 'Ignore l\'avertissement' },
    ],
  },
  {
    title: 'La Pierre Druidique',
    text: 'Une pierre gravée d\'Oghams anciens pulse d\'une énergie mystérieuse. Le sol tremble légèrement sous tes pieds.',
    choices: [
      { label: 'Déchiffrer les inscriptions', preview: 'Connaissance acquise...' },
      { label: 'Poser les deux mains et fusionner', preview: 'Coûte 1 Souffle, transformation' },
      { label: 'Passer son chemin prudemment', preview: 'La prudence est sagesse' },
    ],
  },
  {
    title: 'Le Festin des Guerriers',
    text: 'Un clan celte festoie sous les étoiles. Ils t\'invitent à partager leur repas. La mead coule abondamment.',
    choices: [
      { label: 'Rejoindre le festin', preview: 'Corps renforcé, liens tissés' },
      { label: 'Chanter un poème bardique', preview: 'Coûte 1 Souffle, gagne leur respect' },
      { label: 'Observer depuis l\'ombre', preview: 'Tu gardes tes distances' },
    ],
  },
  {
    title: 'La Rivière des Âmes',
    text: 'La rivière murmure des noms oubliés. Des ombres glissent sous la surface argentée. Quelque chose t\'attend.',
    choices: [
      { label: 'Traverser à gué', preview: 'Épreuve physique...' },
      { label: 'Parler aux ombres', preview: 'Coûte 1 Souffle, révélations' },
      { label: 'Longer la berge', preview: 'Chemin plus long mais sûr' },
    ],
  },
]

let _fallbackIndex = 0

export async function generateCard(gameContext) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'narrator', context: gameContext }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.parsed && _isValidCard(data.parsed)) return data.parsed
    throw new Error('Invalid card format')
  } catch (err) {
    console.warn('[Groq narrator] fallback:', err.message)
    return _getFallbackCard()
  }
}

export async function generateEffects(card, gameContext) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'gm',
        context: {
          ...gameContext,
          card_text: card.text,
          choices: card.choices,
        },
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.parsed) return _normalizeEffects(data.parsed)
    throw new Error('Invalid effects format')
  } catch (err) {
    console.warn('[Groq GM] fallback effects:', err.message)
    return _getFallbackEffects(card, gameContext)
  }
}

function _isValidCard(c) {
  return typeof c.title === 'string' &&
         typeof c.text === 'string' &&
         Array.isArray(c.choices) &&
         c.choices.length === 3
}

function _normalizeEffects(raw) {
  return {
    effects_0: Array.isArray(raw.effects_0) ? raw.effects_0 : [],
    effects_1: Array.isArray(raw.effects_1) ? raw.effects_1 : [],
    effects_2: Array.isArray(raw.effects_2) ? raw.effects_2 : [],
  }
}

function _getFallbackCard() {
  const card = FALLBACK_CARDS[_fallbackIndex % FALLBACK_CARDS.length]
  _fallbackIndex++
  return structuredClone(card)
}

function _getFallbackEffects(card, ctx) {
  const { triade = {} } = ctx
  // Generate contextual fallback effects based on current Triade
  const effects = { effects_0: [], effects_1: [], effects_2: [] }

  // Option 0 (left) — mild Corps effect
  if (triade.Corps === -1)       effects.effects_0 = ['HEAL_LIFE:1', 'ADD_TENSION:5']
  else if (triade.Corps === 1)   effects.effects_0 = ['DAMAGE_LIFE:1', 'ADD_KARMA:5']
  else                           effects.effects_0 = ['SHIFT_ASPECT:Corps:1', 'ADD_TENSION:5']

  // Option 1 (center) — Souffle cost, powerful
  effects.effects_1 = ['USE_SOUFFLE:1', 'SHIFT_ASPECT:Ame:1', 'ADD_KARMA:10']

  // Option 2 (right) — Monde effect
  if (triade.Monde === -1)       effects.effects_2 = ['SHIFT_ASPECT:Monde:1', 'MODIFY_BOND:5']
  else if (triade.Monde === 1)   effects.effects_2 = ['SHIFT_ASPECT:Monde:-1', 'ADD_TENSION:10']
  else                           effects.effects_2 = ['ADD_SOUFFLE:1', 'ADD_TENSION:5']

  return effects
}

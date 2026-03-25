// M.E.R.L.I.N. — Minigame Registry
// 15 minigames with keyword detection from narrative text

const MINIGAMES = [
  { id: 'defi_force',     type: 'chance',      keywords: ['combat', 'force', 'frapper', 'guerrier', 'lutter'], label: 'Défi de Force' },
  { id: 'defi_endurance', type: 'finesse',     keywords: ['endurance', 'résister', 'tenir', 'courir', 'épreuve'], label: 'Épreuve d\'Endurance' },
  { id: 'enigme_druide',  type: 'logique',     keywords: ['énigme', 'devinette', 'mystère', 'secret', 'indice'], label: 'Énigme Druidique' },
  { id: 'negociation',    type: 'bluff',       keywords: ['marchander', 'négocier', 'troquer', 'convaincre', 'persuader'], label: 'Négociation' },
  { id: 'furtivite',      type: 'finesse',     keywords: ['furtif', 'discret', 'cacher', 'infiltrer', 'ombre'], label: 'Furtivité' },
  { id: 'divination',     type: 'observation', keywords: ['divination', 'vision', 'prédir', 'oracle', 'augure'], label: 'Divination' },
  { id: 'chasse',         type: 'chance',      keywords: ['chasse', 'piste', 'traque', 'proie', 'loup'], label: 'Chasse' },
  { id: 'rituel',         type: 'logique',     keywords: ['rituel', 'incantation', 'invocation', 'sort', 'magie'], label: 'Rituel Sacré' },
  { id: 'duel_verbal',    type: 'bluff',       keywords: ['duel', 'défi', 'verbal', 'joute', 'rhétorique'], label: 'Duel Verbal' },
  { id: 'traversee',      type: 'chance',      keywords: ['traverser', 'pont', 'rivière', 'gué', 'torrent'], label: 'Traversée Périlleuse' },
  { id: 'observation',    type: 'observation', keywords: ['observer', 'guetter', 'surveiller', 'repérer', 'trace'], label: 'Observation Fine' },
  { id: 'cueillette',     type: 'finesse',     keywords: ['cueillir', 'herbe', 'plante', 'gui', 'baie'], label: 'Cueillette Druidique' },
  { id: 'escalade',       type: 'chance',      keywords: ['escalader', 'grimper', 'falaise', 'montagne', 'sommet'], label: 'Escalade' },
  { id: 'decryptage',     type: 'logique',     keywords: ['déchiffrer', 'ogham', 'inscription', 'graver', 'lire'], label: 'Décryptage d\'Oghams' },
  { id: 'seduction',      type: 'bluff',       keywords: ['charmer', 'séduire', 'attirer', 'fasciner', 'envoûter'], label: 'Art de la Séduction' },
]

export function detectMinigame(cardText, cardChoices = []) {
  const text = (cardText + ' ' + cardChoices.map(c => c.label).join(' ')).toLowerCase()

  let bestMatch = null
  let bestScore = 0

  for (const mg of MINIGAMES) {
    const matches = mg.keywords.filter(kw => text.includes(kw)).length
    if (matches > bestScore) {
      bestScore = matches
      bestMatch = mg
    }
  }

  // Only trigger if at least 1 keyword matches
  return bestScore >= 1 ? bestMatch : null
}

export function getMinigame(id) {
  return MINIGAMES.find(m => m.id === id) ?? null
}

export function getAllMinigames() {
  return [...MINIGAMES]
}

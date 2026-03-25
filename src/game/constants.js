// M.E.R.L.I.N. — Game Constants
// Faction reputation system (replaces Triade) + single Souffle

// ── Factions ──────────────────────────────────────────────────────────────────

export const FACTIONS = ['druides', 'korrigans', 'marins', 'guerriers', 'pretresses', 'anciens']

export const FACTION_INFO = {
  druides: {
    label: 'Druides',
    symbol: '🌿',
    color: '#22C55E',
    desc: 'Gardiens du savoir ancien, protecteurs des nemeton',
    hostile: 'Les druides te tournent le dos. Les arbres refusent de te parler.',
    allied: 'Les druides te reconnaissent comme l\'un des leurs. La foret s\'ouvre a toi.',
  },
  korrigans: {
    label: 'Korrigans',
    symbol: '🍄',
    color: '#A855F7',
    desc: 'Peuple feerique, esprits du chaos et de la malice',
    hostile: 'Les korrigans te jouent des tours cruels. Mefie-toi des sentiers.',
    allied: 'Les korrigans rient avec toi. Leurs tresors sont a ta portee.',
  },
  marins: {
    label: 'Marins',
    symbol: '🌊',
    color: '#3B82F6',
    desc: 'Navigateurs des mers celtiques, lies aux esprits des profondeurs',
    hostile: 'Les marins refusent de t\'embarquer. Les vagues te repoussent.',
    allied: 'Les marins te saluent comme un frere. L\'ocean te porte.',
  },
  guerriers: {
    label: 'Guerriers',
    symbol: '⚔️',
    color: '#FF6B35',
    desc: 'Clans des hautes terres, gardiens des cols et des frontieres',
    hostile: 'Les guerriers te barrent la route. Ta faiblesse les degoute.',
    allied: 'Les guerriers te respectent. Ton courage forge des alliances.',
  },
  pretresses: {
    label: 'Pretresses',
    symbol: '🔮',
    color: '#EC4899',
    desc: 'Prophetesses de l\'Ile de Sein, maitresses de la magie pure',
    hostile: 'Les pretresses detournent le regard. Tes choix les ont offensees.',
    allied: 'Les pretresses partagent leurs visions. Le voile se leve pour toi.',
  },
  anciens: {
    label: 'Anciens',
    symbol: '🗿',
    color: '#94A3B8',
    desc: 'Esprits des megalithes, neutres et immemoriaux',
    hostile: 'Les pierres se taisent. Les anciens ont oublie ton nom.',
    allied: 'Les menhirs chantent a ton passage. Les anciens veillent sur toi.',
  },
}

// Which factions are dominant per biome
export const BIOME_FACTIONS = {
  broceliande: ['druides', 'korrigans', 'anciens'],
  landes:      ['korrigans', 'guerriers', 'anciens'],
  cotes:       ['marins', 'guerriers', 'anciens'],
  monts:       ['guerriers', 'druides', 'anciens'],
  ile_sein:    ['pretresses', 'marins', 'anciens'],
  huelgoat:    ['druides', 'korrigans', 'anciens'],
  ecosse:      ['guerriers', 'marins', 'anciens'],
  iles_mystiques: ['pretresses', 'anciens', 'druides'],
}

// ── Faction Reputation States ─────────────────────────────────────────────────

export function getFactionState(rep) {
  if (rep <= 20) return 'hostile'
  if (rep >= 80) return 'allie'
  return 'neutre'
}

export function getFactionLabel(rep) {
  if (rep <= 20) return 'HOSTILE'
  if (rep <= 40) return 'MEFIANT'
  if (rep >= 80) return 'ALLIE'
  if (rep >= 60) return 'FAVORABLE'
  return 'NEUTRE'
}

// ── Souffle ───────────────────────────────────────────────────────────────────

export const SOUFFLE_MAX = 1
export const SOUFFLE_START = 1

// ── Life Essence ──────────────────────────────────────────────────────────────

export const LIFE_ESSENCE_MAX = 5
export const LIFE_ESSENCE_START = 3

// ── Card Types ────────────────────────────────────────────────────────────────

export const CARD_TYPES = ['narrative', 'event', 'promise', 'merlin_direct']

// ── Endings: faction-based ────────────────────────────────────────────────────

export const ENDINGS = {
  druides_korrigans_hostile: {
    title: 'Le Silence de la Foret',
    text: 'Ni les druides ni les korrigans ne te reconnaissent. La foret se referme, et tu disparais dans l\'oubli.',
  },
  druides_guerriers_hostile: {
    title: 'L\'Exil Total',
    text: 'Rejete par la sagesse et la force, tu erres sans fin dans les landes desolees.',
  },
  marins_pretresses_hostile: {
    title: 'Le Naufrage de l\'Ame',
    text: 'L\'ocean te rejette et les prophetesses t\'ont maudit. Ton voyage s\'acheve dans les abysses.',
  },
  guerriers_pretresses_hostile: {
    title: 'La Guerre des Mondes',
    text: 'Force et magie se retournent contre toi. Tu es broye entre deux puissances.',
  },
  korrigans_anciens_hostile: {
    title: 'L\'Oubli des Pierres',
    text: 'Les fees t\'ont trahi et les megalithes se taisent. Meme les pierres oublient ton passage.',
  },
  anciens_druides_hostile: {
    title: 'La Rupture du Lien',
    text: 'Le lien entre les mondes est brise. Sans les anciens ni les druides, tu n\'es plus rien.',
  },
}

// 3 victories
export const VICTORIES = {
  druide: {
    title: 'L\'Eveil du Druide',
    text: 'Toutes les factions te respectent. Merlin sourit — tu es pret pour les Oghams superieurs.',
    condition: (state) => {
      const f = state.run.factions
      const alliedCount = FACTIONS.filter(k => f[k] >= 70).length
      return alliedCount >= 4 && state.run.cards_played >= 20
    },
  },
  barde: {
    title: 'Le Chant du Barde',
    text: 'Ta diplomatie a uni les factions. Les Oghams chantent ton nom a travers les biomes.',
    condition: (state) => {
      const f = state.run.factions
      const noneHostile = FACTIONS.every(k => f[k] > 30)
      return noneHostile && state.run.cards_played >= 15 && state.run.souffle >= 1
    },
  },
  guerrier: {
    title: 'Le Guerrier de l\'Ombre',
    text: 'Tu as survecu a l\'epreuve, forgeant des alliances par la force et le courage.',
    condition: (state) =>
      state.run.cards_played >= 25 &&
      state.run.life_essence >= LIFE_ESSENCE_MAX,
  },
}

// ── Oghams ────────────────────────────────────────────────────────────────────

export const OGHAMS = [
  { id: 'beith',  name: 'Beith',  symbol: 'ᚁ', desc: 'Revele la reputation des factions',     tier: 'starter' },
  { id: 'luis',   name: 'Luis',   symbol: 'ᚂ', desc: 'Apaise la faction la plus hostile',      tier: 'starter' },
  { id: 'quert',  name: 'Quert',  symbol: 'ᚊ', desc: 'Restaure le Souffle d\'Ogham',           tier: 'starter' },
  { id: 'fearn',  name: 'Fearn',  symbol: 'ᚃ', desc: 'Reequilibre la faction la plus extreme', tier: 'unlock1' },
  { id: 'sail',   name: 'Sail',   symbol: 'ᚄ', desc: 'Annule les effets d\'une carte',         tier: 'unlock1' },
  { id: 'nion',   name: 'Nion',   symbol: 'ᚅ', desc: 'Revele les 3 prochaines cartes',        tier: 'unlock1' },
  { id: 'huath',  name: 'Huath',  symbol: 'ᚆ', desc: 'Restaure le Souffle d\'Ogham',           tier: 'unlock2' },
  { id: 'dair',   name: 'Dair',   symbol: 'ᚇ', desc: 'Gagne +10 avec les Guerriers',          tier: 'unlock2' },
  { id: 'tinne',  name: 'Tinne',  symbol: 'ᚈ', desc: 'Immunite 1 tour',                       tier: 'unlock2' },
  { id: 'coll',   name: 'Coll',   symbol: 'ᚉ', desc: 'Double les effets positifs',             tier: 'unlock3' },
  { id: 'muin',   name: 'Muin',   symbol: 'ᚋ', desc: 'Echange reputation de 2 factions',      tier: 'unlock3' },
  { id: 'gort',   name: 'Gort',   symbol: 'ᚌ', desc: 'Repare la faction la plus hostile',      tier: 'unlock3' },
  { id: 'ngetal', name: 'Ngetal', symbol: 'ᚍ', desc: 'Soigne 1 Essence de Vie',                tier: 'unlock4' },
  { id: 'straif', name: 'Straif', symbol: 'ᚎ', desc: 'Revele les factions en danger',          tier: 'unlock4' },
  { id: 'ruis',   name: 'Ruis',   symbol: 'ᚏ', desc: 'Apaise toutes les factions hostiles',    tier: 'unlock4' },
  { id: 'ailm',   name: 'Ailm',   symbol: 'ᚐ', desc: 'Toutes les factions → neutre',           tier: 'unlock5' },
  { id: 'onn',    name: 'Onn',    symbol: 'ᚑ', desc: 'Ressuscite 2 Essences de Vie',           tier: 'unlock5' },
  { id: 'ur',     name: 'Ur',     symbol: 'ᚒ', desc: 'Annule une fin de partie',               tier: 'unlock5' },
]

export const SEASONS = ['Samhain', 'Imbolc', 'Bealtaine', 'Lughnasadh']

export const BIOMES = [
  'Foret de Broceliande', 'Landes de Carnac', 'Cotes d\'Armorique',
  'Monts d\'Arree', 'Ile de Sein', 'Foret de Huelgoat',
  'Montagnes d\'Ecosse', 'Iles Mystiques',
]

export const PERSONALITY_AXES = ['audace', 'prudence', 'altruisme', 'egoisme']

export const ARCHETYPES = {
  guerrier:  { name: 'Guerrier',  bias: { guerriers: 10 } },
  gardien:   { name: 'Gardien',   bias: { druides: 10 } },
  mystique:  { name: 'Mystique',  bias: { pretresses: 10 } },
  equilibre: { name: 'Equilibre', bias: {} },
}

// M.E.R.L.I.N. — Game Constants (ported from merlin_constants.gd)

export const ASPECTS = ['Corps', 'Ame', 'Monde']

export const ASPECT_STATE = { BAS: -1, EQUILIBRE: 0, HAUT: 1 }

export const ASPECT_INFO = {
  Corps: {
    animal: 'Sanglier',
    symbol: '◈',
    color: '#FF6B35',
    states: {
      [-1]: { label: 'Épuisé',   desc: 'Ton corps cède sous le poids' },
      [0]:  { label: 'Robuste',  desc: 'Force et endurance équilibrées' },
      [1]:  { label: 'Surmené', desc: 'Consumé dans l\'excès de force' },
    },
  },
  Ame: {
    animal: 'Corbeau',
    symbol: '◇',
    color: '#A855F7',
    states: {
      [-1]: { label: 'Perdue',    desc: 'Ton esprit s\'égare dans les brumes' },
      [0]:  { label: 'Centrée',   desc: 'Sagesse et clarté intérieure' },
      [1]:  { label: 'Possédée', desc: 'Les esprits anciens te dévorent' },
    },
  },
  Monde: {
    animal: 'Cerf',
    symbol: '◉',
    color: '#22C55E',
    states: {
      [-1]: { label: 'Exilé',    desc: 'Banni, tu erres seul dans les landes' },
      [0]:  { label: 'Intégré',  desc: 'En harmonie avec le monde' },
      [1]:  { label: 'Tyran',    desc: 'Le pouvoir t\'a corrompu' },
    },
  },
}

export const SOUFFLE_MAX = 7
export const SOUFFLE_START = 3

export const LIFE_ESSENCE_MAX = 5
export const LIFE_ESSENCE_START = 3

export const CARD_TYPES = ['narrative', 'event', 'promise', 'merlin_direct']

// 12 endings: any 2 aspects at extreme simultaneously
export const ENDINGS = {
  'corps_bas+ame_bas':    { title: 'La Désolation',          text: 'Épuisé et l\'âme perdue, tu t\'effondres dans les brumes de Broceliande. Merlin observe, silencieux.' },
  'corps_bas+ame_haut':   { title: 'La Frénésie Brisée',     text: 'Ton esprit possédé a brûlé ton corps jusqu\'à la cendre. Les esprits te réclament.' },
  'corps_bas+monde_bas':  { title: 'L\'Errance',             text: 'Sans force ni place dans le monde, tu disparais dans l\'oubli des âges.' },
  'corps_bas+monde_haut': { title: 'Le Sacrifice',           text: 'Tu as offert ton corps au monde pour asseoir ta tyrannie. Victoire creuse.' },
  'corps_haut+ame_bas':   { title: 'L\'Obsession',           text: 'La force sans âme devient bestialité. Tu t\'es perdu dans la chair.' },
  'corps_haut+ame_haut':  { title: 'La Possession Physique', text: 'Corps et âme dévorés par les forces anciennes. Tu n\'es plus.' },
  'corps_haut+monde_bas': { title: 'Le Conquérant Solitaire',text: 'Tu as tout vaincu, mais tu règnes seul sur des ruines.' },
  'corps_haut+monde_haut':{ title: 'La Tyrannie de Chair',   text: 'La force et le pouvoir corrompent tout. Le monde se retourne contre toi.' },
  'ame_bas+monde_bas':    { title: 'Le Néant',               text: 'Perdu en toi-même et exilé du monde, il ne reste rien.' },
  'ame_bas+monde_haut':   { title: 'Le Tyran Vide',          text: 'Tu règnes sans âme. Ton peuple te craint, mais le vide te consume.' },
  'ame_haut+monde_bas':   { title: 'L\'Exilé Possédé',       text: 'Les esprits te hantent dans ta solitude. Personne ne peut t\'atteindre.' },
  'ame_haut+monde_haut':  { title: 'L\'Apocalypse',          text: 'Possédé et tyran — tu déclenches la fin des temps celtiques.' },
}

// 3 victories
export const VICTORIES = {
  druide: {
    title: 'L\'Éveil du Druide',
    text: 'Corps, Âme et Monde en équilibre parfait. Merlin sourit — tu es prêt pour les Oghams supérieurs.',
    condition: (state) =>
      state.run.triade.Corps === 0 &&
      state.run.triade.Ame === 0 &&
      state.run.triade.Monde === 0 &&
      state.run.souffle >= 5 &&
      state.run.cards_played >= 20,
  },
  barde: {
    title: 'Le Chant du Barde',
    text: 'Tu as traversé l\'épreuve en gardant ton souffle. Les Oghams chantent ton nom.',
    condition: (state) =>
      state.run.souffle >= SOUFFLE_MAX &&
      state.run.cards_played >= 15,
  },
  guerrier: {
    title: 'Le Guerrier de l\'Ombre',
    text: 'Tu as survécu à l\'extrême, frôlé la chute, et tu te relèves. C\'est cela, la vraie force.',
    condition: (state) =>
      state.run.cards_played >= 30 &&
      state.run.life_essence >= LIFE_ESSENCE_MAX,
  },
}

export const OGHAMS = [
  { id: 'beith',  name: 'Beith',  symbol: 'ᚁ', desc: 'Révèle l\'état d\'un aspect caché', tier: 'starter' },
  { id: 'luis',   name: 'Luis',   symbol: 'ᚂ', desc: 'Protège d\'une chute imminente',    tier: 'starter' },
  { id: 'quert',  name: 'Quert',  symbol: 'ᚊ', desc: 'Restaure 1 Souffle',                tier: 'starter' },
  { id: 'fearn',  name: 'Fearn',  symbol: 'ᚃ', desc: 'Équilibre un aspect au choix',      tier: 'unlock1' },
  { id: 'sail',   name: 'Sail',   symbol: 'ᚄ', desc: 'Annule les effets d\'une carte',    tier: 'unlock1' },
  { id: 'nion',   name: 'Nion',   symbol: 'ᚅ', desc: 'Révèle les 3 prochaines cartes',    tier: 'unlock1' },
  { id: 'huath',  name: 'Huath',  symbol: 'ᚆ', desc: 'Ajoute 2 Souffle',                  tier: 'unlock2' },
  { id: 'dair',   name: 'Dair',   symbol: 'ᚇ', desc: 'Force Corps en Robuste',            tier: 'unlock2' },
  { id: 'tinne',  name: 'Tinne',  symbol: 'ᚈ', desc: 'Immunité 1 tour',                   tier: 'unlock2' },
  { id: 'coll',   name: 'Coll',   symbol: 'ᚉ', desc: 'Double les effets positifs',        tier: 'unlock3' },
  { id: 'muin',   name: 'Muin',   symbol: 'ᚋ', desc: 'Inverse Corps et Âme',              tier: 'unlock3' },
  { id: 'gort',   name: 'Gort',   symbol: 'ᚌ', desc: 'Répare l\'exil du Monde',           tier: 'unlock3' },
  { id: 'ngetal', name: 'Ngetal', symbol: 'ᚍ', desc: 'Soigne 1 Essence de Vie',           tier: 'unlock4' },
  { id: 'straif', name: 'Straif', symbol: 'ᚎ', desc: 'Révèle la fin imminente',            tier: 'unlock4' },
  { id: 'ruis',   name: 'Ruis',   symbol: 'ᚏ', desc: 'Transforme une chute en épreuve',   tier: 'unlock4' },
  { id: 'ailm',   name: 'Ailm',   symbol: 'ᚐ', desc: 'Équilibre total (coûte 3 Souffle)', tier: 'unlock5' },
  { id: 'onn',    name: 'Onn',    symbol: 'ᚑ', desc: 'Ressuscite une Essence de Vie',     tier: 'unlock5' },
  { id: 'ur',     name: 'Ur',     symbol: 'ᚒ', desc: 'Annule une fin de partie',          tier: 'unlock5' },
]

export const SEASONS = ['Samhain', 'Imbolc', 'Bealtaine', 'Lughnasadh']

export const BIOMES = ['Forêt de Brocéliande', 'Côtes d\'Armorique', 'Plaines du Carnac', 'Île de Sein', 'Montagnes d\'Écosse']

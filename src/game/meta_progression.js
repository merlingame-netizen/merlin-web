// M.E.R.L.I.N. — Meta-Progression (Arbre de Vie)
// 14 essence types, unlockable tree nodes, cross-run progression
// Updated for faction reputation system

const ESSENCE_TYPES = {
  druides: { label: 'Druides', color: '#22C55E' },
  korrigans: { label: 'Korrigans', color: '#A855F7' },
  marins: { label: 'Marins', color: '#3B82F6' },
  guerriers: { label: 'Guerriers', color: '#FF6B35' },
  pretresses: { label: 'Pretresses', color: '#EC4899' },
  anciens: { label: 'Anciens', color: '#94A3B8' },
  equilibre: { label: 'Equilibre', color: '#ffbe33' },
  courage: { label: 'Courage', color: '#FF4444' },
  sagesse: { label: 'Sagesse', color: '#4488FF' },
  harmonie: { label: 'Harmonie', color: '#44FF88' },
  survie: { label: 'Survie', color: '#888888' },
  lien: { label: 'Lien', color: '#FF88CC' },
  decouverte: { label: 'Decouverte', color: '#88CCFF' },
  sacrifice: { label: 'Sacrifice', color: '#CC4444' },
  promesse: { label: 'Promesse', color: '#CCAA44' },
  victoire: { label: 'Victoire', color: '#FFD700' },
  secret: { label: 'Secret', color: '#8844CC' },
}

const TREE_NODES = [
  // Tier 1
  { id: 'souffle_restore', label: 'Souffle restaure apres 10 cartes', tier: 1, cost: { survie: 2 }, effect: { souffle_restore_interval: 10 } },
  { id: 'life_plus_1', label: '+1 Vie initiale', tier: 1, cost: { guerriers: 2 }, effect: { life_start_bonus: 1 } },
  { id: 'bond_plus_5', label: '+5 Lien initial', tier: 1, cost: { lien: 2 }, effect: { bond_start_bonus: 5 } },

  // Tier 2
  { id: 'biome_landes', label: 'Debloque: Landes de Carnac', tier: 2, cost: { decouverte: 3 }, effect: { unlock_biome: 'landes' }, requires: ['souffle_restore'] },
  { id: 'biome_cotes', label: 'Debloque: Cotes d\'Armorique', tier: 2, cost: { marins: 3 }, effect: { unlock_biome: 'cotes' }, requires: ['life_plus_1'] },
  { id: 'ogham_tier2', label: 'Oghams Tier 2 des le depart', tier: 2, cost: { sagesse: 4 }, effect: { ogham_tier_bonus: 1 }, requires: ['bond_plus_5'] },
  { id: 'minigame_bonus', label: '+5% Mini-jeux', tier: 2, cost: { courage: 3 }, effect: { minigame_bonus: 0.05 } },

  // Tier 3
  { id: 'biome_monts', label: 'Debloque: Monts d\'Arree', tier: 3, cost: { courage: 5 }, effect: { unlock_biome: 'monts' }, requires: ['biome_landes'] },
  { id: 'biome_huelgoat', label: 'Debloque: Foret de Huelgoat', tier: 3, cost: { equilibre: 5 }, effect: { unlock_biome: 'huelgoat' }, requires: ['biome_cotes'] },
  { id: 'faction_diplomacy', label: '+5 reputation initiale toutes factions', tier: 3, cost: { harmonie: 6 }, effect: { faction_start_bonus: 5 }, requires: ['souffle_restore'] },
  { id: 'promise_bonus', label: 'Promesses +50% recompense', tier: 3, cost: { promesse: 5 }, effect: { promise_reward_bonus: 0.5 }, requires: ['ogham_tier2'] },

  // Tier 4
  { id: 'biome_ecosse', label: 'Debloque: Montagnes d\'Ecosse', tier: 4, cost: { sacrifice: 8 }, effect: { unlock_biome: 'ecosse' }, requires: ['biome_monts'] },
  { id: 'biome_iles', label: 'Debloque: Iles Mystiques', tier: 4, cost: { secret: 10 }, effect: { unlock_biome: 'iles_mystiques' }, requires: ['biome_huelgoat'] },
  { id: 'second_chance', label: 'Seconde chance (1 par run)', tier: 4, cost: { victoire: 8 }, effect: { second_chance: 1 }, requires: ['faction_diplomacy'] },
  { id: 'biome_sein', label: 'Debloque: Ile de Sein', tier: 4, cost: { pretresses: 10 }, effect: { unlock_biome: 'ile_sein' }, requires: ['promise_bonus'] },
]

export function getTreeNodes() {
  return TREE_NODES.map(n => ({ ...n }))
}

export function getEssenceTypes() {
  return { ...ESSENCE_TYPES }
}

export function isNodeUnlocked(nodeId, unlockedNodes) {
  return (unlockedNodes ?? []).includes(nodeId)
}

export function canUnlockNode(nodeId, meta) {
  const node = TREE_NODES.find(n => n.id === nodeId)
  if (!node) return { canUnlock: false, reason: 'Noeud inconnu' }

  const unlocked = meta.tree_nodes ?? []
  if (unlocked.includes(nodeId)) return { canUnlock: false, reason: 'Deja debloque' }

  for (const req of (node.requires ?? [])) {
    if (!unlocked.includes(req)) return { canUnlock: false, reason: `Requiert: ${req}` }
  }

  const essences = meta.essences_by_type ?? {}
  for (const [type, amount] of Object.entries(node.cost)) {
    if ((essences[type] ?? 0) < amount) {
      return { canUnlock: false, reason: `Manque ${amount - (essences[type] ?? 0)} ${ESSENCE_TYPES[type]?.label ?? type}` }
    }
  }

  return { canUnlock: true }
}

export function unlockNode(nodeId, meta) {
  const check = canUnlockNode(nodeId, meta)
  if (!check.canUnlock) return { success: false, reason: check.reason, meta }

  const newMeta = structuredClone(meta)
  const node = TREE_NODES.find(n => n.id === nodeId)

  newMeta.essences_by_type = newMeta.essences_by_type ?? {}
  for (const [type, amount] of Object.entries(node.cost)) {
    newMeta.essences_by_type[type] = (newMeta.essences_by_type[type] ?? 0) - amount
  }

  newMeta.tree_nodes = newMeta.tree_nodes ?? []
  newMeta.tree_nodes.push(nodeId)

  return { success: true, meta: newMeta, effect: node.effect }
}

export function getActivePerks(meta) {
  const unlocked = meta.tree_nodes ?? []
  const perks = {}

  for (const nodeId of unlocked) {
    const node = TREE_NODES.find(n => n.id === nodeId)
    if (!node) continue
    for (const [key, val] of Object.entries(node.effect)) {
      if (typeof val === 'number') {
        perks[key] = (perks[key] ?? 0) + val
      } else {
        perks[key] = val
      }
    }
  }

  return perks
}

// Award essences based on run outcome
export function computeRunEssences(run, ending) {
  const earned = {}
  const add = (type, n) => { earned[type] = (earned[type] ?? 0) + n }

  // Base essences from cards played
  add('survie', Math.floor(run.cards_played / 5))

  // Faction-based essences: reward allied factions
  const factions = run.factions ?? {}
  for (const [faction, rep] of Object.entries(factions)) {
    if (rep >= 70) add(faction, 1)
    if (rep >= 90) add(faction, 1)
  }

  // All factions neutral or better = equilibre
  const allNeutral = Object.values(factions).every(r => r >= 40 && r <= 60)
  if (allNeutral) add('equilibre', 2)

  // Souffle mastery (kept it if run ends with souffle)
  if (run.souffle >= 1) add('sagesse', 1)

  // Bond
  if (run.cards_played > 0) add('lien', Math.floor(run.cards_played / 10))

  // Victory bonus
  if (ending?.type === 'victory') {
    add('victoire', 3)
    add('harmonie', 2)
  }

  // Courage for surviving long
  if (run.cards_played >= 20) add('courage', 2)
  if (run.cards_played >= 30) add('courage', 1)

  // Discovery
  add('decouverte', 1)

  // Promises
  const fulfilled = (run.active_promises ?? []).filter(p => p.status === 'fulfilled').length
  if (fulfilled > 0) add('promesse', fulfilled)

  return earned
}

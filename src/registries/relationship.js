// M.E.R.L.I.N. — Relationship Registry
// Trust tiers 0-4, faction reputation, LLM context

const TRUST_TIERS = [
  { min: 0,  label: 'Méfiance' },
  { min: 20, label: 'Neutralité' },
  { min: 40, label: 'Respect' },
  { min: 60, label: 'Confiance' },
  { min: 80, label: 'Alliance' },
]

const FACTIONS = ['druides', 'villageois', 'seigneurs', 'fae', 'creatures']

export function createRelationship() {
  const factions = {}
  for (const f of FACTIONS) factions[f] = 50
  return { merlin_trust: 50, factions }
}

export function updateRelationship(rel, event) {
  const updated = {
    merlin_trust: Math.max(0, Math.min(100, rel.merlin_trust + (event.trust_delta ?? 0))),
    factions: { ...rel.factions },
  }

  if (event.faction && event.rep_delta) {
    const cur = updated.factions[event.faction] ?? 50
    updated.factions[event.faction] = Math.max(0, Math.min(100, cur + event.rep_delta))
  }

  return updated
}

export function getTrustTier(trust) {
  for (let i = TRUST_TIERS.length - 1; i >= 0; i--) {
    if (trust >= TRUST_TIERS[i].min) return { tier: i, label: TRUST_TIERS[i].label }
  }
  return { tier: 0, label: TRUST_TIERS[0].label }
}

export function getRelationshipContextForLLM(rel) {
  const trust = getTrustTier(rel.merlin_trust)
  const notable = Object.entries(rel.factions)
    .filter(([, v]) => v < 30 || v > 70)
    .map(([f, v]) => `${f}:${v > 70 ? 'allie' : 'hostile'}`)

  let ctx = `Confiance Merlin: ${trust.label} (${rel.merlin_trust})`
  if (notable.length > 0) ctx += ` | Factions: ${notable.join(', ')}`
  return ctx
}

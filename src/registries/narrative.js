// M.E.R.L.I.N. — Narrative Registry
// Arc state machine: setup -> rising -> climax -> resolution
// Foreshadowing, tension tracking

const ARC_STATES = ['setup', 'rising', 'climax', 'resolution']

const ARC_TEMPLATES = [
  { id: 'betrayal', name: 'Trahison', trigger_cards: 8, keywords: ['confiance', 'traitre', 'mensonge'] },
  { id: 'quest',    name: 'Quete',    trigger_cards: 6, keywords: ['chercher', 'artefact', 'mission'] },
  { id: 'rival',    name: 'Rival',    trigger_cards: 10, keywords: ['ennemi', 'rival', 'affront'] },
  { id: 'mystery',  name: 'Mystere',  trigger_cards: 7, keywords: ['secret', 'enigme', 'ancien'] },
  { id: 'bond',     name: 'Lien',     trigger_cards: 5, keywords: ['ami', 'lien', 'compagnon', 'bestiole'] },
]

export function createNarrative() {
  return {
    active_arc: null,
    arc_progress: 0,
    completed_arcs: [],
    foreshadowing: [],
  }
}

export function tickNarrative(narrative, cardsPlayed, cardText) {
  const updated = { ...narrative, foreshadowing: [...narrative.foreshadowing] }

  // If no active arc and enough cards played, try to start one
  if (!updated.active_arc && cardsPlayed > 3) {
    const available = ARC_TEMPLATES.filter(a =>
      !updated.completed_arcs.includes(a.id)
    )
    if (available.length > 0 && Math.random() < 0.15) {
      const arc = available[Math.floor(Math.random() * available.length)]
      updated.active_arc = { ...arc, state: 'setup', started_at: cardsPlayed }
      updated.foreshadowing.push(`Arc "${arc.name}" commence`)
    }
  }

  // Progress active arc
  if (updated.active_arc) {
    const arc = { ...updated.active_arc }
    const cardsSince = cardsPlayed - arc.started_at

    if (arc.state === 'setup' && cardsSince >= 2) {
      arc.state = 'rising'
    } else if (arc.state === 'rising' && cardsSince >= arc.trigger_cards * 0.6) {
      arc.state = 'climax'
    } else if (arc.state === 'climax' && cardsSince >= arc.trigger_cards) {
      arc.state = 'resolution'
      updated.completed_arcs = [...updated.completed_arcs, arc.id]
      updated.active_arc = null
      return updated
    }

    updated.active_arc = arc
    updated.arc_progress = cardsSince / arc.trigger_cards
  }

  return updated
}

export function getNarrativeContextForLLM(narrative) {
  if (!narrative.active_arc) return ''
  const arc = narrative.active_arc
  return `Arc actif: "${arc.name}" (phase: ${arc.state}, progression: ${Math.round((narrative.arc_progress ?? 0) * 100)}%)`
}

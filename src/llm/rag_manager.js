// M.E.R.L.I.N. — RAG Manager v2
// Priority-based context budget allocation per brain

const PRIORITY = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
const MAX_BUDGET = 400 // tokens budget for RAG context

const RAG_SECTIONS = [
  { id: 'danger',      priority: PRIORITY.CRITICAL, source: 'state',     maxTokens: 60 },
  { id: 'triade',      priority: PRIORITY.CRITICAL, source: 'state',     maxTokens: 40 },
  { id: 'active_arc',  priority: PRIORITY.HIGH,     source: 'narrative', maxTokens: 50 },
  { id: 'profile',     priority: PRIORITY.HIGH,     source: 'profile',   maxTokens: 40 },
  { id: 'biome',       priority: PRIORITY.HIGH,     source: 'state',     maxTokens: 30 },
  { id: 'calendar',    priority: PRIORITY.MEDIUM,   source: 'calendar',  maxTokens: 30 },
  { id: 'patterns',    priority: PRIORITY.MEDIUM,   source: 'decisions', maxTokens: 30 },
  { id: 'session',     priority: PRIORITY.MEDIUM,   source: 'session',   maxTokens: 30 },
  { id: 'relationship',priority: PRIORITY.MEDIUM,   source: 'rel',       maxTokens: 30 },
  { id: 'promises',    priority: PRIORITY.LOW,       source: 'promises',  maxTokens: 30 },
  { id: 'bestiole',    priority: PRIORITY.LOW,       source: 'state',     maxTokens: 20 },
  { id: 'history',     priority: PRIORITY.LOW,       source: 'decisions', maxTokens: 30 },
]

export function buildRAGContext(sections) {
  // sections = { id: text } map
  const sorted = RAG_SECTIONS
    .filter(s => sections[s.id])
    .sort((a, b) => b.priority - a.priority)

  let budget = MAX_BUDGET
  const included = []

  for (const section of sorted) {
    const text = sections[section.id]
    const estimatedTokens = Math.ceil(text.length / 4)
    const tokens = Math.min(estimatedTokens, section.maxTokens)

    if (budget - tokens >= 0) {
      included.push(text)
      budget -= tokens
    }
  }

  return included.join('\n')
}

export function estimateTokens(text) {
  return Math.ceil((text ?? '').length / 4)
}

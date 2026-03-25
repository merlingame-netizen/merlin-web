// M.E.R.L.I.N. — Decision History Registry
// Last 50 decisions, pattern detection, LLM context

const MAX_HISTORY = 50

export function createHistory() {
  return { decisions: [], patterns: {} }
}

export function recordDecision(history, decision) {
  const updated = {
    decisions: [...history.decisions, decision].slice(-MAX_HISTORY),
    patterns: { ...history.patterns },
  }

  // Detect patterns
  updated.patterns = _detectPatterns(updated.decisions)
  return updated
}

function _detectPatterns(decisions) {
  if (decisions.length < 5) return {}

  const last10 = decisions.slice(-10)
  const optionCounts = [0, 0, 0]
  for (const d of last10) optionCounts[d.option ?? 0]++

  // Detect preference: >60% one option
  let preference = null
  if (optionCounts[0] > 6) preference = 'prudent'
  else if (optionCounts[1] > 6) preference = 'balanced'
  else if (optionCounts[2] > 6) preference = 'bold'

  // Detect streak (same option N times in a row)
  let streak = 1
  for (let i = last10.length - 2; i >= 0; i--) {
    if (last10[i].option === last10[last10.length - 1].option) streak++
    else break
  }

  // Detect variety (unique options in last 10)
  const uniqueOptions = new Set(last10.map(d => d.option)).size

  return {
    preference,
    streak: streak >= 3 ? streak : 0,
    variety: uniqueOptions,
    total: decisions.length,
  }
}

export function getPatternForLLM(history) {
  const p = history.patterns
  if (!p || history.decisions.length < 5) return ''

  const parts = []
  if (p.preference) parts.push(`tendance ${p.preference}`)
  if (p.streak >= 4) parts.push(`repetition (${p.streak}x meme choix)`)
  if (p.variety === 1 && history.decisions.length > 8) parts.push('monotone — varier les situations')
  return parts.length > 0 ? `Patterns: ${parts.join(', ')}` : ''
}

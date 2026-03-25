// M.E.R.L.I.N. — Session Registry
// Timing, fatigue detection, pacing hints for LLM

export function createSession() {
  return {
    started_at: Date.now(),
    cards_this_session: 0,
    last_card_at: Date.now(),
    avg_decision_time: 0,
    fast_decisions: 0,
    slow_decisions: 0,
  }
}

export function recordCardPlayed(session) {
  const now = Date.now()
  const timeSinceLast = (now - session.last_card_at) / 1000

  const updated = {
    ...session,
    cards_this_session: session.cards_this_session + 1,
    last_card_at: now,
  }

  // Update average decision time (EMA)
  if (timeSinceLast > 0 && timeSinceLast < 300) {
    updated.avg_decision_time = session.avg_decision_time * 0.8 + timeSinceLast * 0.2
    if (timeSinceLast < 3) updated.fast_decisions = session.fast_decisions + 1
    if (timeSinceLast > 30) updated.slow_decisions = session.slow_decisions + 1
  }

  return updated
}

export function getSessionDuration(session) {
  return Math.round((Date.now() - session.started_at) / 60000) // minutes
}

export function detectFatigue(session) {
  const duration = getSessionDuration(session)
  const cards = session.cards_this_session

  // Fatigue indicators
  if (duration > 45 && cards > 30) return 'high'
  if (duration > 25 && cards > 20) return 'moderate'
  if (session.fast_decisions > 5) return 'rushing'
  return 'none'
}

export function getSessionContextForLLM(session) {
  const fatigue = detectFatigue(session)
  const duration = getSessionDuration(session)
  const parts = [`Session: ${duration}min, ${session.cards_this_session} cartes`]

  if (fatigue === 'high') parts.push('FATIGUE ELEVEE — proposer repos/sauvegarde')
  else if (fatigue === 'rushing') parts.push('Decisions rapides — ralentir le rythme narratif')
  else if (fatigue === 'moderate') parts.push('Session longue — maintenir engagement')

  return parts.join(' | ')
}

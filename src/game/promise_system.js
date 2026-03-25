// M.E.R.L.I.N. — Promise System (Pactes de Merlin)
// Create, track, fulfill, break promises with deadline and consequences

export function createPromise(state, { id, description, deadline_days }) {
  const newState = structuredClone(state)
  const promise = {
    id,
    description,
    deadline_days,
    created_day: newState.run.day,
    expires_day: newState.run.day + deadline_days,
    status: 'active',
  }
  newState.run.active_promises = newState.run.active_promises ?? []
  newState.run.active_promises.push(promise)
  return newState
}

export function fulfillPromise(state, promiseId) {
  const newState = structuredClone(state)
  const promise = (newState.run.active_promises ?? []).find(p => p.id === promiseId)
  if (!promise || promise.status !== 'active') return newState

  promise.status = 'fulfilled'

  // Reward: +karma, +bond
  newState.run.hidden.karma = (newState.run.hidden.karma ?? 0) + 15
  newState.bestiole.bond = Math.min(100, newState.bestiole.bond + 3)

  return newState
}

export function breakPromise(state, promiseId) {
  const newState = structuredClone(state)
  const promise = (newState.run.active_promises ?? []).find(p => p.id === promiseId)
  if (!promise || promise.status !== 'active') return newState

  promise.status = 'broken'

  // Penalty: -karma, -bond, +tension
  newState.run.hidden.karma = (newState.run.hidden.karma ?? 0) - 20
  newState.bestiole.bond = Math.max(0, newState.bestiole.bond - 5)
  newState.run.hidden.tension = Math.min(100, (newState.run.hidden.tension ?? 0) + 15)

  return newState
}

// Check for expired promises (call each day advance)
export function checkExpiredPromises(state) {
  const newState = structuredClone(state)
  const promises = newState.run.active_promises ?? []
  let changed = false

  for (const p of promises) {
    if (p.status === 'active' && newState.run.day >= p.expires_day) {
      p.status = 'expired'
      // Expired = broken
      newState.run.hidden.karma = (newState.run.hidden.karma ?? 0) - 10
      newState.run.hidden.tension = Math.min(100, (newState.run.hidden.tension ?? 0) + 10)
      changed = true
    }
  }

  return changed ? newState : state
}

export function getActivePromises(state) {
  return (state?.run?.active_promises ?? []).filter(p => p.status === 'active')
}

export function getPromiseContext(state) {
  const active = getActivePromises(state)
  if (active.length === 0) return ''
  return active.map(p =>
    `Promesse "${p.description}" (expire jour ${p.expires_day})`
  ).join('; ')
}

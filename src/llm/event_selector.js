// M.E.R.L.I.N. — Event Selector
// Weighted category selection with pity system and anti-repetition

import { selectCategory } from '../data/event_categories.js'

const HISTORY_WINDOW = 10

let _eventHistory = []
let _pityCounter = 0
let _lastCategories = []

export function selectEventCategory() {
  const recentCats = _lastCategories.slice(-5)
  const cat = selectCategory(recentCats, _pityCounter)

  _lastCategories.push(cat.id)
  if (_lastCategories.length > HISTORY_WINDOW) _lastCategories.shift()

  // Pity: increment if we got a common category, reset on rare
  if (cat.id === 'rencontre' || cat.id === 'dilemme') {
    _pityCounter++
  } else {
    _pityCounter = 0
  }

  return cat
}

export function recordEvent(eventId) {
  _eventHistory.push(eventId)
  if (_eventHistory.length > HISTORY_WINDOW) _eventHistory.shift()
}

export function isRecentlyUsed(eventId) {
  return _eventHistory.includes(eventId)
}

export function getEventHistory() {
  return [..._eventHistory]
}

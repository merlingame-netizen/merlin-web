// M.E.R.L.I.N. — Guardrails
// Validation pipeline: length, FR keywords, forbidden words, repetition check

import { PERSONA } from '../data/merlin_persona.js'

const MIN_TEXT_LENGTH = 30
const MAX_TEXT_LENGTH = 250
const MIN_TITLE_LENGTH = 3
const MAX_TITLE_LENGTH = 60
const REPETITION_WINDOW = 5

let _recentTexts = []

export function validateCard(card) {
  const errors = []

  if (!card || typeof card !== 'object') return { valid: false, errors: ['Not an object'] }

  // Structure check
  if (typeof card.title !== 'string') errors.push('Missing title')
  if (typeof card.text !== 'string') errors.push('Missing text')
  if (!Array.isArray(card.choices) || card.choices.length !== 3) errors.push('Need 3 choices')

  if (errors.length > 0) return { valid: false, errors }

  // Length checks
  if (card.title.length < MIN_TITLE_LENGTH) errors.push('Title too short')
  if (card.title.length > MAX_TITLE_LENGTH) errors.push('Title too long')
  if (card.text.length < MIN_TEXT_LENGTH) errors.push('Text too short')
  if (card.text.length > MAX_TEXT_LENGTH) errors.push('Text too long')

  // French keyword check (at least 2 French markers)
  const frMarkers = ['le ', 'la ', 'les ', 'un ', 'une ', 'des ', 'du ', 'de ', 'et ', 'est ', 'sont ', 'dans ', 'sur ', 'pour ', 'avec ', 'tu ', 'ton ', 'ta ']
  const textLower = (card.title + ' ' + card.text).toLowerCase()
  const frCount = frMarkers.filter(m => textLower.includes(m)).length
  if (frCount < 2) errors.push('Not enough French markers')

  // Forbidden words check (word boundary to avoid false positives like "initiale" matching "ia")
  for (const word of PERSONA.forbidden_words) {
    const escaped = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`\\b${escaped}\\b`).test(textLower)) {
      errors.push(`Forbidden word: ${word}`)
    }
  }

  // Repetition check
  if (_isRepetitive(card.text)) {
    errors.push('Too similar to recent card')
  }

  // Choice labels check
  for (let i = 0; i < 3; i++) {
    const ch = card.choices[i]
    if (!ch || typeof ch.label !== 'string' || ch.label.length < 2) {
      errors.push(`Choice ${i} invalid`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateEffects(effects) {
  if (!effects || typeof effects !== 'object') return { valid: false, errors: ['Not an object'] }

  const errors = []
  for (const key of ['effects_0', 'effects_1', 'effects_2']) {
    if (!Array.isArray(effects[key])) {
      errors.push(`${key} is not an array`)
    }
  }

  // Souffle is now a player-activated boost, not a forced cost on center option

  return { valid: errors.length === 0, errors }
}

export function recordCardText(text) {
  _recentTexts.push(text)
  if (_recentTexts.length > REPETITION_WINDOW) _recentTexts.shift()
}

function _isRepetitive(text) {
  if (_recentTexts.length === 0) return false
  const words = new Set(text.toLowerCase().split(/\s+/))
  for (const prev of _recentTexts) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/))
    const intersection = [...words].filter(w => prevWords.has(w) && w.length > 3)
    const similarity = intersection.length / Math.max(words.size, 1)
    if (similarity > 0.65) return true
  }
  return false
}

export function resetGuardrails() {
  _recentTexts = []
}

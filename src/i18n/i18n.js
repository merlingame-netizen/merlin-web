// M.E.R.L.I.N. — Internationalization (7 languages)
// t('KEY') function, language switching, localStorage persistence

import { TRANSLATIONS } from '../data/translations.js'

let _lang = localStorage.getItem('merlin_lang') ?? 'fr'

export function t(key) {
  const translations = TRANSLATIONS[_lang] ?? TRANSLATIONS.fr
  return translations[key] ?? TRANSLATIONS.fr[key] ?? key
}

export function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return false
  _lang = lang
  localStorage.setItem('merlin_lang', lang)
  return true
}

export function getLanguage() {
  return _lang
}

export function getAvailableLanguages() {
  return Object.keys(TRANSLATIONS).map(code => ({
    code,
    name: TRANSLATIONS[code]._name ?? code,
  }))
}

// Get language directive for LLM prompts
export function getLLMLanguageDirective() {
  const directives = {
    fr: 'Réponds EXCLUSIVEMENT en français.',
    en: 'Respond EXCLUSIVELY in English.',
    es: 'Responde EXCLUSIVAMENTE en español.',
    it: 'Rispondi ESCLUSIVAMENTE in italiano.',
    pt: 'Responda EXCLUSIVAMENTE em português.',
    zh: '请只用中文回答。',
    ja: '日本語のみで回答してください。',
  }
  return directives[_lang] ?? directives.fr
}

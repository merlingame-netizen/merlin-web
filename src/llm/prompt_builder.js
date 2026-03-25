// M.E.R.L.I.N. — Prompt Builder
// Interpolates templates with game context, injects event category hints

import { TEMPLATES, interpolate } from '../data/prompt_templates.js'
import { selectEventCategory } from './event_selector.js'
import { getLLMLanguageDirective } from '../i18n/i18n.js'

export function buildNarratorPrompt(ctx) {
  const category = selectEventCategory()
  const langDirective = getLLMLanguageDirective()
  const enrichedCtx = {
    ...ctx,
    event_category: `Type d'événement: ${category.hint} `,
  }

  // Inject RAG context if available
  const ragContext = ctx.rag_context ? `\n[CONTEXTE]\n${ctx.rag_context}` : ''

  return {
    system: `${langDirective}\n${TEMPLATES.narrator_system}${ragContext}`,
    user: interpolate(TEMPLATES.narrator_user, enrichedCtx),
    category: category.id,
  }
}

export function buildGMPrompt(ctx) {
  return {
    system: TEMPLATES.gm_system,
    user: interpolate(TEMPLATES.gm_user, ctx),
  }
}

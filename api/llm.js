// Vercel Serverless Function — Groq LLM Proxy
// Route: POST /api/llm
// Body: { mode: 'narrator' | 'gm', system?: string, user?: string, context?: {...} }

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const MODELS = {
  narrator:  process.env.GROQ_MODEL_NARRATOR || 'llama-3.3-70b-versatile',
  gm:        process.env.GROQ_MODEL_GM       || 'llama-3.3-70b-versatile',
  scenario:  process.env.GROQ_MODEL_NARRATOR || 'llama-3.3-70b-versatile',
}

const PARAMS = {
  narrator:  { temperature: 0.75, max_tokens: 400, top_p: 0.90 },
  gm:        { temperature: 0.15, max_tokens: 120, top_p: 0.80 },
  scenario:  { temperature: 0.80, max_tokens: 2000, top_p: 0.90 },
}

// Legacy fallback system prompts (used if client doesn't send custom prompts)
const SYSTEM_NARRATOR = `Tu es Merlin l'Enchanteur, druide ancestral. Génère une carte narrative en JSON.
{"title":"...","text":"...","choices":[{"label":"...","preview":"..."},{"label":"...","preview":"..."},{"label":"...","preview":"..."}]}`

const SYSTEM_GM = `Tu es le Maître du Jeu. Génère les effets mécaniques en JSON.
{"effects_0":["EFFECT:arg"],"effects_1":["EFFECT:arg"],"effects_2":["EFFECT:arg"]}`

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' })
  }

  const { mode = 'narrator', system, user, context = {} } = req.body || {}
  if (!['narrator', 'gm', 'scenario'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be narrator, gm, or scenario' })
  }

  // Use client-provided prompts if available, else legacy fallback
  const systemPrompt = system || (mode === 'narrator' ? SYSTEM_NARRATOR : SYSTEM_GM)
  const userPrompt = user || _buildLegacyUserPrompt(mode, context)

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS[mode],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        ...PARAMS[mode],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[Groq error]', err)
      return res.status(502).json({ error: 'Groq API error', detail: err })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      return res.status(200).json({ raw: content, parsed: null })
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json({ parsed, model: MODELS[mode] })
  } catch (err) {
    console.error('[LLM handler error]', err)
    return res.status(500).json({ error: err.message })
  }
}

function _buildLegacyUserPrompt(mode, ctx) {
  const {
    factions = {}, vie = 100, biome = 'Brocéliande',
    confiance_merlin = 'T0', ogham_actif = null,
    tags = [], card_text = '', choices = [],
  } = ctx

  const factionDesc = Object.entries(factions)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')

  if (mode === 'narrator') {
    return `État: Factions=[${factionDesc || 'Druides:50,Guerriers:50,Bardes:50,Marchands:50,Ombres:50'}], Vie=${vie}/100, Biome=${biome}, Confiance=${confiance_merlin}${ogham_actif ? `, Ogham=${ogham_actif}` : ''}. Tags: ${tags.join(', ') || 'aucun'}. Génère une carte.`
  }
  return `Carte: "${card_text}". Choix: ${choices.map((c, i) => `[${i}] ${c.label}`).join(' | ')}. État: Factions=[${factionDesc || 'Druides:50,Guerriers:50,Bardes:50,Marchands:50,Ombres:50'}], Vie=${vie}/100, Confiance=${confiance_merlin}. Génère les effets.`
}

// Vercel Serverless Function — Groq LLM Proxy
// Route: POST /api/llm
// Body: { mode: 'narrator' | 'gm', messages: [...], context: {...} }

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const MODELS = {
  narrator: process.env.GROQ_MODEL_NARRATOR || 'llama-3.3-70b-versatile',
  gm:       process.env.GROQ_MODEL_GM       || 'llama-3.1-8b-instant',
}

const PARAMS = {
  narrator: { temperature: 0.70, max_tokens: 220, top_p: 0.90 },
  gm:       { temperature: 0.15, max_tokens: 120, top_p: 0.80 },
}

// System prompts
const SYSTEM_NARRATOR = `Tu es Merlin le druide — narrateur mystique d'un jeu de cartes celtique.
Tu parles UNIQUEMENT en français. Ton style: poétique, énigmatique, archaïque, avec des métaphores druidiques.
Tu génères une carte narrative avec: un titre court, un texte d'ambiance (2-3 phrases), et 3 choix distincts.
Format JSON STRICT:
{
  "title": "Titre bref et évocateur",
  "text": "Description narrative de la situation (2-3 phrases, style celtique)",
  "choices": [
    {"label": "Option gauche (gratuite)", "preview": "Conséquence probable courte"},
    {"label": "Option centre (coûte 1 Souffle)", "preview": "Conséquence probable courte"},
    {"label": "Option droite (gratuite)", "preview": "Conséquence probable courte"}
  ]
}
Ne génère RIEN d'autre que ce JSON. Pas de markdown. Pas d'explication.`

const SYSTEM_GM = `Tu es le Maître du Jeu d'un jeu de cartes celtique. Tu génères les effets mécaniques d'une carte.
Effets disponibles: SHIFT_ASPECT:Corps:1, SHIFT_ASPECT:Ame:-1, SHIFT_ASPECT:Monde:1,
ADD_SOUFFLE:1, USE_SOUFFLE:1, DAMAGE_LIFE:1, HEAL_LIFE:1, ADD_KARMA:10, ADD_TENSION:15,
ADD_GAUGE:Vigueur:10, REMOVE_GAUGE:Esprit:10, MODIFY_BOND:5, ADD_ESSENCES:2
Aspects: Corps (physique), Ame (spirituel), Monde (social). États: -1=bas, 0=équilibre, +1=haut.
Format JSON STRICT:
{
  "effects_0": ["EFFECT:arg", ...],
  "effects_1": ["EFFECT:arg", ...],
  "effects_2": ["EFFECT:arg", ...]
}
3-4 effets par option max. Option 1 (centre) est plus puissante. Ne génère RIEN d'autre que ce JSON.`

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

  const { mode = 'narrator', context = {} } = req.body || {}
  if (!['narrator', 'gm'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be narrator or gm' })
  }

  const systemPrompt = mode === 'narrator' ? SYSTEM_NARRATOR : SYSTEM_GM
  const userPrompt = _buildUserPrompt(mode, context)

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

function _buildUserPrompt(mode, ctx) {
  const { triade = {}, souffle = 3, day = 1, season = 'Samhain', biome = 'Forêt de Brocéliande',
          tags = [], card_text = '', choices = [] } = ctx

  if (mode === 'narrator') {
    const aspectDesc = Object.entries(triade)
      .map(([k, v]) => `${k}:${v < 0 ? 'BAS' : v > 0 ? 'HAUT' : 'EQUILIBRE'}`)
      .join(', ')
    return `État du joueur: Triade=[${aspectDesc}], Souffle=${souffle}/7, Jour ${day}, Saison ${season}, Biome: ${biome}.
Tags actifs: ${tags.length ? tags.join(', ') : 'aucun'}.
Génère une carte narrative cohérente avec cet état. Si un aspect est au BAS ou HAUT, la carte doit y faire écho.`
  }

  if (mode === 'gm') {
    const aspectDesc = Object.entries(triade)
      .map(([k, v]) => `${k}:${v < 0 ? 'BAS' : v > 0 ? 'HAUT' : 'EQUILIBRE'}`)
      .join(', ')
    return `Carte: "${card_text}"
Choix: ${choices.map((c, i) => `[${i}] ${c.label}`).join(' | ')}
État: Triade=[${aspectDesc}], Souffle=${souffle}/7, Jour ${day}
Génère les effets mécaniques pour chaque option. Équilibre les risques. Option 1 coûte 1 Souffle.`
  }

  return ''
}

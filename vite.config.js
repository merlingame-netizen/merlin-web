import { defineConfig, loadEnv } from 'vite'

// Groq Cloud LLM proxy middleware (dev mirrors prod — no local Ollama)
function groqProxy() {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

  const MODELS = {
    narrator: 'llama-3.3-70b-versatile',
    gm:       'llama-3.3-70b-versatile',
    scenario: 'llama-3.3-70b-versatile',
  }

  const PARAMS = {
    narrator:  { temperature: 0.75, max_tokens: 400, top_p: 0.90 },
    gm:        { temperature: 0.15, max_tokens: 120, top_p: 0.80 },
    scenario:  { temperature: 0.80, max_tokens: 2000, top_p: 0.90 },
  }

  const SYSTEM_NARRATOR = `Tu es Merlin l'Enchanteur. Genere une carte narrative en JSON strict.
{"title":"...","text":"...","choices":[{"label":"...","preview":"..."},{"label":"...","preview":"..."},{"label":"...","preview":"..."}]}`

  const SYSTEM_GM = `Tu es le Maitre du Jeu. Genere les effets mecaniques en JSON strict.
{"effects_0":["EFFECT:arg"],"effects_1":["EFFECT:arg"],"effects_2":["EFFECT:arg"]}`

  return {
    name: 'groq-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'GROQ_API_KEY not configured — create .env file' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let data
        try { data = JSON.parse(body) } catch { data = {} }

        const { mode = 'narrator', system, user } = data
        const systemPrompt = system || (mode === 'gm' ? SYSTEM_GM : SYSTEM_NARRATOR)
        const userPrompt = user || 'Genere une carte.'
        const model = MODELS[mode] || MODELS.narrator
        const params = PARAMS[mode] || PARAMS.narrator

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 25000)

        try {
          const groqRes = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              ...params,
              response_format: { type: 'json_object' },
            }),
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (!groqRes.ok) {
            const err = await groqRes.text()
            console.error('[Groq error]', err)
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Groq API error', detail: err }))
            return
          }

          const groqData = await groqRes.json()
          const content = groqData.choices?.[0]?.message?.content ?? '{}'

          let parsed
          try { parsed = JSON.parse(content) } catch { parsed = null }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ parsed, raw: content, model }))
        } catch (err) {
          clearTimeout(timeout)
          const msg = err.name === 'AbortError' ? 'Groq timeout (25s)' : err.message
          console.error('[LLM proxy error]', msg)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: msg }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env into process.env for server middleware (Vite only exposes to client via import.meta.env)
  const env = loadEnv(mode, '.', ['GROQ_'])
  Object.assign(process.env, env)

  return {
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    port: 5173,
  },
  plugins: [groqProxy()],
  envPrefix: ['VITE_', 'GROQ_'],
  }
})

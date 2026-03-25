// M.E.R.L.I.N. — Talk to Merlin (Menu Chat)
// Simple LLM-powered conversation with Merlin in the menu

import { SFX } from '../audio/sfx_manager.js'

const MERLIN_SYSTEM = `Tu es Merlin l'Enchanteur, druide ancestral de Broceliande. Tu parles en francais medieval poetique mais comprehensible. Tu es sage, enigmatique, parfois espiegle. Tu connais les secrets de la foret, les factions (Druides, Korrigans, Anciens, Niamh, Ankou), et le jeu des Oghams. Reponds en 2-3 phrases maximum. Pas de JSON, juste du texte narratif.`

export class TalkMerlin {
  constructor(onBack) {
    this._onBack = onBack
    this._el = null
    this._messages = []
    this._generating = false
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-merlin-chat'
    this._el.innerHTML = `
      <div class="mc-wrap">
        <div class="mc-header">
          <button class="mc-back" id="mc-back">&larr; Retour</button>
          <span class="mc-title">Merlin l'Enchanteur</span>
        </div>
        <div class="mc-messages" id="mc-messages">
          <div class="mc-msg mc-merlin">Approche, voyageur... Que souhaites-tu savoir ?</div>
        </div>
        <div class="mc-input-row">
          <input type="text" class="mc-input" id="mc-input" placeholder="Parlez a Merlin..." autocomplete="off" />
          <button class="mc-send" id="mc-send">&#10148;</button>
        </div>
      </div>
    `
    container.appendChild(this._el)

    this._el.querySelector('#mc-back')?.addEventListener('click', () => {
      SFX.click()
      this._onBack()
    })

    const input = this._el.querySelector('#mc-input')
    const send = this._el.querySelector('#mc-send')

    const doSend = () => {
      const text = input.value.trim()
      if (!text || this._generating) return
      input.value = ''
      SFX.confirm()
      this._addMessage('user', text)
      this._askMerlin(text)
    }

    send?.addEventListener('click', doSend)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSend() }
    })

    // Focus input
    setTimeout(() => input?.focus(), 100)
  }

  unmount() {
    this._el?.remove()
    this._el = null
    this._messages = []
  }

  render() {}

  _addMessage(role, text) {
    this._messages.push({ role, text })
    const container = this._el?.querySelector('#mc-messages')
    if (!container) return
    const div = document.createElement('div')
    div.className = `mc-msg mc-${role}`
    div.textContent = text
    container.appendChild(div)
    container.scrollTop = container.scrollHeight
  }

  async _askMerlin(userText) {
    this._generating = true
    // Show typing indicator
    const container = this._el?.querySelector('#mc-messages')
    const typing = document.createElement('div')
    typing.className = 'mc-msg mc-merlin mc-typing'
    typing.textContent = '...'
    container?.appendChild(typing)
    container.scrollTop = container.scrollHeight

    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'narrator',
          system: MERLIN_SYSTEM,
          user: userText,
        }),
      })

      typing.remove()

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Extract text (could be in parsed.text or raw)
      let reply = ''
      if (data.parsed?.text) reply = data.parsed.text
      else if (data.parsed?.title) reply = data.parsed.title + (data.parsed.text ? '. ' + data.parsed.text : '')
      else if (data.raw) {
        // Try to extract from raw JSON or use as-is
        try {
          const p = JSON.parse(data.raw)
          reply = p.text || p.response || p.message || data.raw
        } catch {
          reply = data.raw.slice(0, 300)
        }
      }
      else reply = 'Merlin reste silencieux un instant...'

      SFX.cardReveal()
      this._addMessage('merlin', reply)
    } catch (err) {
      typing.remove()
      this._addMessage('merlin', 'Les vents ne portent pas mes paroles en ce moment... Reessaie.')
    }
    this._generating = false
  }
}

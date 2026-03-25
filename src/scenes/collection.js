// M.E.R.L.I.N. — Collection / Grimoire Scene
// Endings seen, lore fragments, run history

import { ENDINGS, VICTORIES } from '../game/constants.js'

export class Collection {
  constructor(onBack) {
    this._onBack = onBack
    this._el = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-ending'
    this._el.style.overflow = 'auto'
    container.appendChild(this._el)
  }

  unmount() {
    this._el?.remove()
    this._el = null
  }

  render(state) {
    if (!this._el) return
    const meta = state.meta
    const seen = meta.endings_seen ?? []

    const allEndings = [
      ...Object.entries(ENDINGS).map(([id, e]) => ({ id, ...e, type: 'defeat' })),
      ...Object.entries(VICTORIES).map(([id, v]) => ({ id, title: v.title, text: v.text, type: 'victory' })),
    ]

    this._el.innerHTML = `
      <div class="panel-title" style="font-size:1.4em;color:var(--amber);margin-bottom:12px;">
        Grimoire
      </div>

      <div style="margin-bottom:16px;font-family:var(--font);color:var(--phosphor-dim);font-size:0.85em;">
        Fins découvertes: ${seen.length} / ${allEndings.length}
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;max-width:600px;width:100%;">
        ${allEndings.map(e => {
          const isSeen = seen.includes(e.id)
          return `
            <div class="panel" style="padding:8px;opacity:${isSeen ? '1' : '0.4'};
              border-color:${e.type === 'victory' ? 'var(--amber)' : 'var(--phosphor-dim)'};">
              <div style="font-family:var(--font);color:${e.type === 'victory' ? 'var(--amber)' : 'var(--phosphor)'};font-size:0.9em;">
                ${isSeen ? e.title : '???'}
              </div>
              <div style="font-family:var(--font);color:var(--phosphor-dim);font-size:0.75em;margin-top:4px;">
                ${isSeen ? e.text.substring(0, 80) + (e.text.length > 80 ? '...' : '') : 'Non découvert'}
              </div>
            </div>`
        }).join('')}
      </div>

      <div style="margin-top:16px;font-family:var(--font);color:var(--phosphor-dim);font-size:0.8em;">
        Aventures: ${meta.total_runs} | Meilleure: ${meta.best_run_cards} cartes
      </div>

      <button class="menu-btn" id="coll-back" style="margin-top:12px;">[ Retour ]</button>
    `

    this._el.querySelector('#coll-back')?.addEventListener('click', () => this._onBack())
  }

  onEnter(state) { this.render(state) }
}

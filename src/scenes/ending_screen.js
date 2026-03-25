// M.E.R.L.I.N. — Ending Screen Scene
// Victory/defeat display, stats recap, navigation buttons

import { SOUFFLE_MAX } from '../game/constants.js'
import { SFX } from '../audio/sfx_manager.js'

export class EndingScreen {
  constructor(onNewRun, onMenu) {
    this._onNewRun = onNewRun
    this._onMenu = onMenu
    this._el = null
    this._typeTimer = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-ending'
    container.appendChild(this._el)
  }

  unmount() {
    if (this._typeTimer) clearInterval(this._typeTimer)
    this._el?.remove()
    this._el = null
  }

  render(state) {
    if (!this._el) return
    const { run } = state
    const ending = run.ending
    if (!ending) return

    const isVictory = ending.type === 'victory'

    this._el.innerHTML = `
      <div class="ending-type ${isVictory ? 'victory' : 'defeat'}">
        ${isVictory ? '— Victoire —' : '— Chute —'}
      </div>
      <div class="ending-title ${isVictory ? 'victory' : 'defeat'}">
        ${ending.title}
      </div>
      <div class="ending-text"></div>
      <div class="ending-stats">
        <span>Cartes jouées: ${run.cards_played}</span>
        <span>Jour ${run.day}</span>
        <span>Souffle: ${run.souffle}/${SOUFFLE_MAX}</span>
      </div>
      <div class="ending-actions">
        <button class="menu-btn" id="end-new-run">[ Nouvelle Aventure ]</button>
        <button class="menu-btn" id="end-menu">[ Menu ]</button>
      </div>
    `

    // Play ending SFX
    if (isVictory) SFX.endingVictory()
    else SFX.endingDefeat()

    // Typewriter for ending text
    const textEl = this._el.querySelector('.ending-text')
    if (textEl) this._typewrite(textEl, ending.text)

    this._el.querySelector('#end-new-run')?.addEventListener('click', () => this._onNewRun())
    this._el.querySelector('#end-menu')?.addEventListener('click', () => this._onMenu())
  }

  onEnter(state) {
    this.render(state)
  }

  _typewrite(el, text, speed = 30) {
    if (this._typeTimer) clearInterval(this._typeTimer)
    el.textContent = ''
    el.classList.add('typing')
    let i = 0
    this._typeTimer = setInterval(() => {
      el.textContent += text[i] ?? ''
      i++
      if (i >= text.length) {
        clearInterval(this._typeTimer)
        this._typeTimer = null
        el.classList.remove('typing')
      }
    }, speed)
  }
}

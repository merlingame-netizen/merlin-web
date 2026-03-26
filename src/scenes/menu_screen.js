// M.E.R.L.I.N. — Menu Screen v3
// Minimal, atmospheric, coherent celtic style
// One primary action + lore quote, overlaid on 3D scene

import { listSlots } from '../game/save_system.js'
import { SFX } from '../audio/sfx_manager.js'

const LORE_QUOTES = [
  '"Les pierres se souviennent de tout." \u2014 Merlin',
  '"Chaque sentier mene a un choix. Chaque choix, a un destin."',
  '"La foret parle a ceux qui savent ecouter."',
  '"Ni la force ni la ruse ne suffisent. Seule la sagesse prevaut."',
  '"Les korrigans rient de ceux qui se croient seuls."',
  '"Le voile entre les mondes est plus fin qu\'un souffle."',
  '"Nul n\'entre en Broceliande sans y laisser une part de soi."',
  '"Les racines des chenes sont les veines du monde."',
]

export class MenuScreen {
  constructor(onNewGame, onContinue, onLoad, onTalkMerlin) {
    this._onNewGame = onNewGame
    this._onContinue = onContinue
    this._onLoad = onLoad
    this._onTalkMerlin = onTalkMerlin
    this._el = null
    this._loreTimer = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-menu scene-menu-3d-overlay'

    const hasSave = listSlots()[0] != null

    this._el.innerHTML = `
      <div class="menu-main">
        <div class="menu-title-group">
          <h1 class="menu-title">M.E.R.L.I.N.</h1>
          <p class="menu-subtitle">Foret de Broceliande</p>
        </div>
        <div class="menu-actions">
          <button class="menu-btn menu-btn-play" id="menu-play">
            ${hasSave ? 'Continuer l\'aventure' : 'Entrer dans la foret'}
          </button>
          ${hasSave ? '<button class="menu-btn menu-btn-secondary" id="menu-new">Nouveau voyage</button>' : ''}
        </div>
        <p class="menu-lore" id="menu-lore"></p>
        <p class="menu-version">v1.0</p>
      </div>
    `
    container.appendChild(this._el)

    // Lore quotes rotation
    const loreEl = this._el.querySelector('#menu-lore')
    if (loreEl) {
      let idx = Math.floor(Math.random() * LORE_QUOTES.length)
      loreEl.textContent = LORE_QUOTES[idx]
      this._loreTimer = setInterval(() => {
        idx = (idx + 1) % LORE_QUOTES.length
        loreEl.style.opacity = '0'
        setTimeout(() => { loreEl.textContent = LORE_QUOTES[idx]; loreEl.style.opacity = '1' }, 500)
      }, 7000)
    }

    // SFX
    this._el.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => SFX.hover())
      btn.addEventListener('pointerdown', () => SFX.click())
    })

    // Play / Continue
    this._el.querySelector('#menu-play')?.addEventListener('click', () => {
      SFX.confirm()
      if (hasSave) this._onContinue()
      else this._onNewGame()
    })

    // New game (only if save exists)
    this._el.querySelector('#menu-new')?.addEventListener('click', () => {
      SFX.confirm()
      this._onNewGame()
    })
  }

  unmount() {
    if (this._loreTimer) clearInterval(this._loreTimer)
    this._el?.remove()
    this._el = null
  }

  render() {}
}

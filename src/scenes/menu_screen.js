// M.E.R.L.I.N. — Menu Screen (Refonte v2)
// Fast, minimal, 2 buttons + Merlin chat

import { listSlots } from '../game/save_system.js'
import { SFX } from '../audio/sfx_manager.js'

export class MenuScreen {
  constructor(onNewGame, onContinue, onLoad, onTalkMerlin) {
    this._onNewGame = onNewGame
    this._onContinue = onContinue
    this._onLoad = onLoad
    this._onTalkMerlin = onTalkMerlin
    this._el = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-menu scene-menu-3d-overlay'

    const hasSave = listSlots()[0] != null

    this._el.innerHTML = `
      <div class="menu-v2">
        <div class="menu-v2-title">M.E.R.L.I.N.</div>
        <div class="menu-v2-sub">Foret de Broceliande</div>
        <div class="menu-v2-btns">
          <button class="mv2-btn mv2-btn-primary" id="mv2-play">
            ${hasSave ? 'Continuer' : 'Nouvelle Partie'}
          </button>
          ${hasSave ? '<button class="mv2-btn" id="mv2-new">Nouvelle Partie</button>' : ''}
          <button class="mv2-btn mv2-btn-merlin" id="mv2-merlin">Parler a Merlin</button>
        </div>
        <div class="menu-v2-lore" id="menu-lore"></div>
        <div class="menu-v2-footer">M.E.R.L.I.N. — Le Jeu des Oghams &bull; v1.0</div>
      </div>
    `
    container.appendChild(this._el)

    // Rotating lore quotes
    const loreQuotes = [
      '"Les pierres se souviennent de tout." — Merlin',
      '"Chaque sentier mene a un choix. Chaque choix, a un destin."',
      '"La foret parle a ceux qui savent ecouter."',
      '"Les Oghams sont les cles du monde ancien."',
      '"Ni la force ni la ruse ne suffisent. Seule la sagesse prevaut."',
      '"Les korrigans rient de ceux qui se croient seuls."',
      '"Le voile entre les mondes est plus fin qu\'un souffle."',
    ]
    const loreEl = this._el.querySelector('#menu-lore')
    if (loreEl) {
      let loreIdx = Math.floor(Math.random() * loreQuotes.length)
      loreEl.textContent = loreQuotes[loreIdx]
      this._loreTimer = setInterval(() => {
        loreIdx = (loreIdx + 1) % loreQuotes.length
        loreEl.style.opacity = '0'
        setTimeout(() => { loreEl.textContent = loreQuotes[loreIdx]; loreEl.style.opacity = '1' }, 500)
      }, 6000)
    }

    // SFX on hover for all buttons
    this._el.querySelectorAll('.mv2-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => SFX.hover())
      btn.addEventListener('pointerdown', () => SFX.click())
    })

    // Play button: continue if save exists, else new game
    this._el.querySelector('#mv2-play')?.addEventListener('click', () => {
      SFX.confirm()
      if (hasSave) this._onContinue()
      else this._onNewGame()
    })

    // New game (only shown if save exists)
    this._el.querySelector('#mv2-new')?.addEventListener('click', () => {
      SFX.confirm()
      this._onNewGame()
    })

    // Talk to Merlin
    this._el.querySelector('#mv2-merlin')?.addEventListener('click', () => {
      SFX.confirm()
      this._onTalkMerlin?.()
    })
  }

  unmount() {
    if (this._loreTimer) clearInterval(this._loreTimer)
    this._el?.remove()
    this._el = null
  }

  render() {}
}

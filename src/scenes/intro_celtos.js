// M.E.R.L.I.N. — IntroCeltOS Scene
// ASCII art boot sequence, auto-advances after 4 seconds

import { SFX } from '../audio/sfx_manager.js'

const BOOT_LINES = [
  '> CeltOS v3.7.2 — Druidic Operating System',
  '> Initialisation des Oghams...',
  '> Chargement: Brocéliande/kernel/merlin.ogham',
  '> Mémoire: 7 Souffles disponibles',
  '> Triade Corps/Âme/Monde... [OK]',
  '> Détection Bestiole...........[OK]',
  '> Connexion aux esprits anciens...',
  '> ████████████████████████████ 100%',
  '',
  '  ╔══════════════════════════════╗',
  '  ║   M . E . R . L . I . N .   ║',
  '  ║   Le Jeu des Oghams          ║',
  '  ╚══════════════════════════════╝',
  '',
  '> Bienvenue, jeune druide.',
]

export class IntroCeltOS {
  constructor(onComplete) {
    this._onComplete = onComplete
    this._el = null
    this._timer = null
    this._lineTimer = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-intro-celtos'
    this._el.innerHTML = `
      <div class="celtos-terminal">
        <div class="celtos-lines"></div>
        <div class="celtos-cursor">_</div>
      </div>
      <button class="skip-btn" id="skip-intro">Passer >></button>
    `
    this._el.querySelector('#skip-intro').addEventListener('click', () => {
      if (this._timer) clearTimeout(this._timer)
      if (this._lineTimer) clearInterval(this._lineTimer)
      this._onComplete()
    })
    container.appendChild(this._el)
  }

  unmount() {
    if (this._timer) clearTimeout(this._timer)
    if (this._lineTimer) clearInterval(this._lineTimer)
    this._el?.remove()
    this._el = null
  }

  render() {}

  onEnter() {
    const linesEl = this._el.querySelector('.celtos-lines')
    let i = 0

    this._lineTimer = setInterval(() => {
      if (i >= BOOT_LINES.length) {
        clearInterval(this._lineTimer)
        SFX.bootComplete()
        this._timer = setTimeout(() => this._onComplete(), 1500)
        return
      }
      const line = document.createElement('div')
      line.className = 'celtos-line'
      line.textContent = BOOT_LINES[i]
      linesEl.appendChild(line)
      linesEl.scrollTop = linesEl.scrollHeight
      SFX.bootBeep()
      i++
    }, 200)
  }
}

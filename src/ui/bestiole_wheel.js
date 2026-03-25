// M.E.R.L.I.N. — Bestiole Ogham Wheel UI
// Radial wheel showing 18 Oghams with activation, cooldowns, tooltips

import { OGHAMS } from '../game/constants.js'
import { getAvailableOghams, computeMood } from '../game/bestiole_system.js'
import { canUse, getOghamInfo } from '../game/ogham_system.js'

export class BestioleWheel {
  constructor(onActivate) {
    this._onActivate = onActivate
    this._el = null
    this._visible = false
  }

  create() {
    this._el = document.createElement('div')
    this._el.className = 'bestiole-wheel hidden'
    this._el.innerHTML = `
      <div class="wheel-backdrop"></div>
      <div class="wheel-container">
        <div class="wheel-center">
          <span class="wheel-bestiole">🦎</span>
          <span class="wheel-mood"></span>
        </div>
        <div class="wheel-ring"></div>
        <button class="wheel-close">✕</button>
      </div>
    `
    document.body.appendChild(this._el)

    this._el.querySelector('.wheel-backdrop').addEventListener('click', () => this.hide())
    this._el.querySelector('.wheel-close').addEventListener('click', () => this.hide())
  }

  show(state) {
    if (!this._el) this.create()
    this._visible = true
    this._el.classList.remove('hidden')
    this._render(state)
  }

  hide() {
    this._visible = false
    this._el?.classList.add('hidden')
  }

  toggle(state) {
    if (this._visible) this.hide()
    else this.show(state)
  }

  isVisible() { return this._visible }

  _render(state) {
    const { bestiole } = state
    const mood = computeMood(bestiole.bond)
    const available = getAvailableOghams(OGHAMS, bestiole.bond)

    // Mood display
    const moodEl = this._el.querySelector('.wheel-mood')
    if (moodEl) moodEl.textContent = `${mood.emoji} ${mood.label} (${bestiole.bond})`

    // Build ring of oghams
    const ring = this._el.querySelector('.wheel-ring')
    ring.innerHTML = ''

    const total = OGHAMS.length
    OGHAMS.forEach((ogham, i) => {
      const angle = (i / total) * 360 - 90
      const radius = 120
      const x = Math.cos(angle * Math.PI / 180) * radius
      const y = Math.sin(angle * Math.PI / 180) * radius

      const isAvailable = available.some(a => a.id === ogham.id)
      const check = canUse(ogham.id, state)
      const info = getOghamInfo(ogham.id)
      const cd = bestiole.skill_cooldowns?.[ogham.id] ?? 0

      const slot = document.createElement('div')
      slot.className = `wheel-slot ${isAvailable ? '' : 'locked'} ${check.usable ? 'usable' : ''}`
      slot.style.transform = `translate(${x}px, ${y}px)`
      slot.innerHTML = `
        <span class="wheel-symbol">${ogham.symbol}</span>
        ${cd > 0 ? `<span class="wheel-cd">${cd}</span>` : ''}
      `
      slot.title = `${ogham.name}: ${ogham.desc}${info ? ` (Coût: ${info.cost} Souffle, CD: ${info.cooldown})` : ''}`

      if (check.usable) {
        slot.addEventListener('click', () => {
          this._onActivate(ogham.id)
          this.hide()
        })
      }

      ring.appendChild(slot)
    })
  }
}

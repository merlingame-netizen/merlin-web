// M.E.R.L.I.N. — Biome Transition Scene
// 5-phase animation: brume -> emergence -> revelation -> sentier -> dissolution

import { getBiome } from '../game/biome_system.js'
import { PixelRenderer } from '../pixel/pixel_renderer.js'
import { generateBackdrop } from '../pixel/biome_backdrops.js'
import { SFX } from '../audio/sfx_manager.js'

const PHASES = [
  { text: 'Les brumes s\'épaississent...', duration: 800 },
  { text: 'Une forme émerge du brouillard...', duration: 800 },
  { text: null, duration: 1200 }, // biome name reveal
  { text: 'Un sentier se dessine devant toi...', duration: 800 },
  { text: null, duration: 600 }, // dissolve
]

export class TransitionBiome {
  constructor(onComplete) {
    this._onComplete = onComplete
    this._el = null
    this._timer = null
    this._biomeKey = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-transition'
    this._el.innerHTML = `
      <div class="transition-overlay">
        <canvas class="transition-pixel-canvas" style="image-rendering:pixelated;width:256px;height:128px;margin-bottom:12px;border:1px solid rgba(51,255,102,0.15);"></canvas>
        <div class="transition-text"></div>
        <div class="transition-biome-name"></div>
        <div class="transition-atmosphere"></div>
      </div>
      <button class="skip-btn" id="skip-transition">Passer >></button>
    `
    this._el.querySelector('#skip-transition').addEventListener('click', () => {
      if (this._timer) clearTimeout(this._timer)
      this._onComplete()
    })
    container.appendChild(this._el)
  }

  unmount() {
    if (this._timer) clearTimeout(this._timer)
    if (this._pixelRenderer) this._pixelRenderer.destroy()
    this._pixelRenderer = null
    this._el?.remove()
    this._el = null
  }

  render() {}

  onEnter(state) {
    this._biomeKey = state.run.biome_key ?? 'broceliande'
    const biome = getBiome(this._biomeKey)
    this._runPhases(biome)
  }

  _runPhases(biome) {
    const textEl = this._el.querySelector('.transition-text')
    const nameEl = this._el.querySelector('.transition-biome-name')
    const atmosEl = this._el.querySelector('.transition-atmosphere')

    this._el.style.background = biome.color
    SFX.transitionWhoosh()

    // Pixel art backdrop
    const pixelCanvas = this._el.querySelector('.transition-pixel-canvas')
    if (pixelCanvas) {
      this._pixelRenderer = new PixelRenderer(pixelCanvas)
      const backdrop = generateBackdrop(this._biomeKey)
      this._pixelRenderer.animateCascade(backdrop.grid, backdrop.palette, 30)
    }

    let i = 0

    const next = () => {
      if (i >= PHASES.length) {
        this._onComplete()
        return
      }
      const phase = PHASES[i]
      if (i === 2) {
        textEl.textContent = ''
        nameEl.textContent = biome.name
        nameEl.classList.add('reveal')
        atmosEl.textContent = biome.atmosphere
        SFX.biomeReveal()
      } else if (phase.text) {
        textEl.textContent = phase.text
        nameEl.textContent = ''
        nameEl.classList.remove('reveal')
        atmosEl.textContent = ''
      } else {
        textEl.textContent = ''
      }
      i++
      this._timer = setTimeout(next, phase.duration)
    }

    next()
  }
}

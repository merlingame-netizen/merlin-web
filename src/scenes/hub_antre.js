// M.E.R.L.I.N. — Hub Antre Scene
// Central hub: biome selection, tools, bestiole info, depart button

import { BIOME_LIST } from '../data/biomes.js'
import { getUnlockedBiomes } from '../game/biome_system.js'
import { computeMood, getAvailableOghams } from '../game/bestiole_system.js'
import { OGHAMS } from '../game/constants.js'

export class HubAntre {
  constructor(onDepart, onSave, onQuit, onTree, onCollection, onBiomeSelect) {
    this._onDepart = onDepart
    this._onSave = onSave
    this._onQuit = onQuit
    this._onTree = onTree
    this._onCollection = onCollection
    this._onBiomeSelect = onBiomeSelect
    this._el = null
    this._selectedBiome = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-hub'
    container.appendChild(this._el)
  }

  unmount() {
    this._el?.remove()
    this._el = null
  }

  render(state) {
    if (!this._el) return
    const meta = state.meta
    const unlocked = getUnlockedBiomes(meta)
    if (!this._selectedBiome && unlocked.length > 0) {
      this._selectedBiome = unlocked[0].key
    }

    const selected = this._selectedBiome
    const bestiole = state.bestiole

    this._el.innerHTML = `
      <div class="hub-header">
        <span class="hub-logo">M.E.R.L.I.N.</span>
        <span class="hub-subtitle">L'Antre du Druide</span>
      </div>

      <div class="hub-content">
        <div class="hub-left panel">
          <div class="panel-title">Biomes</div>
          <div class="biome-grid">
            ${BIOME_LIST.map(b => {
              const isUnlocked = unlocked.some(u => u.key === b.key)
              const isSelected = b.key === selected
              return `
                <div class="biome-card ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}"
                     data-biome="${b.key}" style="border-color:${b.color}">
                  <div class="biome-name">${isUnlocked ? b.name : '???'}</div>
                  <div class="biome-info">${isUnlocked ? `Diff. ${b.difficulty} — ${b.theme}` : 'Verrouillé'}</div>
                </div>`
            }).join('')}
          </div>
        </div>

        <div class="hub-center">
          <div class="hub-bestiole panel">
            <div class="panel-title">Bestiole</div>
            <div class="bestiole-info">
              <span class="bestiole-sprite">🦎</span>
              <span>${computeMood(bestiole.bond).emoji} ${computeMood(bestiole.bond).label}</span>
              <span>Lien: ${bestiole.bond}/100</span>
              <span>Oghams: ${getAvailableOghams(OGHAMS, bestiole.bond).length}/${OGHAMS.length}</span>
            </div>
          </div>

          <div class="hub-stats panel">
            <div class="panel-title">Progression</div>
            <div class="stat-row"><span>Aventures</span><span>${meta.total_runs}</span></div>
            <div class="stat-row"><span>Meilleure</span><span>${meta.best_run_cards} cartes</span></div>
            <div class="stat-row"><span>Essences</span><span>${meta.essences ?? 0}</span></div>
          </div>
        </div>

        <div class="hub-right">
          <button class="menu-btn hub-depart" ${!this._selectedBiome ? 'disabled' : ''}>
            [ Partir en Aventure ]
          </button>
          <button class="menu-btn hub-tree">[ Arbre de Vie ]</button>
          <button class="menu-btn hub-collection">[ Grimoire ]</button>
          <button class="menu-btn hub-save">[ Sauvegarder ]</button>
          <button class="menu-btn hub-quit">[ Menu Principal ]</button>
        </div>
      </div>
    `

    // Biome selection — trigger pre-warm on select
    this._el.querySelectorAll('.biome-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedBiome = card.dataset.biome
        this._onBiomeSelect?.(this._selectedBiome)
        this.render(state)
      })
    })

    // Buttons
    this._el.querySelector('.hub-depart')?.addEventListener('click', () => {
      if (this._selectedBiome) this._onDepart(this._selectedBiome)
    })
    this._el.querySelector('.hub-tree')?.addEventListener('click', () => this._onTree?.())
    this._el.querySelector('.hub-collection')?.addEventListener('click', () => this._onCollection?.())
    this._el.querySelector('.hub-save')?.addEventListener('click', () => this._onSave())
    this._el.querySelector('.hub-quit')?.addEventListener('click', () => this._onQuit())
  }

  onEnter(state) {
    this.render(state)
  }
}

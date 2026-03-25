// M.E.R.L.I.N. — Arbre de Vie Scene
// Tree node UI with unlock, costs, effects

import { getTreeNodes, canUnlockNode, isNodeUnlocked, getEssenceTypes } from '../game/meta_progression.js'
import { SFX } from '../audio/sfx_manager.js'

export class ArbreDeVie {
  constructor(onUnlock, onBack) {
    this._onUnlock = onUnlock
    this._onBack = onBack
    this._el = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-ending' // reuse ending layout
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
    const nodes = getTreeNodes()
    const essenceTypes = getEssenceTypes()
    const essences = meta.essences_by_type ?? {}

    // Group by tier
    const tiers = [1, 2, 3, 4]

    this._el.innerHTML = `
      <div class="panel-title" style="font-size:1.4em;color:var(--amber);margin-bottom:12px;">
        Arbre de Vie
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;font-family:var(--font);font-size:0.75em;color:var(--phosphor-dim);">
        ${Object.entries(essenceTypes).map(([type, info]) =>
          `<span style="color:${info.color}">${info.label}: ${essences[type] ?? 0}</span>`
        ).join(' | ')}
      </div>
      ${tiers.map(tier => `
        <div style="margin-bottom:12px;">
          <div style="font-family:var(--font);color:var(--phosphor-dim);font-size:0.8em;margin-bottom:6px;">
            Tier ${tier}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${nodes.filter(n => n.tier === tier).map(node => {
              const unlocked = isNodeUnlocked(node.id, meta.tree_nodes)
              const check = canUnlockNode(node.id, meta)
              return `
                <div class="panel" style="min-width:160px;max-width:200px;padding:8px;opacity:${unlocked ? '1' : '0.7'};
                  border-color:${unlocked ? 'var(--phosphor)' : check.canUnlock ? 'var(--amber)' : 'var(--phosphor-dim)'};">
                  <div style="font-family:var(--font);color:${unlocked ? 'var(--phosphor)' : 'var(--amber)'};font-size:0.85em;">
                    ${node.label}
                  </div>
                  <div style="font-family:var(--font);color:var(--phosphor-dim);font-size:0.7em;margin-top:4px;">
                    ${unlocked ? '✓ Débloqué' :
                      Object.entries(node.cost).map(([t, a]) =>
                        `${a} ${essenceTypes[t]?.label ?? t}`
                      ).join(', ')}
                  </div>
                  ${!unlocked && check.canUnlock ? `
                    <button class="menu-btn btn-small" data-unlock="${node.id}"
                      style="margin-top:6px;font-size:0.75em;">[ Débloquer ]</button>
                  ` : ''}
                </div>`
            }).join('')}
          </div>
        </div>
      `).join('')}
      <button class="menu-btn" id="tree-back" style="margin-top:12px;">[ Retour ]</button>
    `

    // Wire unlock buttons
    this._el.querySelectorAll('[data-unlock]').forEach(btn => {
      btn.addEventListener('click', () => {
        SFX.oghamActivate()
        this._onUnlock(btn.dataset.unlock)
      })
    })

    this._el.querySelector('#tree-back')?.addEventListener('click', () => this._onBack())
  }

  onEnter(state) { this.render(state) }
}

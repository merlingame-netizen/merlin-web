// M.E.R.L.I.N. — Game UI Controller
// Manages all DOM interactions, renders from store state
// Updated for faction reputation system

import { FACTIONS, FACTION_INFO, SOUFFLE_MAX, LIFE_ESSENCE_MAX, SEASONS, BIOMES } from '../game/constants.js'

export class GameUI {
  constructor() {
    this._onChoiceCallback = null
    this._typewriterTimer = null
  }

  onChoice(fn) { this._onChoiceCallback = fn }

  render(state) {
    const { phase } = state
    this._showPhase(phase)
    if (phase === 'game')   this._renderGame(state)
    if (phase === 'ending') this._renderEnding(state)
  }

  showLoading(show) {
    const el = document.getElementById('loading-overlay')
    if (el) el.classList.toggle('hidden', !show)
  }

  showCardLoading(show) {
    const card = document.getElementById('card-display')
    if (card) card.classList.toggle('loading', show)
    const choices = document.getElementById('choices-area')
    if (choices) choices.style.opacity = show ? '0.3' : '1'
    document.querySelectorAll('.choice-btn').forEach(b => b.disabled = show)

    if (show) {
      const title = document.getElementById('card-title')
      const text  = document.getElementById('card-text')
      if (title) title.textContent = '...'
      if (text)  this._typewrite(text, 'Merlin medite...')
    }
  }

  showSaveScreen(slots, onSelect, onBack) {
    const screen = document.getElementById('save-screen')
    if (!screen) return
    const list = screen.querySelector('.save-slot-list')
    if (!list) return
    list.innerHTML = ''

    slots.forEach((slot, i) => {
      const el = document.createElement('div')
      el.className = `save-slot ${!slot ? 'empty' : ''}`
      if (slot) {
        const date = new Date(slot.timestamp).toLocaleDateString('fr-FR')
        el.innerHTML = `
          <span class="slot-num">[ Emplacement ${i + 1} ]</span>
          <span class="slot-info">Carte ${slot.cards_played} — Jour ${slot.day}<br>
          <span class="slot-date">${date}</span></span>
        `
      } else {
        el.innerHTML = `<span class="slot-num">[ Emplacement ${i + 1} ]</span><span class="slot-info">— Vide —</span>`
      }
      el.addEventListener('click', () => onSelect(i))
      list.appendChild(el)
    })

    const backBtn = screen.querySelector('.save-back-btn')
    if (backBtn) backBtn.onclick = onBack

    screen.classList.remove('hidden')
  }

  hideSaveScreen() {
    document.getElementById('save-screen')?.classList.add('hidden')
  }

  _showPhase(phase) {
    document.getElementById('menu-screen')?.classList.toggle('hidden', phase !== 'menu')
    document.getElementById('ending-screen')?.classList.toggle('hidden', phase !== 'ending')
    document.getElementById('top-bar')?.classList.toggle('hidden', phase === 'menu' || phase === 'ending')
    document.getElementById('main-area')?.classList.toggle('hidden', phase === 'menu' || phase === 'ending')
  }

  _renderGame(state) {
    const { run } = state

    const season = SEASONS[run.season_index % SEASONS.length]
    const biome  = BIOMES[run.biome_index % BIOMES.length]
    const dayEl = document.getElementById('day-info')
    if (dayEl) dayEl.textContent = `Jour ${run.day} — ${season} — ${biome}`

    // Faction reputation bars
    FACTIONS.forEach(faction => {
      const rep = run.factions?.[faction] ?? 50
      const info = FACTION_INFO[faction]

      const blockEl = document.querySelector(`.faction-block[data-faction="${faction}"]`)
      if (!blockEl) return

      const barFill = blockEl.querySelector('.faction-bar-fill')
      if (barFill) {
        barFill.style.width = `${rep}%`
        barFill.style.backgroundColor = info.color
      }

      const repLabel = blockEl.querySelector('.faction-rep')
      if (repLabel) repLabel.textContent = rep
    })

    // Souffle (single orb)
    const souffleContainer = document.querySelector('.souffle-orbs')
    if (souffleContainer) {
      souffleContainer.querySelectorAll('.souffle-orb').forEach((orb, i) => {
        orb.classList.toggle('filled', i < run.souffle)
      })
    }

    // Life essence
    const lifeContainer = document.querySelector('.life-orbs')
    if (lifeContainer) {
      lifeContainer.querySelectorAll('.life-orb').forEach((orb, i) => {
        orb.classList.toggle('filled', i < run.life_essence)
      })
    }

    const cardsEl = document.querySelector('[data-stat="cards"]')
    if (cardsEl) cardsEl.textContent = run.cards_played

    if (run.current_card) {
      this._renderCard(run.current_card, run.souffle)
    }
  }

  _renderCard(card, souffle) {
    const titleEl = document.getElementById('card-title')
    const textEl  = document.getElementById('card-text')
    if (titleEl) titleEl.textContent = card.title
    if (textEl)  this._typewrite(textEl, card.text)

    const choicesArea = document.getElementById('choices-area')
    if (!choicesArea) return
    choicesArea.innerHTML = ''

    ;(card.choices ?? []).forEach((choice, i) => {
      const btn = document.createElement('button')
      btn.className = 'choice-btn'
      btn.disabled = !this._onChoiceCallback
      btn.setAttribute('data-index', ['◁', '▽', '▷'][i])
      btn.innerHTML = `<span class="choice-text">${choice.label}</span>`

      btn.addEventListener('click', () => {
        if (this._onChoiceCallback) this._onChoiceCallback(i)
      })

      choicesArea.appendChild(btn)
    })
  }

  _renderEnding(state) {
    const { run } = state
    const ending = run.ending
    if (!ending) return

    const typeEl = document.querySelector('.ending-type')
    const titleEl = document.querySelector('.ending-title')
    const textEl = document.querySelector('.ending-text')
    const statsEl = document.querySelector('.ending-stats')

    const isVictory = ending.type === 'victory'

    if (typeEl) {
      typeEl.className = `ending-type ${isVictory ? 'victory' : 'defeat'}`
      typeEl.textContent = isVictory ? '— Victoire —' : '— Chute —'
    }
    if (titleEl) {
      titleEl.className = `ending-title ${isVictory ? 'victory' : 'defeat'}`
      titleEl.textContent = ending.title
    }
    if (textEl) {
      this._typewrite(textEl, ending.text)
    }
    if (statsEl) {
      statsEl.innerHTML = `
        <span>Cartes jouees: ${run.cards_played}</span>
        <span>Jour ${run.day}</span>
        <span>Souffle: ${run.souffle}/${SOUFFLE_MAX}</span>
      `
    }
  }

  _typewrite(el, text, speed = 25) {
    if (this._typewriterTimer) clearInterval(this._typewriterTimer)
    el.textContent = ''
    el.classList.add('typing')
    let i = 0
    this._typewriterTimer = setInterval(() => {
      el.textContent += text[i] ?? ''
      i++
      if (i >= text.length) {
        clearInterval(this._typewriterTimer)
        this._typewriterTimer = null
        el.classList.remove('typing')
      }
    }, speed)
  }
}

// ── Build static HTML structure ─────────────────────────────────────────────

export function buildHTML() {
  document.body.innerHTML = `
    <canvas id="canvas-bg"></canvas>

    <div id="loading-overlay">
      <div class="loading-logo">M.E.R.L.I.N.</div>
      <div class="loading-text">Connexion aux Oghams...</div>
    </div>

    <div id="menu-screen" class="hidden">
      <div class="menu-title">
        <h1>M.E.R.L.I.N.</h1>
        <p>Le Jeu des Oghams — Edition Web</p>
      </div>
      <div class="menu-btn-group">
        <button class="menu-btn" id="btn-new-run">[ Nouvelle Aventure ]</button>
        <button class="menu-btn" id="btn-continue">[ Continuer ]</button>
        <button class="menu-btn" id="btn-load">[ Charger ]</button>
      </div>
      <div style="font-size:0.7em;color:var(--phosphor-dim);text-align:center;max-width:300px">
        Propulse par Groq LLaMA 3.3-70b
      </div>
    </div>

    <div id="save-screen" class="hidden" style="position:fixed;inset:0;z-index:55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px;background:rgba(5,12,5,0.95)">
      <div class="panel-title">[ Emplacements de Sauvegarde ]</div>
      <div class="save-slot-list" style="display:flex;flex-direction:column;gap:12px"></div>
      <button class="menu-btn save-back-btn" style="min-width:160px;font-size:0.9em">[ Retour ]</button>
    </div>

    <div id="top-bar" class="hidden">
      <span class="logo">M.E.R.L.I.N.</span>
      <span class="day-info" id="day-info">Jour 1 — Samhain</span>
      <button class="menu-btn" id="btn-save-game" style="min-width:auto;padding:4px 12px;font-size:0.8em">[ Sauvegarder ]</button>
    </div>

    <div id="main-area" class="hidden" style="flex:1;display:flex;gap:12px;padding:12px;overflow:hidden">

      <div id="faction-panel" class="panel">
        <div class="panel-title">Factions</div>

        ${FACTIONS.map(faction => {
          const info = FACTION_INFO[faction]
          return `
          <div class="faction-block" data-faction="${faction}" style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75em">
              <span style="color:${info.color}">${info.symbol} ${info.label}</span>
              <span class="faction-rep" style="color:${info.color}">50</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
              <div class="faction-bar-fill" style="height:100%;width:50%;background:${info.color};transition:width 0.3s"></div>
            </div>
          </div>`
        }).join('')}

        <div id="souffle-block" style="margin-top:auto">
          <div class="souffle-label">◈ Souffle d'Ogham</div>
          <div class="souffle-orbs">
            ${Array.from({length: SOUFFLE_MAX}, (_, i) =>
              `<div class="souffle-orb ${i < 1 ? 'filled' : ''}"></div>`
            ).join('')}
          </div>
        </div>
      </div>

      <div id="card-zone">
        <div id="card-display" class="panel" style="width:100%;max-width:520px;padding:20px 24px">
          <div id="card-title" style="font-size:1.4em;color:var(--amber);text-align:center;margin-bottom:12px">
            Bienvenue, druide...
          </div>
          <div id="card-text" style="color:var(--phosphor);line-height:1.6;min-height:80px">
            Les Oghams t'attendent. Lance une nouvelle aventure pour commencer.
          </div>
        </div>
        <div id="choices-area" style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px">
        </div>
      </div>

      <div id="right-panel" class="panel">
        <div class="panel-title">Essence</div>
        <div>
          <div style="font-size:0.8em;color:var(--phosphor-dim);margin-bottom:6px">Vie</div>
          <div class="life-orbs">
            ${Array.from({length: LIFE_ESSENCE_MAX}, (_, i) =>
              `<div class="life-orb ${i < 3 ? 'filled' : ''}"></div>`
            ).join('')}
          </div>
        </div>

        <div style="margin-top:12px">
          <div class="panel-title">Stats</div>
          <div class="stat-row">
            <span class="stat-key">Cartes</span>
            <span class="stat-val" data-stat="cards">0</span>
          </div>
        </div>

        <div style="margin-top:auto">
          <button class="menu-btn" id="btn-quit" style="min-width:auto;width:100%;padding:6px;font-size:0.8em">
            [ Menu ]
          </button>
        </div>
      </div>
    </div>

    <div id="ending-screen" class="hidden">
      <div class="ending-type victory">— Victoire —</div>
      <div class="ending-title victory">Titre</div>
      <div class="ending-text">Texte...</div>
      <div class="ending-stats"></div>
      <div style="display:flex;gap:12px;margin-top:12px">
        <button class="menu-btn" id="btn-new-run-after">[ Nouvelle Aventure ]</button>
        <button class="menu-btn" id="btn-menu-after">[ Menu ]</button>
      </div>
    </div>

    <div id="app"></div>
  `
}

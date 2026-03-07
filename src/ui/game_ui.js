// M.E.R.L.I.N. — Game UI Controller
// Manages all DOM interactions, renders from store state

import { ASPECTS, ASPECT_INFO, ASPECT_STATE, SOUFFLE_MAX, LIFE_ESSENCE_MAX, SEASONS, BIOMES } from '../game/constants.js'

export class GameUI {
  constructor() {
    this._onChoiceCallback = null
    this._typewriterTimer = null
  }

  // ── Public API ────────────────────────────────────────────────────────────

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
      if (text)  this._typewrite(text, 'Merlin médite...')
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

  // ── Private ───────────────────────────────────────────────────────────────

  _showPhase(phase) {
    const ids = ['menu-screen', 'save-screen', 'ending-screen']
    const gameIds = ['top-bar', 'main-area']

    document.getElementById('menu-screen')?.classList.toggle('hidden', phase !== 'menu')
    document.getElementById('ending-screen')?.classList.toggle('hidden', phase !== 'ending')
    document.getElementById('top-bar')?.classList.toggle('hidden', phase === 'menu' || phase === 'ending')
    document.getElementById('main-area')?.classList.toggle('hidden', phase === 'menu' || phase === 'ending')
  }

  _renderGame(state) {
    const { run } = state

    // Day / season info
    const season = SEASONS[run.season_index % SEASONS.length]
    const biome  = BIOMES[run.biome_index % BIOMES.length]
    const dayEl = document.getElementById('day-info')
    if (dayEl) dayEl.textContent = `Jour ${run.day} — ${season} — ${biome}`

    // Triade aspects
    ASPECTS.forEach(aspect => {
      const val = run.triade[aspect] ?? 0
      const info = ASPECT_INFO[aspect]
      const stateInfo = info.states[val]
      const cls = `aspect-${aspect.toLowerCase()}`

      const blockEl = document.querySelector(`.aspect-block[data-aspect="${aspect}"]`)
      if (!blockEl) return

      blockEl.querySelector('.aspect-state').textContent = stateInfo.label
      blockEl.style.color = info.color

      // Pips: BAS=-1 (left pip), EQUILIBRE=0 (center), HAUT=1 (right pip)
      const pips = blockEl.querySelectorAll('.aspect-pip')
      pips.forEach(p => p.classList.remove('active'))
      if (val === -1) pips[0]?.classList.add('active')
      if (val === 0)  pips[1]?.classList.add('active')
      if (val === 1)  pips[2]?.classList.add('active')
    })

    // Souffle orbs
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

    // Stats
    const cardsEl = document.querySelector('[data-stat="cards"]')
    if (cardsEl) cardsEl.textContent = run.cards_played

    // Current card
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
      const isCenter = i === 1
      const cost = isCenter ? 1 : 0
      const canAfford = souffle >= cost

      const btn = document.createElement('button')
      btn.className = `choice-btn ${isCenter ? 'center-choice' : ''}`
      btn.disabled = !canAfford || !this._onChoiceCallback
      btn.setAttribute('data-index', ['◁', '▽', '▷'][i])

      const costLabel = cost > 0 ? `<span class="choice-cost">⟨ ${cost} Souffle ⟩</span>` : ''
      btn.innerHTML = `<span class="choice-text">${choice.label}${costLabel}</span>`

      if (choice.preview) {
        btn.title = choice.preview
      }

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
        <span>Cartes jouées: ${run.cards_played}</span>
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

    <!-- Loading overlay -->
    <div id="loading-overlay">
      <div class="loading-logo">M.E.R.L.I.N.</div>
      <div class="loading-text">Connexion aux Oghams...</div>
    </div>

    <!-- Menu screen -->
    <div id="menu-screen" class="hidden">
      <div class="menu-title">
        <h1>M.E.R.L.I.N.</h1>
        <p>Le Jeu des Oghams — Édition Web</p>
      </div>
      <div class="menu-btn-group">
        <button class="menu-btn" id="btn-new-run">[ Nouvelle Aventure ]</button>
        <button class="menu-btn" id="btn-continue">[ Continuer ]</button>
        <button class="menu-btn" id="btn-load">[ Charger ]</button>
      </div>
      <div style="font-size:0.7em;color:var(--phosphor-dim);text-align:center;max-width:300px">
        Propulsé par Groq LLaMA 3.3-70b · Hébergé sur Vercel
      </div>
    </div>

    <!-- Save screen -->
    <div id="save-screen" class="hidden" style="position:fixed;inset:0;z-index:55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px;background:rgba(5,12,5,0.95)">
      <div class="panel-title">[ Emplacements de Sauvegarde ]</div>
      <div class="save-slot-list" style="display:flex;flex-direction:column;gap:12px"></div>
      <button class="menu-btn save-back-btn" style="min-width:160px;font-size:0.9em">[ Retour ]</button>
    </div>

    <!-- Game top bar -->
    <div id="top-bar" class="hidden">
      <span class="logo">M.E.R.L.I.N.</span>
      <span class="day-info" id="day-info">Jour 1 — Samhain</span>
      <button class="menu-btn" id="btn-save-game" style="min-width:auto;padding:4px 12px;font-size:0.8em">[ Sauvegarder ]</button>
    </div>

    <!-- Main game area -->
    <div id="main-area" class="hidden" style="flex:1;display:flex;gap:12px;padding:12px;overflow:hidden">

      <!-- Triade left panel -->
      <div id="triade-panel" class="panel">
        <div class="panel-title">Triade</div>

        ${ASPECTS.map(aspect => {
          const info = ASPECT_INFO[aspect]
          return `
          <div class="aspect-block" data-aspect="${aspect}" style="color:${info.color}">
            <div class="aspect-label">${aspect}</div>
            <div class="aspect-symbol">${info.symbol}</div>
            <div class="aspect-state">${info.states[0].label}</div>
            <div class="aspect-bar">
              <div class="aspect-pip"></div>
              <div class="aspect-pip active"></div>
              <div class="aspect-pip"></div>
            </div>
          </div>`
        }).join('')}

        <div id="souffle-block" style="margin-top:auto">
          <div class="souffle-label">◈ Souffle d'Ogham</div>
          <div class="souffle-orbs">
            ${Array.from({length: SOUFFLE_MAX}, (_, i) =>
              `<div class="souffle-orb ${i < 3 ? 'filled' : ''}"></div>`
            ).join('')}
          </div>
        </div>
      </div>

      <!-- Card center zone -->
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
          <!-- Choices injected dynamically -->
        </div>
      </div>

      <!-- Right panel -->
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

    <!-- Ending screen -->
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

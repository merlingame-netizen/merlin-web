// M.E.R.L.I.N. — Game Scene
// Main gameplay: card display, choices, faction panel, souffle, life essence
// Extracted from game_ui.js to work as a scene module

import { FACTIONS, FACTION_INFO, SOUFFLE_MAX, LIFE_ESSENCE_MAX, SEASONS } from '../game/constants.js'
import { getBiome } from '../game/biome_system.js'
import { Voicebox } from '../audio/voicebox.js'

export class GameScene {
  constructor(onChoice, onSave, onQuit, onBestioleToggle) {
    this._onChoice = onChoice
    this._onSave = onSave
    this._onQuit = onQuit
    this._onBestioleToggle = onBestioleToggle
    this._el = null
    this._typewriterTimer = null
    this._voicebox = new Voicebox('merlin')
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-game'
    this._el.innerHTML = `
      <div class="game-top-bar">
        <span class="logo">M.E.R.L.I.N.</span>
        <span class="day-info" id="s-day-info">Jour 1</span>
        <button class="btn-bestiole" id="s-btn-bestiole">🦎 Oghams</button>
        <button class="menu-btn btn-small" id="s-btn-save">[ Sauvegarder ]</button>
      </div>

      <div class="game-main">
        <div class="game-factions panel">
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

          <div class="souffle-block">
            <div class="souffle-label">Souffle d'Ogham</div>
            <div class="souffle-orbs">
              ${Array.from({ length: SOUFFLE_MAX }, () =>
                '<div class="souffle-orb"></div>'
              ).join('')}
            </div>
          </div>
        </div>

        <div class="game-card-zone">
          <div class="panel game-card">
            <div class="card-title" id="s-card-title">...</div>
            <div class="card-text" id="s-card-text"></div>
          </div>
          <div class="game-choices" id="s-choices"></div>
        </div>

        <div class="game-right panel">
          <div class="panel-title">Essence</div>
          <div>
            <div class="sub-label">Vie</div>
            <div class="life-orbs">
              ${Array.from({ length: LIFE_ESSENCE_MAX }, () =>
                '<div class="life-orb"></div>'
              ).join('')}
            </div>
          </div>
          <div class="stats-block">
            <div class="panel-title">Stats</div>
            <div class="stat-row"><span>Cartes</span><span id="s-stat-cards">0</span></div>
          </div>
          <button class="menu-btn btn-small" id="s-btn-quit">[ Menu ]</button>
        </div>
      </div>
    `
    container.appendChild(this._el)

    this._el.querySelector('#s-btn-save')?.addEventListener('click', () => this._onSave())
    this._el.querySelector('#s-btn-quit')?.addEventListener('click', () => this._onQuit())
    this._el.querySelector('#s-btn-bestiole')?.addEventListener('click', () => {
      if (this._onBestioleToggle) this._onBestioleToggle()
    })
  }

  unmount() {
    if (this._typewriterTimer) clearInterval(this._typewriterTimer)
    this._voicebox.stop()
    this._el?.remove()
    this._el = null
  }

  render(state) {
    if (!this._el) return
    const { run } = state

    // Day / season / biome info
    const season = SEASONS[run.season_index % SEASONS.length]
    const biome = run.biome_key ? getBiome(run.biome_key) : null
    const biomeName = biome ? biome.name : 'Brocéliande'
    const dayEl = this._el.querySelector('#s-day-info')
    if (dayEl) dayEl.textContent = `Jour ${run.day} — ${season} — ${biomeName}`

    // Faction reputation bars
    FACTIONS.forEach(faction => {
      const rep = run.factions?.[faction] ?? 50
      const info = FACTION_INFO[faction]
      const blockEl = this._el.querySelector(`.faction-block[data-faction="${faction}"]`)
      if (!blockEl) return

      const barFill = blockEl.querySelector('.faction-bar-fill')
      if (barFill) {
        barFill.style.width = `${rep}%`
        barFill.style.backgroundColor = info.color
      }

      const repLabel = blockEl.querySelector('.faction-rep')
      if (repLabel) repLabel.textContent = rep
    })

    // Souffle orbs
    this._el.querySelectorAll('.souffle-orb').forEach((orb, i) => {
      orb.classList.toggle('filled', i < run.souffle)
    })

    // Life orbs
    this._el.querySelectorAll('.life-orb').forEach((orb, i) => {
      orb.classList.toggle('filled', i < run.life_essence)
    })

    // Stats
    const cardsEl = this._el.querySelector('#s-stat-cards')
    if (cardsEl) cardsEl.textContent = run.cards_played

    // Current card
    if (run.current_card) {
      this._renderCard(run.current_card, run.souffle)
    }
  }

  showCardLoading(show) {
    const title = this._el?.querySelector('#s-card-title')
    const text = this._el?.querySelector('#s-card-text')
    const choices = this._el?.querySelector('#s-choices')
    if (show) {
      if (title) title.textContent = '...'
      if (text) this._typewrite(text, 'Merlin médite...')
      if (choices) choices.style.opacity = '0.3'
      this._el?.querySelectorAll('.choice-btn').forEach(b => b.disabled = true)
    } else {
      if (choices) choices.style.opacity = '1'
    }
  }

  _renderCard(card, souffle) {
    const titleEl = this._el.querySelector('#s-card-title')
    const textEl = this._el.querySelector('#s-card-text')
    if (titleEl) titleEl.textContent = card.title
    if (textEl) this._typewrite(textEl, card.text)

    const choicesEl = this._el.querySelector('#s-choices')
    if (!choicesEl) return
    choicesEl.innerHTML = ''

    ;(card.choices ?? []).forEach((choice, i) => {
      const btn = document.createElement('button')
      btn.className = 'choice-btn'
      btn.disabled = !this._onChoice
      btn.setAttribute('data-index', ['◁', '▽', '▷'][i])
      btn.innerHTML = `<span class="choice-text">${choice.label}</span>`
      if (choice.preview) btn.title = choice.preview

      btn.addEventListener('click', () => {
        if (this._onChoice) this._onChoice(i)
      })
      choicesEl.appendChild(btn)
    })
  }

  _typewrite(el, text, speed = 25) {
    if (this._typewriterTimer) clearInterval(this._typewriterTimer)
    this._voicebox.stop()
    el.textContent = ''
    el.classList.add('typing')
    let i = 0
    this._typewriterTimer = setInterval(() => {
      const char = text[i] ?? ''
      el.textContent += char
      this._voicebox.speakChar(char)
      i++
      if (i >= text.length) {
        clearInterval(this._typewriterTimer)
        this._typewriterTimer = null
        el.classList.remove('typing')
      }
    }, speed)
  }
}

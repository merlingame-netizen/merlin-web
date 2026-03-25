// M.E.R.L.I.N. — Minigame Overlay
// Shows minigame resolution: icon, name, roll, success/fail, auto-dismiss

export class MinigameOverlay {
  constructor() {
    this._el = null
    this._timer = null
  }

  show(result, minigame) {
    this._cleanup()

    this._el = document.createElement('div')
    this._el.className = `minigame-overlay ${result.success ? 'success' : 'fail'}`

    const criticalText = result.critical ? ' — CRITIQUE !' : result.fumble ? ' — FUMBLE !' : ''
    const icon = minigame.config?.icon ?? '🎲'

    this._el.innerHTML = `
      <div class="minigame-card">
        <div class="minigame-icon">${icon}</div>
        <div class="minigame-name">${minigame.label ?? 'Mini-jeu'}</div>
        <div class="minigame-d20">
          <span class="d20-die">🎲</span>
          <span class="d20-roll-anim" id="d20-anim">?</span>
        </div>
        <div class="minigame-dc">Difficulte: ${result.threshold}/20</div>
        <div class="minigame-result ${result.success ? 'success' : 'fail'}" id="mg-result" style="opacity:0">
          ${result.success ? '✓ Succes' : '✗ Echec'}${criticalText}
        </div>
        <div class="minigame-hint">Clic ou Entree pour continuer</div>
      </div>
    `

    document.body.appendChild(this._el)

    // Animate d20 roll (rapid number changes then land on result)
    const animEl = this._el.querySelector('#d20-anim')
    const resultEl = this._el.querySelector('#mg-result')
    let rollCount = 0
    const rollAnim = setInterval(() => {
      animEl.textContent = Math.floor(Math.random() * 20) + 1
      rollCount++
      if (rollCount >= 12) {
        clearInterval(rollAnim)
        animEl.textContent = result.roll
        animEl.classList.add(result.success ? 'roll-success' : 'roll-fail')
        if (resultEl) resultEl.style.opacity = '1'
      }
    }, 80)

    // Dismiss on click or Enter — NOT auto-dismiss
    const dismiss = () => {
      document.removeEventListener('keydown', keyHandler)
      this._cleanup()
    }
    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss() }
    }
    // Only allow dismiss after animation completes (1.2s)
    setTimeout(() => {
      this._el?.addEventListener('click', dismiss)
      document.addEventListener('keydown', keyHandler)
    }, 1200)

    // Auto-dismiss after 3s for smooth game flow
    this._timer = setTimeout(() => {
      document.removeEventListener('keydown', keyHandler)
      this._cleanup()
    }, 3000)
  }

  _cleanup() {
    if (this._timer) clearTimeout(this._timer)
    this._timer = null
    this._el?.remove()
    this._el = null
  }
}

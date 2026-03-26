// M.E.R.L.I.N. — Book Cinematic v5 (Canvas 2D Overlay)
// Full-screen canvas DOM overlay — no Three.js scene conflicts
// Draws book in isometric perspective with quill writing animation

const STATES = {
  APPROACH: 0, BOOK_OPEN: 1, WRITE_PAGE1: 2, WAIT_TURN: 3,
  PAGE_TURN: 4, WRITE_PAGE2: 5, DRAW_MAP: 6, WAIT_START: 7,
  FALL_IN: 8, DONE: 9,
}

const ease = t => 1 - Math.pow(1 - t, 3)
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2

export class BookCinematic {
  constructor() {
    this._state = STATES.APPROACH
    this._t = 0
    this._onComplete = null
    this._progress = { scenario: 0, pathEvents: 0, terrain: 0 }
    this._title = ''
    this._introTarget = ''
    this._charIndex = 0
    this._page2CharIndex = 0
    this._pathPoints = this._defaultPath()
    this._drawnSegs = 0
    this._coverAngle = 0 // 0=closed, 1=open

    // Full-screen canvas overlay
    this._wrapper = document.createElement('div')
    this._wrapper.style.cssText = 'position:fixed;inset:0;z-index:100;background:#0a0a0c;'
    this._cv = document.createElement('canvas')
    this._cv.style.cssText = 'width:100%;height:100%;'
    this._wrapper.appendChild(this._cv)
    document.body.appendChild(this._wrapper)

    this._resize()
    window.addEventListener('resize', () => this._resize())
    this._cx = this._cv.getContext('2d')

    // Buttons
    this._turnBtn = this._btn('Tourner la page ▶', '#ffcc44', () => {
      this._turnBtn.style.display = 'none'; this._state = STATES.PAGE_TURN; this._t = 0
    })
    this._startBtn = this._btn('Commencer l\'aventure ▶', '#33ff66', () => {
      this._startBtn.style.display = 'none'; this._state = STATES.FALL_IN; this._t = 0
    })
    this._skipBtn = this._btn('Passer ▶▶', 'rgba(255,255,255,0.4)', () => this.skip())
    this._skipBtn.style.cssText += ';bottom:16px;right:16px;left:auto;transform:none;font-size:12px;padding:6px 12px;'

    // Animation loop
    this._raf = 0
    this._lastTime = performance.now()
    this._animate()
  }

  _resize() {
    this._cv.width = window.innerWidth * (window.devicePixelRatio > 1 ? 1.5 : 1)
    this._cv.height = window.innerHeight * (window.devicePixelRatio > 1 ? 1.5 : 1)
    this._W = this._cv.width
    this._H = this._cv.height
  }

  _btn(text, color, onClick) {
    const b = document.createElement('button'); b.textContent = text
    b.style.cssText = `position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:101;padding:12px 24px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.8);border:2px solid ${color};color:${color};font:16px VT323,monospace;display:none;`
    b.addEventListener('click', onClick); this._wrapper.appendChild(b); return b
  }

  _defaultPath() {
    const pts = []; let px = 0.5, py = 0.9
    for (let i = 0; i < 10; i++) {
      const nx = 0.1 + Math.random() * 0.8, ny = py - 0.06 - Math.random() * 0.04
      pts.push({ x: px, y: py, nx, ny }); px = nx; py = ny
    }
    return pts
  }

  // ─── Progress callbacks ───
  onTitleReady(t) { if (t) this._title = t; this._progress.scenario = Math.max(this._progress.scenario, 0.2) }
  onIntroReady(t) { if (t) this._introTarget = t; this._progress.scenario = Math.max(this._progress.scenario, 0.3) }
  onIntroProgress(f) { this._progress.scenario = 0.3 + f * 0.7 }
  onPathReady(events) {
    if (events?.length) {
      this._pathPoints = []; let px = 0.5, py = 0.9
      for (const ev of events.slice(0, 12)) {
        const nx = 0.08 + Math.random() * 0.84, ny = py - 0.05 - Math.random() * 0.03
        this._pathPoints.push({ x: px, y: py, nx, ny }); px = nx; py = ny
      }
    }
    this._progress.pathEvents = 1.0
  }
  onTerrainReady() { this._progress.terrain = 1.0 }
  onAssetsReady() {}
  setOnComplete(fn) { this._onComplete = fn }

  // ─── Drawing helpers ───
  _drawBook(cx, W, H, coverOpen, showLeftPage, showRightPage) {
    const bw = W * 0.55, bh = H * 0.45
    const bx = (W - bw) / 2, by = (H - bh) / 2 + H * 0.05

    // Shadow
    cx.fillStyle = 'rgba(0,0,0,0.4)'
    cx.beginPath(); cx.ellipse(W/2, by + bh + 10, bw * 0.45, 15, 0, 0, Math.PI * 2); cx.fill()

    // Book spine
    cx.fillStyle = '#3a2210'; cx.fillRect(W/2 - 4, by, 8, bh)

    // Left page area
    if (showLeftPage) {
      cx.fillStyle = '#ede4d0'
      cx.fillRect(bx, by, bw/2 - 4, bh)
      cx.strokeStyle = '#b0a080'; cx.lineWidth = 1; cx.strokeRect(bx, by, bw/2 - 4, bh)
    } else {
      // Closed left = leather cover
      cx.fillStyle = '#4a2a12'
      cx.fillRect(bx, by, bw/2 - 4, bh)
    }

    // Right page area
    if (showRightPage) {
      cx.fillStyle = '#ede4d0'
      cx.fillRect(W/2 + 4, by, bw/2 - 4, bh)
      cx.strokeStyle = '#b0a080'; cx.lineWidth = 1; cx.strokeRect(W/2 + 4, by, bw/2 - 4, bh)
    }

    // Cover (animated rotation via shear)
    if (coverOpen < 1) {
      const coverW = (bw/2 - 4) * (1 - coverOpen)
      cx.fillStyle = '#5a3418'
      cx.fillRect(W/2 + 4, by, coverW, bh)
      // Cover highlight
      cx.fillStyle = 'rgba(255,220,150,0.08)'
      cx.fillRect(W/2 + 4, by, coverW, bh * 0.3)
    }

    // Pedestal base
    cx.fillStyle = '#2a2a28'
    cx.beginPath(); cx.ellipse(W/2, by + bh + 8, bw * 0.35, 12, 0, 0, Math.PI * 2); cx.fill()
    cx.fillStyle = '#3a3a36'
    cx.fillRect(W/2 - bw * 0.25, by + bh, bw * 0.5, 15)

    // Spotlight cone (subtle)
    const grad = cx.createRadialGradient(W/2, by - 50, 10, W/2, by + bh/2, bw * 0.6)
    grad.addColorStop(0, 'rgba(255,220,150,0.08)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    cx.fillStyle = grad; cx.fillRect(0, 0, W, H)

    return { bx, by, bw, bh }
  }

  _drawQuill(cx, x, y, writing) {
    cx.save(); cx.translate(x, y); cx.rotate(-0.4)
    // Shaft
    cx.fillStyle = '#ccbb88'; cx.fillRect(-1.5, -25, 3, 30)
    // Tip
    cx.fillStyle = '#111'; cx.beginPath(); cx.moveTo(-2, 5); cx.lineTo(2, 5); cx.lineTo(0, 12); cx.fill()
    // Feather
    cx.fillStyle = 'rgba(240,240,240,0.7)'
    cx.beginPath(); cx.ellipse(4, -20, 8, 15, 0.3, 0, Math.PI * 2); cx.fill()
    // Ink drops when writing
    if (writing && Math.random() > 0.7) {
      cx.fillStyle = '#1a1208'
      cx.beginPath(); cx.arc(Math.random()*4-2, 8+Math.random()*3, 1, 0, Math.PI*2); cx.fill()
    }
    cx.restore()
  }

  _writeOnPage(cx, x, y, w, h, title, text, maxChars, isPage2) {
    const margin = w * 0.08, lineH = h * 0.028
    let ty = y + (isPage2 ? margin : margin * 2)

    // Title (only on page 1)
    if (!isPage2 && title) {
      cx.fillStyle = '#1a0e04'; cx.font = `bold ${Math.round(h * 0.045)}px Georgia,serif`
      cx.textAlign = 'center'; cx.fillText(title, x + w/2, ty); cx.textAlign = 'left'
      ty += lineH * 1.5
      // Divider
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 1
      cx.beginPath(); cx.moveTo(x + margin * 2, ty); cx.lineTo(x + w - margin * 2, ty); cx.stroke()
      ty += lineH
    }

    // Body text
    cx.fillStyle = '#1a1008'; cx.font = `${Math.round(h * 0.032)}px Georgia,serif`
    const visible = text.substring(0, Math.floor(maxChars))
    const words = visible.split(' ')
    let line = '', maxW = w - margin * 2
    for (const word of words) {
      const test = line + word + ' '
      if (cx.measureText(test).width > maxW) {
        cx.fillText(line.trim(), x + margin, ty); line = word + ' '; ty += lineH
        if (ty > y + h - margin) break
      } else line = test
    }
    if (line.trim()) cx.fillText(line.trim(), x + margin, ty)

    // Cursor blink
    if (maxChars < text.length && Math.floor(this._t * 3) % 2 === 0) {
      cx.fillRect(x + margin + cx.measureText(line.trim()).width + 2, ty - h * 0.025, 2, h * 0.03)
    }
    return { lastX: x + margin + cx.measureText(line.trim()).width, lastY: ty }
  }

  _drawMapOnPage(cx, x, y, w, h, segs) {
    // Title
    cx.fillStyle = '#3a2a10'; cx.font = `bold ${Math.round(h * 0.035)}px Georgia,serif`
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', x + w/2, y + h * 0.06); cx.textAlign = 'left'

    // Path
    const pts = this._pathPoints, margin = w * 0.08
    cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5; cx.lineCap = 'round'
    for (let i = 0; i < segs && i < pts.length; i++) {
      const p = pts[i]
      const px1 = x + margin + p.x * (w - margin*2), py1 = y + h * 0.08 + p.y * (h * 0.85)
      const px2 = x + margin + p.nx * (w - margin*2), py2 = y + h * 0.08 + p.ny * (h * 0.85)
      cx.beginPath(); cx.moveTo(px1, py1)
      cx.quadraticCurveTo((px1+px2)/2 + (Math.random()-0.5)*10, (py1+py2)/2, px2, py2)
      cx.stroke()
      // Event dot
      cx.beginPath(); cx.arc(px2, py2, 4, 0, Math.PI * 2)
      cx.fillStyle = i % 3 === 0 ? '#cc6633' : '#2a8a3a'; cx.fill()
      cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5
    }
    // Start
    if (pts.length) {
      const sp = pts[0]
      cx.beginPath(); cx.arc(x + margin + sp.x * (w-margin*2), y + h*0.08 + sp.y * h * 0.85, 6, 0, Math.PI*2)
      cx.fillStyle = '#cc2222'; cx.fill()
    }
  }

  // ─── Animation loop ───
  _animate() {
    const now = performance.now()
    const dt = Math.min((now - this._lastTime) / 1000, 0.05)
    this._lastTime = now
    this._t += dt

    if (this._state === STATES.DONE) return

    const cx = this._cx, W = this._W, H = this._H, s = this._state, p = this._progress

    // Clear
    cx.fillStyle = '#0a0a0c'; cx.fillRect(0, 0, W, H)

    // ═══ APPROACH (3s): pedestal fades in ═══
    if (s === STATES.APPROACH) {
      const t = Math.min(1, this._t / 3), e = ease(t)
      cx.globalAlpha = e
      this._drawBook(cx, W, H, 0, false, false) // closed book
      cx.globalAlpha = 1
      if (t >= 1) { this._state = STATES.BOOK_OPEN; this._t = 0 }
    }

    // ═══ BOOK_OPEN (3s): cover opens ═══
    else if (s === STATES.BOOK_OPEN) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      this._coverAngle = e
      this._drawBook(cx, W, H, e, false, e > 0.5)
      if (t >= 1) { this._charIndex = 0; this._state = STATES.WRITE_PAGE1; this._t = 0 }
    }

    // ═══ WRITE_PAGE1 (progress-driven) ═══
    else if (s === STATES.WRITE_PAGE1) {
      const book = this._drawBook(cx, W, H, 1, false, true)
      const text = this._introTarget || 'La forêt ancienne murmure des secrets oubliés. Les sentiers se perdent dans la brume épaisse. Merlin attend au cœur du nemeton sacré.'
      const target = Math.floor(Math.min(p.scenario, 1) * text.length * 0.5)
      if (this._charIndex < target) this._charIndex = Math.min(this._charIndex + dt * 50, target)
      // Write on RIGHT page
      const rx = W/2 + 4, rw = book.bw/2 - 4
      const pos = this._writeOnPage(cx, rx, book.by, rw, book.bh, this._title, text, this._charIndex, false)
      // Quill
      if (this._charIndex < text.length * 0.5) this._drawQuill(cx, pos.lastX + 10, pos.lastY - 5, true)

      // Show turn button
      if ((this._charIndex >= target && p.scenario >= 0.5) || this._t > 10) {
        this._turnBtn.style.display = 'block'
      }
      if (this._t > 15) p.scenario = Math.max(p.scenario, 0.5) // fallback
    }

    // ═══ PAGE_TURN (1s) ═══
    else if (s === STATES.PAGE_TURN) {
      const t = Math.min(1, this._t / 1.0), e = easeIO(t)
      this._drawBook(cx, W, H, 1, e > 0.3, true)
      // Flip visual: shrink right page content, expand left
      if (t >= 1) { this._page2CharIndex = 0; this._state = STATES.WRITE_PAGE2; this._t = 0 }
    }

    // ═══ WRITE_PAGE2 (progress-driven) ═══
    else if (s === STATES.WRITE_PAGE2) {
      const book = this._drawBook(cx, W, H, 1, true, true)
      const text = this._introTarget || ''
      const half = Math.floor(text.length * 0.5)
      const page2Text = text.substring(half)
      const target = Math.floor(Math.min(p.scenario, 1) * page2Text.length)
      if (this._page2CharIndex < target) this._page2CharIndex = Math.min(this._page2CharIndex + dt * 50, target)
      // Left page = scenario continues
      const lx = book.bx, lw = book.bw/2 - 4
      const pos = this._writeOnPage(cx, lx, book.by, lw, book.bh, '', page2Text, this._page2CharIndex, true)
      if (this._page2CharIndex < page2Text.length) this._drawQuill(cx, pos.lastX + 10, pos.lastY - 5, true)

      if ((this._page2CharIndex >= page2Text.length && p.scenario >= 1) || this._t > 10) {
        this._state = STATES.DRAW_MAP; this._t = 0; this._drawnSegs = 0
      }
    }

    // ═══ DRAW_MAP (progress-driven) ═══
    else if (s === STATES.DRAW_MAP) {
      const book = this._drawBook(cx, W, H, 1, true, true)
      const total = this._pathPoints.length
      const targetSegs = Math.floor(p.pathEvents * total)
      if (this._drawnSegs < targetSegs) this._drawnSegs = Math.min(this._drawnSegs + dt * 3, targetSegs)
      if (this._t > 6 && this._drawnSegs < total) this._drawnSegs = total // fallback

      // Left page keeps text
      const text = this._introTarget || ''
      const half = Math.floor(text.length * 0.5)
      this._writeOnPage(cx, book.bx, book.by, book.bw/2 - 4, book.bh, '', text.substring(half), text.substring(half).length, true)

      // Right page = map
      const rx = W/2 + 4, rw = book.bw/2 - 4
      this._drawMapOnPage(cx, rx, book.by, rw, book.bh, Math.floor(this._drawnSegs))

      // Quill on map
      if (this._drawnSegs < total) {
        const seg = this._pathPoints[Math.min(Math.floor(this._drawnSegs), total - 1)]
        const qx = rx + rw * 0.08 + seg.nx * rw * 0.84
        const qy = book.by + book.bh * 0.08 + seg.ny * book.bh * 0.85
        this._drawQuill(cx, qx, qy, true)
      }

      if (this._drawnSegs >= total) {
        this._startBtn.style.display = 'block'
        this._state = STATES.WAIT_START; this._t = 0
      }
    }

    // ═══ WAIT_START ═══
    else if (s === STATES.WAIT_START) {
      const book = this._drawBook(cx, W, H, 1, true, true)
      const text = this._introTarget || ''
      this._writeOnPage(cx, book.bx, book.by, book.bw/2-4, book.bh, '', text.substring(Math.floor(text.length*0.5)), 9999, true)
      this._drawMapOnPage(cx, W/2+4, book.by, book.bw/2-4, book.bh, this._pathPoints.length)
    }

    // ═══ FALL_IN (2s) ═══
    else if (s === STATES.FALL_IN) {
      const t = Math.min(1, this._t / 2), e = easeIO(t)
      cx.globalAlpha = 1 - e
      const book = this._drawBook(cx, W, H, 1, true, true)
      this._drawMapOnPage(cx, W/2+4, book.by, book.bw/2-4, book.bh, this._pathPoints.length)
      cx.globalAlpha = 1
      // Dark overlay growing
      cx.fillStyle = `rgba(0,0,0,${e})`; cx.fillRect(0, 0, W, H)
      if (t >= 1) { this._state = STATES.DONE; this._cleanup(); this._onComplete?.() }
    }

    this._raf = requestAnimationFrame(() => this._animate())
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state === STATES.DONE }

  _cleanup() {
    this._state = STATES.DONE
    cancelAnimationFrame(this._raf)
    this._wrapper?.remove()
  }
}

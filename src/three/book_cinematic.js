// M.E.R.L.I.N. — Double Scroll Cinematic v9
// LEFT scroll = intro narrative text (quill writes the story)
// RIGHT scroll = abstract map with glowing dots connected by organic curves (NO labels)
// Events DRIVE the map — dots appear and glow as trail connects them
// NO timers for content — player clicks to advance

const STATES = {
  SCROLL_APPEAR: 0,
  SCROLL_UNROLL: 1,
  WRITE_STORY: 2,     // left: intro text writes, right: map dots trace in sync
  WAIT_ENTER: 3,
  DIVE: 4,
  DONE: 5,
}

const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const bounce = t => { const n=7.5625,d=2.75; if(t<1/d) return n*t*t; if(t<2/d) return n*(t-=1.5/d)*t+.75; if(t<2.5/d) return n*(t-=2.25/d)*t+.9375; return n*(t-=2.625/d)*t+.984375 }

export class BookCinematic {
  constructor() {
    this._state = STATES.SCROLL_APPEAR
    this._t = 0
    this._onComplete = null; this._onDiveStart = null
    this._progress = { terrain: 0 }

    // Intro text (narrative — written on LEFT scroll)
    this._introText = ''
    this._title = ''
    this._fallbackIntro = 'Les brumes de Broceliande se levent lentement, devoilant les racines noueuses des chenes millenaires. Au loin, entre les troncs, une lueur ambre pulse — le Nemeton, coeur sacre de la foret. Les korrigans ont laisse des traces dans la rosee. Le sentier s\'ouvre devant toi, etroit et sinueux. Merlin murmure dans le vent: "Les signes de la foret te guideront, mais chaque choix porte son ombre." Il n\'y a pas de retour possible. La mousse epaisse etouffe tes pas. Des champignons phosphorescents dessinent un chemin entre les pierres dressees. Un corbeau t\'observe depuis un chene centenaire, ses yeux brillent d\'une intelligence surnaturelle. L\'air sent la terre humide et le thym sauvage. Quelque part, le bruit d\'un ruisseau qui murmure des enigmes anciennes. Les menhirs se dressent comme des sentinelles immobiles, gardiens d\'un monde que peu d\'hommes connaissent encore. La foret attend. Elle a toujours attendu.'
    this._charIndex = 0

    // Map dots (RIGHT scroll) — abstract points from events, NO labels
    this._mapDots = [] // [{x, y, glowing}] — normalized 0-1 coordinates
    this._trailProgress = 0 // 0-1, how much of the trail is drawn
    this._dotCount = 0 // how many events/dots

    // Particles
    this._particles = []
    this._unrollProgress = 0

    // Canvas
    this._wrapper = document.createElement('div')
    this._wrapper.style.cssText = 'position:fixed;inset:0;z-index:100;background:#080810;overflow:hidden;'
    this._cv = document.createElement('canvas')
    this._cv.style.cssText = 'width:100%;height:100%;'
    this._wrapper.appendChild(this._cv)
    document.body.appendChild(this._wrapper)
    this._resize()
    this._resizeHandler = () => this._resize()
    window.addEventListener('resize', this._resizeHandler)
    this._cx = this._cv.getContext('2d')

    // Buttons
    this._enterBtn = this._btn('Entrer dans la foret \u25B6', '#33ff66')
    this._enterBtn.style.fontSize = '18px'; this._enterBtn.style.padding = '14px 28px'
    this._enterBtn.addEventListener('click', () => {
      this._enterBtn.style.display = 'none'
      this._state = STATES.DIVE; this._t = 0
    })
    this._skipBtn = this._btn('Passer \u25B6\u25B6', 'rgba(255,255,255,0.3)')
    this._skipBtn.style.cssText += ';bottom:12px;right:12px;left:auto;transform:none;font-size:11px;padding:5px 10px;display:block;'
    this._skipBtn.addEventListener('click', () => this.skip())

    this._raf = 0; this._lastTime = performance.now(); this._animate()
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    this._cv.width = window.innerWidth * dpr; this._cv.height = window.innerHeight * dpr
    this._W = this._cv.width; this._H = this._cv.height
  }

  _btn(text, color) {
    const b = document.createElement('button'); b.textContent = text
    b.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:101;padding:10px 22px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.8);border:2px solid ${color};color:${color};font:15px VT323,monospace;display:none;transition:transform 0.15s,box-shadow 0.15s;`
    b.addEventListener('mouseenter', () => { b.style.transform='translateX(-50%) scale(1.05)'; b.style.boxShadow=`0 0 15px ${color}44` })
    b.addEventListener('mouseleave', () => { b.style.transform='translateX(-50%) scale(1)'; b.style.boxShadow='none' })
    this._wrapper.appendChild(b); return b
  }

  // ─── Data Callbacks ───
  onEventsReady(events) {
    // Events build the map dots — organic positions, NO labels
    const count = events?.length || 0
    if (count > 0) {
      this._dotCount = count
      this._mapDots = this._buildOrganicPath(count)
    }
    this._progress.terrain = Math.max(this._progress.terrain, 0.3)
  }

  onIntroReady(title, intro) {
    if (title) this._title = title
    if (intro) this._introText = intro
  }

  onTerrainProgress(pct) { this._progress.terrain = Math.min(1, pct) }
  onTerrainReady() { this._progress.terrain = 1.0 }
  setOnComplete(fn) { this._onComplete = fn }
  setOnDiveStart(fn) { this._onDiveStart = fn }

  // Build an organic, non-straight path of dots (like a real forest trail)
  _buildOrganicPath(count) {
    const dots = []
    // Seed a natural-looking path: starts bottom, winds upward
    let cx = 0.45 + Math.random() * 0.1
    let cy = 0.88

    for (let i = 0; i < count; i++) {
      dots.push({ x: cx, y: cy, glowing: false })
      // Organic movement — sine waves + random offsets (never straight)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2 // mostly upward
      const step = (0.55 / count) + (Math.random() - 0.5) * 0.04
      cx += Math.cos(angle) * step * 0.8
      cy += Math.sin(angle) * step * 1.2
      // Clamp to scroll area
      cx = Math.max(0.15, Math.min(0.85, cx))
      cy = Math.max(0.1, Math.min(0.9, cy))
    }
    return dots
  }

  _getDefaultDots() {
    if (this._mapDots.length > 0) return this._mapDots
    // Fallback: 10 organic dots
    this._mapDots = this._buildOrganicPath(10)
    this._dotCount = 10
    return this._mapDots
  }

  // ─── Drawing Primitives ───
  _drawParchment(cx, x, y, w, h) {
    const grad = cx.createLinearGradient(x, y, x, y + h)
    grad.addColorStop(0, '#ddd0b0'); grad.addColorStop(0.05, '#ede4d0')
    grad.addColorStop(0.95, '#ede4d0'); grad.addColorStop(1, '#dcd0b0')
    cx.fillStyle = grad; cx.fillRect(x, y, w, h)
    // Age spots
    for (let i = 0; i < 6; i++) {
      cx.fillStyle = 'rgba(170,150,110,0.02)'
      cx.beginPath(); cx.arc(x + Math.random() * w, y + Math.random() * h, 2 + Math.random() * 5, 0, Math.PI * 2); cx.fill()
    }
    // Edge + border
    cx.fillStyle = 'rgba(140,120,80,0.06)'
    cx.fillRect(x, y, w, 3); cx.fillRect(x, y + h - 3, w, 3)
    cx.fillRect(x, y, 3, h); cx.fillRect(x + w - 3, y, 3, h)
    cx.strokeStyle = 'rgba(120,100,70,0.25)'; cx.lineWidth = 1; cx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  }

  _drawRoll(cx, x, y, w) {
    const rollH = 12
    const grad = cx.createLinearGradient(x, y - rollH, x, y)
    grad.addColorStop(0, '#b8a878'); grad.addColorStop(0.3, '#e0d4b8')
    grad.addColorStop(0.7, '#d0c4a8'); grad.addColorStop(1, '#a89868')
    cx.fillStyle = grad; cx.fillRect(x - 4, y - rollH, w + 8, rollH)
    cx.fillStyle = 'rgba(0,0,0,0.12)'; cx.fillRect(x, y, w, 3)
    // Wooden ends
    cx.fillStyle = '#7a5a30'
    cx.fillRect(x - 8, y - rollH - 2, 6, rollH + 4)
    cx.fillRect(x + w + 2, y - rollH - 2, 6, rollH + 4)
  }

  _drawCentralOrnament(cx, x, y, h) {
    cx.strokeStyle = 'rgba(180,150,80,0.35)'; cx.lineWidth = 1.5
    cx.beginPath(); cx.moveTo(x, y + 15); cx.lineTo(x, y + h - 15); cx.stroke()
    const dotCount = Math.floor(h / 45)
    for (let i = 0; i < dotCount; i++) {
      const dy = y + 25 + i * (h - 50) / Math.max(1, dotCount - 1)
      cx.fillStyle = 'rgba(200,170,80,0.25)'
      cx.beginPath(); cx.arc(x, dy, 2.5, 0, Math.PI * 2); cx.fill()
    }
  }

  _drawQuill(cx, x, y) {
    cx.save(); cx.translate(x, y); cx.rotate(-0.4)
    cx.fillStyle = '#ccbb88'; cx.fillRect(-1.5, -22, 3, 26)
    cx.fillStyle = '#111'; cx.beginPath(); cx.moveTo(-2, 4); cx.lineTo(2, 4); cx.lineTo(0, 10); cx.fill()
    cx.fillStyle = 'rgba(240,240,240,0.7)'; cx.beginPath(); cx.ellipse(3, -18, 7, 12, 0.3, 0, Math.PI * 2); cx.fill()
    cx.restore()
  }

  // ─── LEFT scroll: Intro narrative text ───
  _drawIntroText(cx, x, y, w, h, maxChars) {
    const text = this._introText || this._fallbackIntro
    const title = this._title || 'Broceliande'
    const chars = Math.min(Math.floor(maxChars), text.length)
    const visible = text.substring(0, chars)
    const margin = w * 0.08, lineH = 18
    const titleFont = Math.round(w * 0.048)
    const bodyFont = Math.round(w * 0.03)

    // Title
    let ty = y + 28
    cx.fillStyle = '#1a0e04'; cx.font = `bold ${titleFont}px Georgia,serif`
    cx.textAlign = 'center'; cx.fillText(title, x + w / 2, ty); cx.textAlign = 'left'
    ty += 6
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 0.8
    cx.beginPath(); cx.moveTo(x + margin * 2, ty); cx.lineTo(x + w - margin * 2, ty); cx.stroke()
    ty += 18

    // Body text — word-wrapped
    cx.fillStyle = '#1a1008'; cx.font = `${bodyFont}px Georgia,serif`
    const words = visible.split(' ')
    let line = '', maxW = w - margin * 2, lastX = x + margin, lastY = ty
    for (const word of words) {
      const test = line + word + ' '
      if (cx.measureText(test).width > maxW) {
        cx.fillText(line.trim(), x + margin, ty)
        lastX = x + margin + cx.measureText(line.trim()).width; lastY = ty
        line = word + ' '; ty += lineH
      } else { line = test }
    }
    if (line.trim()) {
      cx.fillText(line.trim(), x + margin, ty)
      lastX = x + margin + cx.measureText(line.trim()).width; lastY = ty
    }

    // Ink trail at writing position
    if (chars < text.length && chars > 0) {
      cx.fillStyle = 'rgba(20,12,4,0.15)'
      cx.beginPath(); cx.arc(lastX + 1, lastY - 4, 2.5, 0, Math.PI * 2); cx.fill()
      cx.fillStyle = 'rgba(20,12,4,0.06)'
      cx.beginPath(); cx.arc(lastX - 8, lastY - 4, 2, 0, Math.PI * 2); cx.fill()
      cx.beginPath(); cx.arc(lastX - 16, lastY - 3, 1.5, 0, Math.PI * 2); cx.fill()
      // Cursor
      if (Math.floor(this._t * 3) % 2 === 0) {
        cx.fillStyle = '#1a1008'
        cx.fillRect(lastX + 2, lastY - bodyFont, 1.5, bodyFont + 2)
      }
    }

    return { qx: lastX + 8, qy: lastY - 4, textDone: chars >= text.length }
  }

  // ─── RIGHT scroll: Abstract map with glowing dots + organic trails ───
  _drawAbstractMap(cx, x, y, w, h, trailProg) {
    const dots = this._getDefaultDots()
    const margin = w * 0.1

    // Compass
    const compassX = x + w - 22, compassY = y + 16
    cx.fillStyle = 'rgba(120,100,70,0.5)'; cx.font = 'bold 9px serif'; cx.textAlign = 'center'
    cx.fillText('N', compassX, compassY)
    cx.beginPath(); cx.moveTo(compassX, compassY + 2); cx.lineTo(compassX - 2.5, compassY + 8); cx.lineTo(compassX + 2.5, compassY + 8); cx.closePath()
    cx.fillStyle = 'rgba(120,100,70,0.4)'; cx.fill(); cx.textAlign = 'left'

    // Subtle terrain hints (blobs)
    cx.fillStyle = 'rgba(160,180,120,0.04)'
    for (let i = 0; i < 4; i++) {
      cx.beginPath()
      cx.arc(x + margin + (0.2 + i * 0.2) * (w - margin * 2), y + 40 + Math.sin(i * 1.7) * h * 0.2, 20 + i * 8, 0, Math.PI * 2)
      cx.fill()
    }

    // How many segments to draw
    const totalSegs = dots.length - 1
    const segsToShow = Math.floor(trailProg * totalSegs)
    const partialSeg = (trailProg * totalSegs) - segsToShow // 0-1 fraction of next seg

    // Draw organic trail (Bezier curves, NOT straight lines)
    if (segsToShow > 0 || partialSeg > 0) {
      cx.strokeStyle = '#5a4a2a'; cx.lineWidth = 2; cx.lineCap = 'round'; cx.lineJoin = 'round'

      for (let i = 0; i < segsToShow + (partialSeg > 0.01 ? 1 : 0) && i < totalSegs; i++) {
        const d0 = dots[i], d1 = dots[i + 1]
        const px0 = x + margin + d0.x * (w - margin * 2)
        const py0 = y + 25 + d0.y * (h - 45)
        const px1 = x + margin + d1.x * (w - margin * 2)
        const py1 = y + 25 + d1.y * (h - 45)

        // Organic curve: offset control points perpendicular to the line
        const midX = (px0 + px1) / 2, midY = (py0 + py1) / 2
        const dx = px1 - px0, dy = py1 - py0
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        // Perpendicular offset (alternating sides for organic feel)
        const perpX = -dy / len * (10 + (i % 3) * 5) * (i % 2 === 0 ? 1 : -1)
        const perpY = dx / len * (10 + (i % 3) * 5) * (i % 2 === 0 ? 1 : -1)
        const cpx = midX + perpX, cpy = midY + perpY

        // Partial last segment
        const isPartial = i === segsToShow && partialSeg > 0.01
        if (isPartial) {
          // Draw partial Bezier
          cx.beginPath(); cx.moveTo(px0, py0)
          // Approximate partial curve by splitting the Bezier
          const t = partialSeg
          const qx0 = px0 + (cpx - px0) * t, qy0 = py0 + (cpy - py0) * t
          const qx1 = cpx + (px1 - cpx) * t, qy1 = cpy + (py1 - cpy) * t
          const fx = qx0 + (qx1 - qx0) * t, fy = qy0 + (qy1 - qy0) * t
          cx.quadraticCurveTo(qx0, qy0, fx, fy)
          cx.stroke()
        } else {
          cx.beginPath(); cx.moveTo(px0, py0)
          cx.quadraticCurveTo(cpx, cpy, px1, py1)
          cx.stroke()
        }
      }
    }

    // Draw dots — glow when trail reaches them
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      const px = x + margin + d.x * (w - margin * 2)
      const py = y + 25 + d.y * (h - 45)
      const reached = i <= segsToShow

      if (reached) {
        // Glowing dot
        const pulse = 0.7 + 0.3 * Math.sin(this._t * 3 + i * 0.8)

        // Outer glow
        cx.fillStyle = `rgba(255,190,60,${0.08 * pulse})`
        cx.beginPath(); cx.arc(px, py, 14, 0, Math.PI * 2); cx.fill()

        // Middle glow
        cx.fillStyle = `rgba(255,200,80,${0.15 * pulse})`
        cx.beginPath(); cx.arc(px, py, 8, 0, Math.PI * 2); cx.fill()

        // Core
        cx.fillStyle = i === 0 ? '#cc3322' : `rgba(255,190,60,${0.6 + 0.3 * pulse})`
        cx.beginPath(); cx.arc(px, py, 4, 0, Math.PI * 2); cx.fill()

        // Bright center
        cx.fillStyle = `rgba(255,240,200,${0.5 * pulse})`
        cx.beginPath(); cx.arc(px, py, 2, 0, Math.PI * 2); cx.fill()
      } else {
        // Dim, unreached dot
        cx.fillStyle = 'rgba(100,80,50,0.15)'
        cx.beginPath(); cx.arc(px, py, 3, 0, Math.PI * 2); cx.fill()
      }
    }

    // Start marker highlight
    if (dots.length > 0) {
      const s = dots[0]
      const sx = x + margin + s.x * (w - margin * 2), sy = y + 25 + s.y * (h - 45)
      cx.fillStyle = '#fff'; cx.font = 'bold 7px sans-serif'; cx.textAlign = 'center'
      cx.fillText('\u25B6', sx, sy + 2.5); cx.textAlign = 'left'
    }

    // Loading bar (if terrain not fully loaded)
    if (this._progress.terrain < 1) {
      const barW = w * 0.5, barH = 5
      const barX = x + (w - barW) / 2, barY = y + h - 16
      cx.fillStyle = 'rgba(80,60,30,0.15)'; cx.fillRect(barX, barY, barW, barH)
      cx.fillStyle = 'rgba(50,140,60,0.4)'; cx.fillRect(barX, barY, barW * this._progress.terrain, barH)
      cx.fillStyle = 'rgba(60,40,20,0.3)'; cx.font = '8px Georgia,serif'; cx.textAlign = 'center'
      cx.fillText('Materialisation...', x + w / 2, barY - 3); cx.textAlign = 'left'
    }
  }

  // ─── Particles ───
  _spawnParticles(count, x, y, type) {
    for (let i = 0; i < count; i++) this._particles.push({
      x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 0.6, vy: -0.3 - Math.random() * 0.8,
      life: 1, type, size: 1 + Math.random() * 2.5
    })
  }

  _drawParticles(cx) {
    if (Math.random() > 0.92) this._spawnParticles(1, this._W / 2 + (Math.random() - 0.5) * this._W * 0.5, this._H * 0.8, 'firefly')
    this._particles = this._particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life -= (p.type === 'firefly' ? 0.004 : 0.02)
      if (p.life <= 0) return false
      if (p.type === 'spark') {
        cx.fillStyle = `rgba(255,200,80,${p.life * 0.5})`; cx.beginPath(); cx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); cx.fill()
        cx.fillStyle = `rgba(255,180,50,${p.life * 0.12})`; cx.beginPath(); cx.arc(p.x, p.y, p.size * p.life * 3, 0, Math.PI * 2); cx.fill()
      } else {
        const f = 0.5 + Math.sin(this._t * 8 + p.x) * 0.5
        cx.fillStyle = `rgba(200,255,150,${p.life * 0.25 * f})`; cx.beginPath(); cx.arc(p.x, p.y, p.size * f, 0, Math.PI * 2); cx.fill()
      }
      return true
    })
  }

  // ─── Main Loop ───
  _animate() {
    const now = performance.now(), dt = Math.min((now - this._lastTime) / 1000, 0.05)
    this._lastTime = now; this._t += dt
    if (this._state === STATES.DONE) return

    const cx = this._cx, W = this._W, H = this._H, s = this._state

    cx.fillStyle = '#080810'; cx.fillRect(0, 0, W, H)

    // Layout
    const gap = W * 0.02
    const totalW = W * 0.88
    const leftW = totalW * 0.55
    const rightW = totalW * 0.45
    const leftX = (W - totalW) / 2
    const rightX = leftX + leftW + gap
    const centerX = leftX + leftW + gap / 2

    // === SCROLL_APPEAR (2s) ===
    if (s === STATES.SCROLL_APPEAR) {
      const t = Math.min(1, this._t / 2), e = bounce(t)
      cx.globalAlpha = Math.min(1, this._t / 1.2)
      const sy = H * 0.15 + (1 - e) * H * 0.2
      this._drawRoll(cx, leftX, sy, leftW)
      this._drawRoll(cx, rightX, sy, rightW)
      this._drawParticles(cx)
      this._spawnParticles(2, W / 2, sy, 'spark')
      cx.globalAlpha = 1
      if (t >= 1) { this._state = STATES.SCROLL_UNROLL; this._t = 0 }
    }

    // === SCROLL_UNROLL (3s) ===
    else if (s === STATES.SCROLL_UNROLL) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      this._unrollProgress = e
      const scrollTop = H * 0.12, scrollH = e * H * 0.72

      this._drawParchment(cx, leftX, scrollTop, leftW, scrollH)
      this._drawRoll(cx, leftX, scrollTop, leftW)
      if (e < 1) this._drawRoll(cx, leftX, scrollTop + scrollH + 12, leftW)

      this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
      this._drawRoll(cx, rightX, scrollTop, rightW)
      if (e < 1) this._drawRoll(cx, rightX, scrollTop + scrollH + 12, rightW)

      this._drawCentralOrnament(cx, centerX, scrollTop, scrollH)
      this._drawParticles(cx)

      if (t >= 1) {
        this._charIndex = 0
        this._state = STATES.WRITE_STORY; this._t = 0
      }
    }

    // === WRITE_STORY (text writes at 35 chars/sec, map syncs) ===
    else if (s === STATES.WRITE_STORY) {
      const scrollTop = H * 0.12, scrollH = H * 0.72
      const text = this._introText || this._fallbackIntro

      // Advance text
      this._charIndex = Math.min(this._charIndex + dt * 35, text.length)
      const textProgress = this._charIndex / text.length // 0-1

      // LEFT scroll: intro text
      this._drawParchment(cx, leftX, scrollTop, leftW, scrollH)
      this._drawRoll(cx, leftX, scrollTop, leftW)
      cx.save()
      cx.beginPath(); cx.rect(leftX, scrollTop, leftW, scrollH); cx.clip()
      const pos = this._drawIntroText(cx, leftX, scrollTop, leftW, scrollH, this._charIndex)
      cx.restore()

      // Quill on text
      if (!pos.textDone) this._drawQuill(cx, pos.qx, pos.qy)

      // RIGHT scroll: abstract map
      this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
      this._drawRoll(cx, rightX, scrollTop, rightW)

      // Trail progress driven by BOTH text progress and terrain loading
      const terrainFactor = Math.max(this._progress.terrain, this._t * 0.06)
      this._trailProgress = Math.min(1, Math.min(textProgress, terrainFactor))

      cx.save()
      cx.beginPath(); cx.rect(rightX, scrollTop, rightW, scrollH); cx.clip()
      this._drawAbstractMap(cx, rightX, scrollTop, rightW, scrollH, this._trailProgress)
      cx.restore()

      // Central ornament
      this._drawCentralOrnament(cx, centerX, scrollTop, scrollH)
      this._drawParticles(cx)

      // Show enter button when text done AND trail complete
      if (pos.textDone && this._trailProgress >= 0.95) {
        this._enterBtn.style.display = 'block'
      }
    }

    // === DIVE (3s) ===
    else if (s === STATES.DIVE) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      if (this._t < 0.05 && this._onDiveStart) { this._onDiveStart(); this._onDiveStart = null }

      if (t < 0.6) {
        const zoom = 1 + e * 6
        const mapCenterX = (leftX + rightX + rightW) / 2
        const mapCenterY = H * 0.48
        cx.save()
        cx.translate(mapCenterX, mapCenterY); cx.scale(zoom, zoom); cx.translate(-mapCenterX, -mapCenterY)
        const scrollTop = H * 0.12, scrollH = H * 0.72
        this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
        this._drawAbstractMap(cx, rightX, scrollTop, rightW, scrollH, 1)
        cx.restore()
        cx.fillStyle = `rgba(0,0,0,${e * 0.7})`
        cx.fillRect(0, 0, W, H * 0.25); cx.fillRect(0, H * 0.75, W, H * 0.25)
      } else {
        const fadeT = (t - 0.6) / 0.4
        this._wrapper.style.opacity = String(1 - fadeT)
        this._wrapper.style.background = 'transparent'
      }

      if (t > 0.3) this._spawnParticles(3, W / 2 + (Math.random() - 0.5) * W * 0.3, H / 2 + (Math.random() - 0.5) * H * 0.3, 'spark')
      this._drawParticles(cx)

      if (t >= 1) { this._state = STATES.DONE; this._cleanup(); this._onComplete?.() }
    }

    this._raf = requestAnimationFrame(() => this._animate())
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state === STATES.DONE }

  _cleanup() {
    this._state = STATES.DONE; cancelAnimationFrame(this._raf)
    window.removeEventListener('resize', this._resizeHandler)
    this._wrapper?.remove()
  }
}

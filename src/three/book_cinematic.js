// M.E.R.L.I.N. — Double Scroll Cinematic v8
// TWO scrolls side by side: LEFT = scenario events (Hand of Fate 2), RIGHT = map
// Events DRIVE the map — each event = a point on the trail
// NO timers for content progression — player clicks to advance

const STATES = {
  SCROLL_APPEAR: 0,   // both scrolls materialize from darkness
  SCROLL_UNROLL: 1,   // scrolls unroll top→bottom in parallel
  WRITE_EVENTS: 2,    // left: events write one by one, right: map traces in sync
  WAIT_ENTER: 3,      // player clicks "Entrer dans la foret"
  DIVE: 4,            // zoom into map, crossfade to 3D
  DONE: 5,
}

const ease = t => 1 - Math.pow(1 - t, 3)
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const bounce = t => { const n=7.5625,d=2.75; if(t<1/d) return n*t*t; if(t<2/d) return n*(t-=1.5/d)*t+.75; if(t<2.5/d) return n*(t-=2.25/d)*t+.9375; return n*(t-=2.625/d)*t+.984375 }

// Celtic ornament symbols for event markers
const EVENT_SYMBOLS = ['◆', '✦', '◈', '⟡', '⬡', '◇', '✧', '⬢', '◎', '⟐', '⬟', '✶', '◉', '⬠', '✸']

export class BookCinematic {
  constructor() {
    this._state = STATES.SCROLL_APPEAR
    this._t = 0
    this._onComplete = null; this._onDiveStart = null
    this._progress = { scenario: 0, terrain: 0 }

    // Events data (Hand of Fate 2 style)
    this._events = [] // [{title, description, scene_tag}]
    this._fallbackEvents = [
      { title: 'L\'Eveil dans la Brume', description: 'Les premieres lueurs filtrent a travers les branches. La rosee perle sur les fougeres centenaires. Un souffle ancien murmure ton nom.', scene_tag: 'mist' },
      { title: 'Le Cercle des Anciens', description: 'Les menhirs se dressent en sentinelles immobiles. Des runes a moitie effacees luisent dans la penombre. Le sol vibre sous tes pieds.', scene_tag: 'stone_circle' },
      { title: 'Le Ruisseau Murmurant', description: 'Une eau cristalline coule entre les racines noueuses. Les reflets dansent comme des esprits malicieux. Le courant porte des fragments de melodies oubliees.', scene_tag: 'stream' },
      { title: 'La Rencontre du Marchand', description: 'Un voyageur aux yeux d\'ambre se tient au carrefour. Sa carriole deborde de curiosites etranges. Chaque objet semble porter une histoire.', scene_tag: 'merchant' },
      { title: 'Le Pont des Serments', description: 'Un pont de pierre enjambe un gouffre obscur. Des rubans colores flottent aux rambardes. Ceux qui traversent doivent jurer ou payer le prix.', scene_tag: 'bridge' },
      { title: 'Le Feu des Druides', description: 'Un brasier sacre crepite au coeur d\'une clairiere. Les flammes dansent en spirales impossibles. L\'odeur du gui brule emplit l\'air.', scene_tag: 'campfire' },
      { title: 'La Grotte des Echos', description: 'L\'obscurite s\'ouvre comme une bouche de pierre. Des stalagmites brillent d\'une lumiere interieure. Les echos repetent des mots que personne n\'a prononces.', scene_tag: 'cave' },
      { title: 'Le Chene Centenaire', description: 'Un arbre immense deploie ses branches comme des bras protecteurs. Son tronc porte les cicatrices de mille saisons. Les korrigans y ont elu domicile.', scene_tag: 'ancient_tree' },
      { title: 'L\'Autel Oublie', description: 'Une dalle de granit affleure sous le lierre. Des offrandes anciennes y reposent encore. Le silence ici est plus dense qu\'ailleurs.', scene_tag: 'altar' },
      { title: 'Le Seuil de Broceliande', description: 'Le sentier debouche sur une arche naturelle de branches entrelacees. Au-dela, la foret change. Les regles du monde ordinaire n\'ont plus cours ici.', scene_tag: 'portal' },
    ]

    // Writing state
    this._currentEventIdx = 0
    this._charIndex = 0
    this._eventFullyWritten = false
    this._allEventsWritten = false

    // Map state
    this._pathPoints = []
    this._drawnSegs = 0
    this._mapProgress = 0

    // Particles
    this._particles = []
    this._unrollProgress = 0

    // Scroll offset for long event lists
    this._scrollOffset = 0

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

    // Buttons (hidden by default)
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
    if (events?.length) {
      this._events = events
      this._buildPathFromEvents(events)
      this._progress.scenario = 1.0
    }
  }
  onTerrainProgress(pct) { this._progress.terrain = Math.min(1, pct) }
  onTerrainReady() { this._progress.terrain = 1.0 }
  setOnComplete(fn) { this._onComplete = fn }
  setOnDiveStart(fn) { this._onDiveStart = fn }

  _getEvents() {
    return this._events.length > 0 ? this._events : this._fallbackEvents
  }

  _buildPathFromEvents(events) {
    this._pathPoints = []
    const count = Math.min(events.length, 15)
    let py = 0.88
    const cx = 0.5
    for (let i = 0; i < count; i++) {
      const nx = cx + Math.sin(i * 0.7 + 0.3) * 0.28
      const ny = py - (0.72 / count)
      this._pathPoints.push({
        x: i === 0 ? cx : this._pathPoints[this._pathPoints.length - 1].nx,
        y: py, nx, ny,
        tag: events[i]?.scene_tag || 'glow',
        title: events[i]?.title || '',
      })
      py = ny
    }
  }

  // ─── Drawing Primitives ───
  _drawParchment(cx, x, y, w, h) {
    const grad = cx.createLinearGradient(x, y, x, y + h)
    grad.addColorStop(0, '#ddd0b0'); grad.addColorStop(0.05, '#ede4d0')
    grad.addColorStop(0.95, '#ede4d0'); grad.addColorStop(1, '#dcd0b0')
    cx.fillStyle = grad; cx.fillRect(x, y, w, h)
    // Age spots
    for (let i = 0; i < 8; i++) {
      cx.fillStyle = 'rgba(170,150,110,0.02)'
      cx.beginPath(); cx.arc(x + Math.random() * w, y + Math.random() * h, 2 + Math.random() * 5, 0, Math.PI * 2); cx.fill()
    }
    // Edge burn + border
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
    // Shadow below
    cx.fillStyle = 'rgba(0,0,0,0.12)'; cx.fillRect(x, y, w, 3)
    // Wooden ends
    cx.fillStyle = '#7a5a30'
    cx.fillRect(x - 8, y - rollH - 2, 6, rollH + 4)
    cx.fillRect(x + w + 2, y - rollH - 2, 6, rollH + 4)
  }

  _drawCentralOrnament(cx, x, y, h) {
    // Golden celtic divider between the two scrolls
    cx.strokeStyle = 'rgba(180,150,80,0.4)'; cx.lineWidth = 2
    cx.beginPath(); cx.moveTo(x, y + 20); cx.lineTo(x, y + h - 20); cx.stroke()
    // Celtic knot dots
    const dotCount = Math.floor(h / 40)
    for (let i = 0; i < dotCount; i++) {
      const dy = y + 30 + i * (h - 60) / Math.max(1, dotCount - 1)
      cx.fillStyle = 'rgba(200,170,80,0.3)'
      cx.beginPath(); cx.arc(x, dy, 3, 0, Math.PI * 2); cx.fill()
      cx.fillStyle = 'rgba(200,170,80,0.1)'
      cx.beginPath(); cx.arc(x, dy, 6, 0, Math.PI * 2); cx.fill()
    }
  }

  _drawQuill(cx, x, y) {
    cx.save(); cx.translate(x, y); cx.rotate(-0.4)
    cx.fillStyle = '#ccbb88'; cx.fillRect(-1.5, -22, 3, 26)
    cx.fillStyle = '#111'; cx.beginPath(); cx.moveTo(-2, 4); cx.lineTo(2, 4); cx.lineTo(0, 10); cx.fill()
    cx.fillStyle = 'rgba(240,240,240,0.7)'; cx.beginPath(); cx.ellipse(3, -18, 7, 12, 0.3, 0, Math.PI * 2); cx.fill()
    cx.restore()
  }

  // ─── Left Scroll: Event List ───
  _drawEventList(cx, x, y, w, h, eventIdx, charProgress) {
    const events = this._getEvents()
    const margin = w * 0.08
    const titleFont = Math.round(w * 0.05)
    const bodyFont = Math.round(w * 0.032)
    const eventTitleFont = Math.round(w * 0.038)
    const lineH = bodyFont * 1.4

    // Scroll title
    let ty = y + 28
    cx.fillStyle = '#2a1808'
    cx.font = `bold ${titleFont}px Georgia,serif`
    cx.textAlign = 'center'
    cx.fillText('La Quete', x + w / 2, ty)
    cx.textAlign = 'left'
    ty += 6
    // Decorative line
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 0.8
    cx.beginPath(); cx.moveTo(x + margin * 1.5, ty); cx.lineTo(x + w - margin * 1.5, ty); cx.stroke()
    ty += 16

    let lastQx = x + margin, lastQy = ty

    // Draw each event
    for (let i = 0; i < events.length; i++) {
      if (ty > y + h - 20) break // don't overflow

      const ev = events[i]
      const isCurrentEvent = i === eventIdx
      const isPast = i < eventIdx
      const isFuture = i > eventIdx

      if (isFuture) break // don't show future events

      // Event number + symbol
      const symbol = EVENT_SYMBOLS[i % EVENT_SYMBOLS.length]
      cx.fillStyle = isPast ? '#6a5a3a' : '#2a1808'
      cx.font = `bold ${eventTitleFont}px Georgia,serif`
      const titleText = `${symbol} ${ev.title}`
      cx.fillText(titleText, x + margin, ty)
      ty += 4

      // Underline for current event
      if (isCurrentEvent) {
        cx.strokeStyle = 'rgba(180,140,60,0.3)'; cx.lineWidth = 0.5
        cx.beginPath(); cx.moveTo(x + margin, ty); cx.lineTo(x + margin + cx.measureText(titleText).width, ty); cx.stroke()
      }
      ty += lineH * 0.6

      // Description text (word-wrapped)
      cx.font = `${bodyFont}px Georgia,serif`
      cx.fillStyle = isPast ? '#8a7a5a' : '#1a1008'
      const maxW = w - margin * 2

      let desc = ev.description || ''
      if (isCurrentEvent) {
        // Only show up to charProgress characters
        desc = desc.substring(0, Math.floor(charProgress))
      }

      const words = desc.split(' ')
      let line = ''
      for (const word of words) {
        const test = line + word + ' '
        if (cx.measureText(test).width > maxW) {
          cx.fillText(line.trim(), x + margin, ty)
          lastQx = x + margin + cx.measureText(line.trim()).width
          lastQy = ty
          line = word + ' '; ty += lineH
        } else { line = test }
      }
      if (line.trim()) {
        cx.fillText(line.trim(), x + margin, ty)
        lastQx = x + margin + cx.measureText(line.trim()).width
        lastQy = ty
        ty += lineH
      }

      // Ink trail for current event
      if (isCurrentEvent && charProgress < (ev.description || '').length) {
        cx.fillStyle = 'rgba(20,12,4,0.15)'
        cx.beginPath(); cx.arc(lastQx + 1, lastQy - 4, 2.5, 0, Math.PI * 2); cx.fill()
        cx.fillStyle = 'rgba(20,12,4,0.06)'
        cx.beginPath(); cx.arc(lastQx - 8, lastQy - 4, 2, 0, Math.PI * 2); cx.fill()
        // Blinking cursor
        if (Math.floor(this._t * 3) % 2 === 0) {
          cx.fillStyle = '#1a1008'
          cx.fillRect(lastQx + 2, lastQy - bodyFont, 1.5, bodyFont + 2)
        }
      }

      ty += lineH * 0.8 // spacing between events
    }

    return { qx: lastQx + 8, qy: lastQy - 4 }
  }

  // ─── Right Scroll: Map ───
  _drawMap(cx, x, y, w, h, segs) {
    const events = this._getEvents()
    const margin = w * 0.1

    // Map title
    cx.fillStyle = '#3a2a10'; cx.font = `bold ${Math.round(w * 0.045)}px Georgia,serif`
    cx.textAlign = 'center'; cx.fillText('Carte de la Quete', x + w / 2, y + 24); cx.textAlign = 'left'

    // Compass rose
    const compassX = x + w - 28, compassY = y + 18
    cx.fillStyle = '#7a6a50'; cx.font = 'bold 10px serif'; cx.textAlign = 'center'
    cx.fillText('N', compassX, compassY)
    cx.beginPath(); cx.moveTo(compassX, compassY + 3); cx.lineTo(compassX - 3, compassY + 10); cx.lineTo(compassX + 3, compassY + 10); cx.closePath()
    cx.fillStyle = '#8a7a60'; cx.fill(); cx.textAlign = 'left'

    // Build path points if not done
    if (this._pathPoints.length === 0) this._buildPathFromEvents(events)
    const pts = this._pathPoints

    // Background terrain hints (subtle)
    cx.fillStyle = 'rgba(180,200,140,0.08)'
    for (let i = 0; i < 5; i++) {
      cx.beginPath()
      cx.arc(x + margin + Math.random() * (w - margin * 2), y + 40 + Math.random() * (h - 60), 15 + Math.random() * 25, 0, Math.PI * 2)
      cx.fill()
    }

    // Path — smooth Bezier curves
    cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5; cx.lineCap = 'round'; cx.lineJoin = 'round'

    for (let i = 0; i < segs && i < pts.length; i++) {
      const p = pts[i]
      const px1 = x + margin + p.x * (w - margin * 2), py1 = y + 35 + p.y * (h - 55)
      const px2 = x + margin + p.nx * (w - margin * 2), py2 = y + 35 + p.ny * (h - 55)
      const cpx = (px1 + px2) / 2, cpy = (py1 + py2) / 2

      // Trail (dashed for unvisited, solid for visited)
      cx.setLineDash(i < Math.floor(segs) ? [] : [4, 4])
      cx.beginPath(); cx.moveTo(px1, py1); cx.quadraticCurveTo(cpx, cpy, px2, py2); cx.stroke()
      cx.setLineDash([])

      // Event marker at destination
      const isActive = i === Math.floor(segs) - 1 && segs < pts.length
      const markerR = isActive ? 6 : 4.5
      cx.beginPath(); cx.arc(px2, py2, markerR, 0, Math.PI * 2)

      // Color by scene_tag mood
      const tag = p.tag || 'glow'
      const sacredTags = ['stone_circle', 'altar', 'sacred_tree', 'fountain', 'portal']
      const dangerTags = ['cave', 'wolf', 'weapons', 'ruins']
      if (sacredTags.includes(tag)) cx.fillStyle = '#2a8a3a'
      else if (dangerTags.includes(tag)) cx.fillStyle = '#cc4433'
      else cx.fillStyle = '#cc8833'
      cx.fill()

      // Glow for active marker
      if (isActive) {
        cx.beginPath(); cx.arc(px2, py2, 12, 0, Math.PI * 2)
        cx.strokeStyle = 'rgba(200,170,60,0.3)'; cx.lineWidth = 1; cx.stroke()
        cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5
      }

      // Label (tiny, next to marker)
      if (p.title && i < segs) {
        cx.fillStyle = 'rgba(60,40,20,0.6)'; cx.font = `${Math.round(w * 0.022)}px Georgia,serif`
        const labelX = px2 + (p.nx > 0.5 ? -cx.measureText(p.title).width - 8 : 8)
        cx.fillText(p.title, labelX, py2 + 3)
      }
    }

    // Start marker (always visible)
    if (pts.length > 0) {
      const sp = pts[0]
      const sx = x + margin + sp.x * (w - margin * 2), sy = y + 35 + sp.y * (h - 55)
      cx.beginPath(); cx.arc(sx, sy, 7, 0, Math.PI * 2)
      cx.fillStyle = '#cc2222'; cx.fill()
      cx.fillStyle = '#fff'; cx.font = 'bold 8px sans-serif'; cx.textAlign = 'center'
      cx.fillText('\u25B6', sx, sy + 3); cx.textAlign = 'left'
    }

    // Loading indicator (if terrain not ready)
    if (this._progress.terrain < 1) {
      const barW = w * 0.6, barH = 6
      const barX = x + (w - barW) / 2, barY = y + h - 18
      cx.fillStyle = 'rgba(80,60,30,0.2)'; cx.fillRect(barX, barY, barW, barH)
      cx.fillStyle = 'rgba(50,140,60,0.5)'; cx.fillRect(barX, barY, barW * this._progress.terrain, barH)
      cx.fillStyle = 'rgba(60,40,20,0.4)'; cx.font = '9px Georgia,serif'; cx.textAlign = 'center'
      cx.fillText('Materialisation du monde...', x + w / 2, barY - 4); cx.textAlign = 'left'
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

    // Layout: two scrolls side by side with gap
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
      // Both rolls appear
      this._drawRoll(cx, leftX, sy, leftW)
      this._drawRoll(cx, rightX, sy, rightW)
      this._drawParticles(cx)
      this._spawnParticles(2, W / 2, sy, 'spark')
      cx.globalAlpha = 1
      if (t >= 1) { this._state = STATES.SCROLL_UNROLL; this._t = 0; this._unrollProgress = 0 }
    }

    // === SCROLL_UNROLL (3s) ===
    else if (s === STATES.SCROLL_UNROLL) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      this._unrollProgress = e
      const scrollTop = H * 0.12
      const scrollH = e * H * 0.72

      // Left scroll (events)
      this._drawParchment(cx, leftX, scrollTop, leftW, scrollH)
      this._drawRoll(cx, leftX, scrollTop, leftW)
      if (e < 1) this._drawRoll(cx, leftX, scrollTop + scrollH + 12, leftW)

      // Right scroll (map)
      this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
      this._drawRoll(cx, rightX, scrollTop, rightW)
      if (e < 1) this._drawRoll(cx, rightX, scrollTop + scrollH + 12, rightW)

      // Central ornament
      this._drawCentralOrnament(cx, centerX, scrollTop, scrollH)

      this._drawParticles(cx)
      if (t >= 1) {
        this._currentEventIdx = 0; this._charIndex = 0; this._eventFullyWritten = false
        this._state = STATES.WRITE_EVENTS; this._t = 0
        // Build path if not already done
        if (this._pathPoints.length === 0) this._buildPathFromEvents(this._getEvents())
      }
    }

    // === WRITE_EVENTS (progress-driven — NO timer) ===
    else if (s === STATES.WRITE_EVENTS) {
      const scrollTop = H * 0.12, scrollH = H * 0.72
      const events = this._getEvents()

      // Left scroll: events
      this._drawParchment(cx, leftX, scrollTop, leftW, scrollH)
      this._drawRoll(cx, leftX, scrollTop, leftW)

      // Write current event text at 35 chars/sec
      const currentEvent = events[this._currentEventIdx]
      if (currentEvent && !this._allEventsWritten) {
        const descLen = (currentEvent.description || '').length
        this._charIndex = Math.min(this._charIndex + dt * 35, descLen)

        if (this._charIndex >= descLen && !this._eventFullyWritten) {
          this._eventFullyWritten = true
          // Auto-advance to next event after a brief pause (0.8s)
          setTimeout(() => {
            if (this._currentEventIdx < events.length - 1) {
              this._currentEventIdx++
              this._charIndex = 0
              this._eventFullyWritten = false
            } else {
              this._allEventsWritten = true
            }
          }, 800)
        }
      }

      // Clip left scroll and draw events
      cx.save()
      cx.beginPath(); cx.rect(leftX, scrollTop, leftW, scrollH); cx.clip()
      const pos = this._drawEventList(cx, leftX, scrollTop, leftW, scrollH, this._currentEventIdx, this._charIndex)
      cx.restore()

      // Quill on left scroll
      if (!this._allEventsWritten && currentEvent) {
        this._drawQuill(cx, pos.qx, pos.qy)
      }

      // Right scroll: map
      this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
      this._drawRoll(cx, rightX, scrollTop, rightW)

      // Map segments = events written so far + terrain progress
      const eventProgress = (this._currentEventIdx + (this._charIndex / Math.max(1, (currentEvent?.description || '').length))) / Math.max(1, events.length)
      const terrainFactor = Math.max(this._progress.terrain, this._t * 0.06) // slow auto-advance
      this._mapProgress = Math.min(1, Math.min(eventProgress, terrainFactor))
      const targetSegs = Math.floor(this._mapProgress * this._pathPoints.length)
      if (this._drawnSegs < targetSegs) this._drawnSegs = Math.min(this._drawnSegs + dt * 2.5, targetSegs)

      cx.save()
      cx.beginPath(); cx.rect(rightX, scrollTop, rightW, scrollH); cx.clip()
      this._drawMap(cx, rightX, scrollTop, rightW, scrollH, Math.floor(this._drawnSegs))
      cx.restore()

      // Quill on map (at trail head)
      if (this._drawnSegs > 0 && this._drawnSegs < this._pathPoints.length) {
        const seg = this._pathPoints[Math.min(Math.floor(this._drawnSegs), this._pathPoints.length - 1)]
        const mapMargin = rightW * 0.1
        this._drawQuill(cx,
          rightX + mapMargin + seg.nx * (rightW - mapMargin * 2),
          scrollTop + 35 + seg.ny * (scrollH - 55)
        )
      }

      // Central ornament
      this._drawCentralOrnament(cx, centerX, scrollTop, scrollH)

      this._drawParticles(cx)

      // Show enter button when all events written AND map mostly drawn
      if (this._allEventsWritten && this._drawnSegs >= this._pathPoints.length - 0.5) {
        this._enterBtn.style.display = 'block'
      }
    }

    // === WAIT_ENTER (player clicks) ===
    else if (s === STATES.WAIT_ENTER) { /* handled by button */ }

    // === DIVE (3s) ===
    else if (s === STATES.DIVE) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      if (this._t < 0.05 && this._onDiveStart) { this._onDiveStart(); this._onDiveStart = null }

      if (t < 0.6) {
        // Zoom into map scroll
        const zoom = 1 + e * 6
        const mapCenterX = (leftX + leftW + gap / 2 + rightX + rightW) / 2
        const mapCenterY = H * 0.48
        cx.save()
        cx.translate(mapCenterX, mapCenterY); cx.scale(zoom, zoom); cx.translate(-mapCenterX, -mapCenterY)
        // Redraw both scrolls during zoom
        const scrollTop = H * 0.12, scrollH = H * 0.72
        this._drawParchment(cx, rightX, scrollTop, rightW, scrollH)
        this._drawMap(cx, rightX, scrollTop, rightW, scrollH, this._pathPoints.length)
        cx.restore()
        // Vignette
        cx.fillStyle = `rgba(0,0,0,${e * 0.7})`
        cx.fillRect(0, 0, W, H * 0.25); cx.fillRect(0, H * 0.75, W, H * 0.25)
      } else {
        // Crossfade to 3D
        const fadeT = (t - 0.6) / 0.4
        this._wrapper.style.opacity = String(1 - fadeT)
        this._wrapper.style.background = 'transparent'
      }

      // Dissolving particles
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

// M.E.R.L.I.N. — Book Cinematic v6
// Canvas 2D overlay — smooth animations, 3D-simulated cover, dive transition

const STATES = {
  APPROACH: 0, BOOK_OPEN: 1, WRITE_PAGE1: 2, WAIT_TURN: 3,
  PAGE_TURN: 4, WRITE_PAGE2: 5, DRAW_MAP: 6, WAIT_START: 7,
  DIVE_ZOOM: 8, DIVE_CROSSFADE: 9, DONE: 10,
}

// Easing functions
const ease = t => 1 - Math.pow(1 - t, 3)
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const bounce = t => {
  if (t < 1/2.75) return 7.5625*t*t
  if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75
  if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375
  return 7.5625*(t-=2.625/2.75)*t+0.984375
}

export class BookCinematic {
  constructor() {
    this._state = STATES.APPROACH
    this._t = 0; this._onComplete = null
    this._progress = { scenario: 0, pathEvents: 0, terrain: 0 }
    this._title = ''; this._introTarget = ''
    this._charIndex = 0; this._page2CharIndex = 0
    this._pathPoints = this._defaultPath()
    this._drawnSegs = 0; this._coverOpen = 0
    this._dustParticles = []
    this._mapZoom = 1; this._mapOpacity = 1

    // Canvas overlay
    this._wrapper = document.createElement('div')
    this._wrapper.style.cssText = 'position:fixed;inset:0;z-index:100;background:#080810;'
    this._cv = document.createElement('canvas')
    this._cv.style.cssText = 'width:100%;height:100%;'
    this._wrapper.appendChild(this._cv)
    document.body.appendChild(this._wrapper)
    this._resize()
    this._resizeHandler = () => this._resize()
    window.addEventListener('resize', this._resizeHandler)
    this._cx = this._cv.getContext('2d')

    // Buttons
    this._turnBtn = this._btn('Tourner la page ▶', '#ffcc44')
    this._turnBtn.addEventListener('click', () => { this._turnBtn.style.display='none'; this._state=STATES.PAGE_TURN; this._t=0 })
    this._startBtn = this._btn('Commencer l\'aventure ▶', '#33ff66')
    this._startBtn.style.fontSize = '18px'; this._startBtn.style.padding = '14px 28px'
    this._startBtn.addEventListener('click', () => { this._startBtn.style.display='none'; this._state=STATES.DIVE_ZOOM; this._t=0 })
    this._skipBtn = this._btn('Passer ▶▶', 'rgba(255,255,255,0.3)')
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
    b.style.cssText = `position:fixed;bottom:36px;left:50%;transform:translateX(-50%);z-index:101;padding:10px 22px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.8);border:2px solid ${color};color:${color};font:15px VT323,monospace;display:none;transition:transform 0.15s;`
    b.addEventListener('mouseenter', () => b.style.transform='translateX(-50%) scale(1.05)')
    b.addEventListener('mouseleave', () => b.style.transform='translateX(-50%) scale(1)')
    this._wrapper.appendChild(b); return b
  }

  _defaultPath() {
    const pts = []; let px = 0.5, py = 0.9
    for (let i = 0; i < 10; i++) {
      const nx = 0.1+Math.random()*0.8, ny = py-0.06-Math.random()*0.03
      pts.push({ x:px, y:py, nx, ny }); px=nx; py=ny
    }
    return pts
  }

  // ─── Callbacks ───
  onTitleReady(t) { if(t) this._title=t; this._progress.scenario=Math.max(this._progress.scenario,0.2) }
  onIntroReady(t) { if(t) this._introTarget=t; this._progress.scenario=Math.max(this._progress.scenario,0.3) }
  onIntroProgress(f) { this._progress.scenario=0.3+f*0.7 }
  onPathReady(events) {
    if(events?.length) { this._pathPoints=[]; let px=0.5,py=0.9; for(const e of events.slice(0,12)) { const nx=0.08+Math.random()*0.84,ny=py-0.05-Math.random()*0.03; this._pathPoints.push({x:px,y:py,nx,ny}); px=nx;py=ny } }
    this._progress.pathEvents=1.0
  }
  onTerrainReady() { this._progress.terrain=1.0 }
  onAssetsReady() {}
  setOnComplete(fn) { this._onComplete=fn }

  // ─── Book geometry (returns bounding rect) ───
  _bookRect() {
    const bw = this._W * 0.52, bh = this._H * 0.42
    return { x: (this._W-bw)/2, y: (this._H-bh)/2 + this._H*0.04, w: bw, h: bh }
  }

  // ─── Draw book ───
  _drawScene(cx, W, H) {
    const b = this._bookRect()
    const co = this._coverOpen // 0=closed, 1=open

    // Ambient glow on pedestal
    const grd = cx.createRadialGradient(W/2, b.y+b.h, 20, W/2, b.y+b.h*0.3, b.w*0.7)
    grd.addColorStop(0, 'rgba(255,200,100,0.06)'); grd.addColorStop(1, 'rgba(0,0,0,0)')
    cx.fillStyle = grd; cx.fillRect(0, 0, W, H)

    // Pedestal
    cx.fillStyle = '#2a2a28'
    cx.beginPath(); cx.ellipse(W/2, b.y+b.h+12, b.w*0.38, 14, 0, 0, Math.PI*2); cx.fill()
    cx.fillStyle = '#353533'; cx.fillRect(W/2-b.w*0.28, b.y+b.h, b.w*0.56, 18)

    // Shadow under book
    cx.fillStyle = 'rgba(0,0,0,0.3)'
    cx.beginPath(); cx.ellipse(W/2, b.y+b.h+5, b.w*0.4, 8, 0, 0, Math.PI*2); cx.fill()

    // Book spine
    cx.fillStyle = '#2a1808'; cx.fillRect(W/2-3, b.y, 6, b.h)

    // LEFT side
    if (co > 0.5) {
      // Page visible
      cx.fillStyle = '#ede4d0'; cx.fillRect(b.x, b.y, b.w/2-3, b.h)
      cx.strokeStyle = '#c0b090'; cx.lineWidth = 0.5; cx.strokeRect(b.x, b.y, b.w/2-3, b.h)
      // Subtle lines
      cx.strokeStyle = 'rgba(160,140,110,0.06)'
      for (let ly = b.y+20; ly < b.y+b.h-10; ly += 14) { cx.beginPath(); cx.moveTo(b.x+10,ly); cx.lineTo(b.x+b.w/2-13,ly); cx.stroke() }
    } else {
      cx.fillStyle = '#4a2a12'; cx.fillRect(b.x, b.y, b.w/2-3, b.h)
    }

    // RIGHT page (always visible when cover > 0.3)
    if (co > 0.3) {
      cx.fillStyle = '#ede4d0'; cx.fillRect(W/2+3, b.y, b.w/2-3, b.h)
      cx.strokeStyle = '#c0b090'; cx.lineWidth = 0.5; cx.strokeRect(W/2+3, b.y, b.w/2-3, b.h)
      cx.strokeStyle = 'rgba(160,140,110,0.06)'
      for (let ly = b.y+20; ly < b.y+b.h-10; ly += 14) { cx.beginPath(); cx.moveTo(W/2+13,ly); cx.lineTo(W/2+b.w/2-10,ly); cx.stroke() }
    }

    // COVER (3D perspective simulation via trapezoid)
    if (co < 1) {
      const coverW = (b.w/2-3) * (1-co)
      const skew = co * b.h * 0.08 // perspective skew
      cx.fillStyle = '#5a3418'
      cx.beginPath()
      cx.moveTo(W/2+3, b.y + skew)
      cx.lineTo(W/2+3+coverW, b.y)
      cx.lineTo(W/2+3+coverW, b.y+b.h)
      cx.lineTo(W/2+3, b.y+b.h - skew)
      cx.closePath(); cx.fill()
      // Highlight on cover edge
      cx.fillStyle = 'rgba(255,220,150,0.06)'
      cx.beginPath()
      cx.moveTo(W/2+3, b.y+skew); cx.lineTo(W/2+3+coverW*0.3, b.y)
      cx.lineTo(W/2+3+coverW*0.3, b.y+b.h); cx.lineTo(W/2+3, b.y+b.h-skew)
      cx.closePath(); cx.fill()
    }

    // Dust particles when opening
    if (co > 0 && co < 1) {
      for (let i = 0; i < 2; i++) this._dustParticles.push({
        x: W/2 + Math.random()*b.w*0.3, y: b.y + Math.random()*b.h,
        vx: (Math.random()-0.5)*0.5, vy: -Math.random()*0.8, life: 1
      })
    }
    this._dustParticles = this._dustParticles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.015
      if (p.life <= 0) return false
      cx.fillStyle = `rgba(255,220,160,${p.life * 0.3})`
      cx.beginPath(); cx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI*2); cx.fill()
      return true
    })

    // Pulsing pedestal light
    const pulse = 0.7 + Math.sin(this._t * 1.5) * 0.3
    const pGrd = cx.createRadialGradient(W/2, b.y+b.h+5, 5, W/2, b.y+b.h-20, b.w*0.4)
    pGrd.addColorStop(0, `rgba(255,200,100,${0.04*pulse})`); pGrd.addColorStop(1, 'rgba(0,0,0,0)')
    cx.fillStyle = pGrd; cx.fillRect(b.x-50, b.y, b.w+100, b.h+50)

    return b
  }

  _drawQuill(cx, x, y) {
    cx.save(); cx.translate(x, y); cx.rotate(-0.4)
    cx.fillStyle = '#ccbb88'; cx.fillRect(-1.5, -22, 3, 26)
    cx.fillStyle = '#111'; cx.beginPath(); cx.moveTo(-2,4); cx.lineTo(2,4); cx.lineTo(0,10); cx.fill()
    cx.fillStyle = 'rgba(240,240,240,0.7)'; cx.beginPath(); cx.ellipse(3,-18,7,12,0.3,0,Math.PI*2); cx.fill()
    cx.restore()
  }

  _writeText(cx, x, y, w, h, title, text, chars, isP2) {
    const m = w*0.07, lh = h*0.026
    let ty = y + (isP2 ? m : m*1.8)
    if (!isP2 && title) {
      cx.fillStyle = '#1a0e04'; cx.font = `bold ${Math.round(h*0.05)}px Georgia,serif`
      cx.textAlign = 'center'; cx.fillText(title, x+w/2, ty); cx.textAlign = 'left'
      ty += lh*1.3; cx.strokeStyle='#8a7040'; cx.lineWidth=0.8; cx.beginPath(); cx.moveTo(x+m*2,ty); cx.lineTo(x+w-m*2,ty); cx.stroke(); ty+=lh*0.8
    }
    cx.fillStyle = '#1a1008'; cx.font = `${Math.round(h*0.034)}px Georgia,serif`
    const vis = text.substring(0, Math.floor(chars)), mw = w-m*2
    let line = ''
    for (const word of vis.split(' ')) {
      const t = line+word+' '
      if (cx.measureText(t).width > mw) { cx.fillText(line.trim(),x+m,ty); line=word+' '; ty+=lh; if(ty>y+h-m) break }
      else line = t
    }
    if (line.trim()) cx.fillText(line.trim(), x+m, ty)
    if (chars < text.length && Math.floor(this._t*3)%2===0) cx.fillRect(x+m+cx.measureText(line.trim()).width+2, ty-h*0.028, 1.5, h*0.032)
    return { lx: x+m+cx.measureText(line.trim()).width, ly: ty }
  }

  _drawMap(cx, x, y, w, h, segs) {
    cx.fillStyle='#3a2a10'; cx.font=`bold ${Math.round(h*0.038)}px Georgia,serif`
    cx.textAlign='center'; cx.fillText('Carte',x+w/2,y+h*0.055); cx.textAlign='left'
    const pts=this._pathPoints, m=w*0.07
    cx.strokeStyle='#4a3a1a'; cx.lineWidth=2; cx.lineCap='round'
    for (let i=0;i<segs&&i<pts.length;i++) {
      const p=pts[i], px1=x+m+p.x*(w-m*2), py1=y+h*0.08+p.y*h*0.85
      const px2=x+m+p.nx*(w-m*2), py2=y+h*0.08+p.ny*h*0.85
      cx.beginPath(); cx.moveTo(px1,py1); cx.quadraticCurveTo((px1+px2)/2+(Math.random()-0.5)*8,(py1+py2)/2,px2,py2); cx.stroke()
      cx.beginPath(); cx.arc(px2,py2,3.5,0,Math.PI*2); cx.fillStyle=i%3===0?'#cc6633':'#2a8a3a'; cx.fill()
      cx.strokeStyle='#4a3a1a'; cx.lineWidth=2
    }
    if (pts.length) { cx.beginPath(); cx.arc(x+m+pts[0].x*(w-m*2),y+h*0.08+pts[0].y*h*0.85,5,0,Math.PI*2); cx.fillStyle='#cc2222'; cx.fill() }
  }

  // ─── Main loop ───
  _animate() {
    const now = performance.now(), dt = Math.min((now-this._lastTime)/1000, 0.05)
    this._lastTime = now; this._t += dt
    if (this._state === STATES.DONE) return

    const cx=this._cx, W=this._W, H=this._H, s=this._state, p=this._progress
    cx.fillStyle='#080810'; cx.fillRect(0,0,W,H)

    // ═══ APPROACH (3s): book rises with bounce ═══
    if (s===STATES.APPROACH) {
      const t=Math.min(1,this._t/3), e=bounce(t)
      cx.save(); cx.translate(0, (1-e)*H*0.3) // slide up
      cx.globalAlpha = Math.min(1, this._t/1.5) // fade in
      this._drawScene(cx, W, H)
      cx.restore(); cx.globalAlpha=1
      if (t>=1) { this._state=STATES.BOOK_OPEN; this._t=0 }
    }

    // ═══ BOOK_OPEN (3s): cover opens with perspective ═══
    else if (s===STATES.BOOK_OPEN) {
      const t=Math.min(1,this._t/3), e=easeIO(t)
      this._coverOpen = e
      this._drawScene(cx, W, H)
      if (t>=1) { this._coverOpen=1; this._charIndex=0; this._state=STATES.WRITE_PAGE1; this._t=0 }
    }

    // ═══ WRITE_PAGE1 (progress-driven) ═══
    else if (s===STATES.WRITE_PAGE1) {
      const b = this._drawScene(cx, W, H)
      const text = this._introTarget || 'La forêt ancienne murmure des secrets oubliés depuis des millénaires. Les sentiers se perdent dans la brume épaisse qui recouvre Brocéliande. Merlin attend quelque part, au cœur du nemeton sacré, là où les pierres se souviennent de tout.'
      const target = Math.floor(Math.min(p.scenario,1)*text.length*0.5)
      if (this._charIndex < target) this._charIndex = Math.min(this._charIndex+dt*45, target)
      const rx=W/2+3, rw=b.w/2-3
      const pos = this._writeText(cx, rx, b.y, rw, b.h, this._title||'Brocéliande', text, this._charIndex, false)
      if (this._charIndex < text.length*0.5) this._drawQuill(cx, pos.lx+8, pos.ly-4)
      if ((this._charIndex>=target && p.scenario>=0.5) || this._t>12) this._turnBtn.style.display='block'
      if (this._t>15) p.scenario=Math.max(p.scenario,0.5)
    }

    // ═══ PAGE_TURN (1.2s) ═══
    else if (s===STATES.PAGE_TURN) {
      const t=Math.min(1,this._t/1.2), e=easeIO(t)
      this._drawScene(cx, W, H)
      // Visual flip: overlay a shrinking rectangle simulating the page turning
      const b = this._bookRect()
      const flipW = (b.w/2-3) * (1-e)
      cx.fillStyle = '#ede4d0'
      cx.beginPath()
      cx.moveTo(W/2+3, b.y + e*b.h*0.03); cx.lineTo(W/2+3+flipW, b.y)
      cx.lineTo(W/2+3+flipW, b.y+b.h); cx.lineTo(W/2+3, b.y+b.h - e*b.h*0.03)
      cx.closePath(); cx.fill()
      if (t>=1) { this._page2CharIndex=0; this._state=STATES.WRITE_PAGE2; this._t=0 }
    }

    // ═══ WRITE_PAGE2 (progress-driven) ═══
    else if (s===STATES.WRITE_PAGE2) {
      const b = this._drawScene(cx, W, H)
      const text = this._introTarget || ''
      const half = Math.floor(text.length*0.5), p2 = text.substring(half)
      const target = Math.floor(Math.min(p.scenario,1)*p2.length)
      if (this._page2CharIndex<target) this._page2CharIndex=Math.min(this._page2CharIndex+dt*45,target)
      this._writeText(cx, b.x, b.y, b.w/2-3, b.h, '', p2, this._page2CharIndex, true)
      const pos2 = this._writeText(cx, b.x, b.y, b.w/2-3, b.h, '', p2, this._page2CharIndex, true)
      if (this._page2CharIndex<p2.length) this._drawQuill(cx, pos2.lx+8, pos2.ly-4)
      if ((this._page2CharIndex>=p2.length && p.scenario>=1) || this._t>10) { this._state=STATES.DRAW_MAP; this._t=0; this._drawnSegs=0 }
    }

    // ═══ DRAW_MAP (progress-driven) ═══
    else if (s===STATES.DRAW_MAP) {
      const b = this._drawScene(cx, W, H)
      const total=this._pathPoints.length, ts=Math.floor(p.pathEvents*total)
      if (this._drawnSegs<ts) this._drawnSegs=Math.min(this._drawnSegs+dt*3,ts)
      if (this._t>6&&this._drawnSegs<total) this._drawnSegs=total
      // Left page text
      const text=this._introTarget||'', half=Math.floor(text.length*0.5)
      this._writeText(cx, b.x, b.y, b.w/2-3, b.h, '', text.substring(half), 9999, true)
      // Right page map
      this._drawMap(cx, W/2+3, b.y, b.w/2-3, b.h, Math.floor(this._drawnSegs))
      if (this._drawnSegs<total) {
        const seg=this._pathPoints[Math.min(Math.floor(this._drawnSegs),total-1)]
        this._drawQuill(cx, W/2+3+(b.w/2-3)*0.07+seg.nx*(b.w/2-3)*0.86, b.y+b.h*0.08+seg.ny*b.h*0.85)
      }
      if (this._drawnSegs>=total) { this._startBtn.style.display='block'; this._state=STATES.WAIT_START; this._t=0 }
    }

    // ═══ WAIT_START ═══
    else if (s===STATES.WAIT_START) {
      const b = this._drawScene(cx, W, H)
      const text=this._introTarget||'', half=Math.floor(text.length*0.5)
      this._writeText(cx, b.x, b.y, b.w/2-3, b.h, '', text.substring(half), 9999, true)
      this._drawMap(cx, W/2+3, b.y, b.w/2-3, b.h, this._pathPoints.length)
    }

    // ═══ DIVE_ZOOM (1.5s): zoom into the map page ═══
    else if (s===STATES.DIVE_ZOOM) {
      const t=Math.min(1,this._t/1.5), e=easeIO(t)
      const b = this._bookRect()
      // Zoom: scale canvas around map center
      const mapCx_x = W/2 + 3 + (b.w/2-3)/2
      const mapCy_y = b.y + b.h/2
      cx.save()
      const scale = 1 + e * 4 // 1x → 5x zoom
      cx.translate(mapCx_x, mapCy_y)
      cx.scale(scale, scale)
      cx.translate(-mapCx_x, -mapCy_y)
      this._drawScene(cx, W, H)
      this._drawMap(cx, W/2+3, b.y, b.w/2-3, b.h, this._pathPoints.length)
      cx.restore()
      // Vignette darkening edges
      cx.fillStyle = `rgba(0,0,0,${e*0.5})`
      cx.fillRect(0,0,W,H*0.3); cx.fillRect(0,H*0.7,W,H*0.3)
      cx.fillRect(0,0,W*0.2,H); cx.fillRect(W*0.8,0,W*0.2,H)
      if (t>=1) { this._state=STATES.DIVE_CROSSFADE; this._t=0 }
    }

    // ═══ DIVE_CROSSFADE (2s): fade to black → game takes over ═══
    else if (s===STATES.DIVE_CROSSFADE) {
      const t=Math.min(1,this._t/2), e=ease(t)
      cx.fillStyle = `rgba(0,0,0,${e})`; cx.fillRect(0,0,W,H)
      // "Diving" text
      if (e < 0.7) {
        cx.globalAlpha = 1-e*1.4
        cx.fillStyle = '#33ff66'; cx.font = `${Math.round(H*0.025)}px Georgia,serif`
        cx.textAlign = 'center'; cx.fillText('Vous plongez dans la forêt...', W/2, H/2)
        cx.textAlign = 'left'; cx.globalAlpha = 1
      }
      if (t>=1) { this._state=STATES.DONE; this._cleanup(); this._onComplete?.() }
    }

    this._raf = requestAnimationFrame(() => this._animate())
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state===STATES.DONE }

  _cleanup() {
    this._state = STATES.DONE
    cancelAnimationFrame(this._raf)
    window.removeEventListener('resize', this._resizeHandler)
    this._wrapper?.remove()
  }
}

// M.E.R.L.I.N. — Scroll Cinematic v7
// Ancient scroll unrolls, quill writes scenario, map draws = world loading
// NO timers for progression — player clicks to advance

const STATES = {
  SCROLL_APPEAR: 0,  // scroll materializes from darkness
  SCROLL_UNROLL: 1,  // scroll unrolls top→bottom revealing parchment
  WRITE_SCENARIO: 2, // quill writes title + 15 lines (progress-driven by LLM)
  WAIT_CONTINUE: 3,  // player clicks "Continuer"
  DRAW_MAP: 4,       // scroll extends, map section draws (= world loading)
  WAIT_ENTER: 5,     // player clicks "Entrer dans la forêt"
  DIVE: 6,           // zoom into map, crossfade to 3D
  DONE: 7,
}

const ease = t => 1 - Math.pow(1 - t, 3)
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const bounce = t => { const n=7.5625,d=2.75; if(t<1/d) return n*t*t; if(t<2/d) return n*(t-=1.5/d)*t+.75; if(t<2.5/d) return n*(t-=2.25/d)*t+.9375; return n*(t-=2.625/d)*t+.984375 }

export class BookCinematic {
  constructor() {
    this._state = STATES.SCROLL_APPEAR
    this._t = 0
    this._onComplete = null; this._onDiveStart = null
    this._progress = { scenario: 0, pathEvents: 0, terrain: 0 }
    this._title = ''
    this._introTarget = ''
    this._fallbackIntro = 'Les brumes de Brocéliande se lèvent lentement, dévoilant les racines noueuses des chênes millénaires. Au loin, entre les troncs, une lueur ambre pulse — le Nemeton, cœur sacré de la forêt. Les korrigans ont laissé des traces dans la rosée. Le sentier s\'ouvre devant toi, étroit et sinueux. Merlin murmure dans le vent: "Les signes de la forêt te guideront, mais chaque choix porte son ombre." Il n\'y a pas de retour possible. La mousse épaisse étouffe tes pas. Des champignons phosphorescents dessinent un chemin entre les pierres dressées. Un corbeau t\'observe depuis un chêne centenaire, ses yeux brillent d\'une intelligence surnaturelle. L\'air sent la terre humide et le thym sauvage. Quelque part, le bruit d\'un ruisseau qui murmure des énigmes anciennes. Les menhirs se dressent comme des sentinelles immobiles, gardiens d\'un monde que peu d\'hommes connaissent encore.'
    this._charIndex = 0
    this._pathPoints = this._defaultPath()
    this._drawnSegs = 0
    this._unrollProgress = 0 // 0=rolled, 1=fully unrolled
    this._mapUnrollProgress = 0
    this._particles = []
    this._scrollY = 0 // vertical scroll position

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

    // Buttons (ALL hidden by default, shown only when needed)
    this._continueBtn = this._btn('Continuer ▶', '#ffcc44')
    this._continueBtn.addEventListener('click', () => {
      this._continueBtn.style.display = 'none'
      this._state = STATES.DRAW_MAP; this._t = 0; this._drawnSegs = 0; this._mapUnrollProgress = 0
    })
    this._enterBtn = this._btn('Entrer dans la forêt ▶', '#33ff66')
    this._enterBtn.style.fontSize = '18px'; this._enterBtn.style.padding = '14px 28px'
    this._enterBtn.addEventListener('click', () => {
      this._enterBtn.style.display = 'none'
      this._state = STATES.DIVE; this._t = 0
    })
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
    b.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:101;padding:10px 22px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.8);border:2px solid ${color};color:${color};font:15px VT323,monospace;display:none;transition:transform 0.15s,box-shadow 0.15s;`
    b.addEventListener('mouseenter', () => { b.style.transform='translateX(-50%) scale(1.05)'; b.style.boxShadow=`0 0 15px ${color}44` })
    b.addEventListener('mouseleave', () => { b.style.transform='translateX(-50%) scale(1)'; b.style.boxShadow='none' })
    this._wrapper.appendChild(b); return b
  }

  _defaultPath() {
    const pts = []; let py = 0.85
    const cx = 0.5 // center line
    for (let i = 0; i < 12; i++) {
      const nx = cx + Math.sin(i * 0.8) * 0.25 // smooth sine wave path
      const ny = py - 0.055
      pts.push({ x: i===0 ? cx : pts[pts.length-1].nx, y: py, nx, ny })
      py = ny
    }
    return pts
  }

  // ─── Callbacks ───
  onTitleReady(t) { if(t) this._title=t; this._progress.scenario=Math.max(this._progress.scenario,0.15) }
  onIntroReady(t) { if(t) this._introTarget=t; this._progress.scenario=Math.max(this._progress.scenario,0.25) }
  onIntroProgress(f) { this._progress.scenario=0.25+f*0.75 }
  onPathReady(events) {
    if(events?.length) {
      this._pathPoints=[]; let py=0.85; const cx=0.5
      for(let i=0;i<Math.min(events.length,12);i++) {
        const nx=cx+Math.sin(i*0.8)*0.25, ny=py-0.055
        this._pathPoints.push({x:i===0?cx:this._pathPoints[this._pathPoints.length-1].nx,y:py,nx,ny}); py=ny
      }
    }
    this._progress.pathEvents=1.0
  }
  onTerrainReady() { this._progress.terrain=1.0 }
  onAssetsReady() {}
  setOnComplete(fn) { this._onComplete=fn }
  setOnDiveStart(fn) { this._onDiveStart=fn }

  // ─── Drawing ───
  _drawParchment(cx, x, y, w, h) {
    // Parchment background with aged gradient
    const grad = cx.createLinearGradient(x, y, x, y+h)
    grad.addColorStop(0, '#e0d4b4'); grad.addColorStop(0.1, '#ede4d0')
    grad.addColorStop(0.9, '#ede4d0'); grad.addColorStop(1, '#dcd0b0')
    cx.fillStyle = grad; cx.fillRect(x, y, w, h)
    // Age spots
    for (let i = 0; i < 8; i++) {
      cx.fillStyle = `rgba(170,150,110,0.05)`
      cx.beginPath(); cx.arc(x+Math.random()*w, y+Math.random()*h, 5+Math.random()*15, 0, Math.PI*2); cx.fill()
    }
    // Edge burn
    cx.fillStyle = 'rgba(140,120,80,0.06)'
    cx.fillRect(x, y, w, 3); cx.fillRect(x, y+h-3, w, 3)
    cx.fillRect(x, y, 3, h); cx.fillRect(x+w-3, y, 3, h)
    // Border
    cx.strokeStyle = 'rgba(120,100,70,0.2)'; cx.lineWidth = 1; cx.strokeRect(x+1, y+1, w-2, h-2)
  }

  _drawRoll(cx, x, y, w) {
    // Rolled parchment cylinder at top
    const rollH = 14
    const grad = cx.createLinearGradient(x, y-rollH, x, y)
    grad.addColorStop(0, '#c0b090'); grad.addColorStop(0.3, '#e0d4b8')
    grad.addColorStop(0.7, '#d0c4a8'); grad.addColorStop(1, '#b0a080')
    cx.fillStyle = grad; cx.fillRect(x-5, y-rollH, w+10, rollH)
    // Shadow below roll
    cx.fillStyle = 'rgba(0,0,0,0.15)'; cx.fillRect(x, y, w, 4)
  }

  _writeText(cx, x, y, w, maxChars) {
    const text = this._introTarget || this._fallbackIntro
    const title = this._title || 'Brocéliande'
    const chars = Math.min(Math.floor(maxChars), text.length)
    const visible = text.substring(0, chars)
    const margin = w * 0.08, lineH = 18

    // Title (separate, above text)
    let ty = y + 30
    cx.fillStyle = '#1a0e04'; cx.font = `bold ${Math.round(w*0.045)}px Georgia,serif`
    cx.textAlign = 'center'; cx.fillText(title, x+w/2, ty); cx.textAlign = 'left'
    ty += 8
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 0.8
    cx.beginPath(); cx.moveTo(x+margin*2, ty); cx.lineTo(x+w-margin*2, ty); cx.stroke()
    ty += 20

    // Body text — wraps properly
    cx.fillStyle = '#1a1008'; cx.font = `${Math.round(w*0.028)}px Georgia,serif`
    const words = visible.split(' ')
    let line = '', maxW = w - margin*2, lastX = x+margin, lastY = ty
    for (const word of words) {
      const test = line + word + ' '
      if (cx.measureText(test).width > maxW) {
        cx.fillText(line.trim(), x+margin, ty)
        lastX = x+margin+cx.measureText(line.trim()).width; lastY = ty
        line = word + ' '; ty += lineH
      } else { line = test }
    }
    if (line.trim()) {
      cx.fillText(line.trim(), x+margin, ty)
      lastX = x+margin+cx.measureText(line.trim()).width; lastY = ty
    }

    // Blinking cursor
    if (chars < text.length && Math.floor(this._t*3)%2===0) {
      cx.fillRect(lastX+2, lastY-12, 1.5, 14)
    }

    return { qx: lastX+8, qy: lastY-4, textBottom: ty+20 }
  }

  _drawMapSection(cx, x, y, w, h, segs) {
    // Map title
    cx.fillStyle = '#3a2a10'; cx.font = `bold ${Math.round(w*0.035)}px Georgia,serif`
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', x+w/2, y+20); cx.textAlign = 'left'

    // Compass
    cx.fillStyle = '#7a6a50'; cx.font = '10px serif'
    cx.textAlign = 'center'; cx.fillText('N', x+w-20, y+15)
    cx.beginPath(); cx.moveTo(x+w-20, y+18); cx.lineTo(x+w-23, y+28); cx.lineTo(x+w-17, y+28); cx.closePath()
    cx.fillStyle = '#8a7a60'; cx.fill(); cx.textAlign = 'left'

    // Path — smooth Bézier curves (NO random jitter)
    const pts = this._pathPoints, margin = w*0.1
    cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5; cx.lineCap = 'round'; cx.lineJoin = 'round'

    for (let i = 0; i < segs && i < pts.length; i++) {
      const p = pts[i]
      const px1 = x+margin+p.x*(w-margin*2), py1 = y+30+p.y*(h-50)
      const px2 = x+margin+p.nx*(w-margin*2), py2 = y+30+p.ny*(h-50)
      const cpx = (px1+px2)/2, cpy = (py1+py2)/2
      cx.beginPath(); cx.moveTo(px1, py1)
      cx.quadraticCurveTo(cpx, cpy, px2, py2)
      cx.stroke()
      // Event rune
      cx.beginPath(); cx.arc(px2, py2, 4, 0, Math.PI*2)
      cx.fillStyle = i%3===0 ? '#cc6633' : '#2a8a3a'; cx.fill()
      // Glow
      cx.beginPath(); cx.arc(px2, py2, 8, 0, Math.PI*2)
      cx.strokeStyle = `rgba(${i%3===0?'200,100,50':'50,140,60'},0.2)`; cx.lineWidth=1; cx.stroke()
      cx.strokeStyle = '#4a3a1a'; cx.lineWidth = 2.5
    }
    // Start marker
    if (pts.length>0) {
      const sp = pts[0]
      cx.beginPath(); cx.arc(x+margin+sp.x*(w-margin*2), y+30+sp.y*(h-50), 6, 0, Math.PI*2)
      cx.fillStyle='#cc2222'; cx.fill()
      cx.fillStyle='#fff'; cx.font='bold 7px sans-serif'; cx.textAlign='center'
      cx.fillText('▶', x+margin+sp.x*(w-margin*2), y+30+sp.y*(h-50)+2.5)
      cx.textAlign='left'
    }
  }

  _drawQuill(cx, x, y) {
    cx.save(); cx.translate(x,y); cx.rotate(-0.4)
    cx.fillStyle='#ccbb88'; cx.fillRect(-1.5,-22,3,26)
    cx.fillStyle='#111'; cx.beginPath(); cx.moveTo(-2,4); cx.lineTo(2,4); cx.lineTo(0,10); cx.fill()
    cx.fillStyle='rgba(240,240,240,0.7)'; cx.beginPath(); cx.ellipse(3,-18,7,12,0.3,0,Math.PI*2); cx.fill()
    cx.restore()
  }

  // ─── Particles ───
  _spawnParticles(count, x, y, type) {
    for (let i=0;i<count;i++) this._particles.push({
      x: x+(Math.random()-0.5)*40, y, vx:(Math.random()-0.5)*0.6, vy:-0.3-Math.random()*0.8,
      life:1, type, size:1+Math.random()*2.5
    })
  }

  _drawParticles(cx) {
    if (Math.random()>0.9) this._spawnParticles(1, this._W/2+(Math.random()-0.5)*this._W*0.4, this._H*0.8, 'firefly')
    this._particles = this._particles.filter(p => {
      p.x+=p.vx; p.y+=p.vy; p.life-=(p.type==='firefly'?0.004:0.02)
      if(p.life<=0) return false
      if(p.type==='spark') {
        cx.fillStyle=`rgba(255,200,80,${p.life*0.5})`; cx.beginPath(); cx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); cx.fill()
        cx.fillStyle=`rgba(255,180,50,${p.life*0.12})`; cx.beginPath(); cx.arc(p.x,p.y,p.size*p.life*3,0,Math.PI*2); cx.fill()
      } else {
        const f=0.5+Math.sin(this._t*8+p.x)*0.5
        cx.fillStyle=`rgba(200,255,150,${p.life*0.25*f})`; cx.beginPath(); cx.arc(p.x,p.y,p.size*f,0,Math.PI*2); cx.fill()
      }
      return true
    })
  }

  // ─── Main loop ───
  _animate() {
    const now = performance.now(), dt = Math.min((now-this._lastTime)/1000, 0.05)
    this._lastTime = now; this._t += dt
    if (this._state===STATES.DONE) return

    const cx=this._cx, W=this._W, H=this._H, s=this._state, p=this._progress
    cx.fillStyle='#080810'; cx.fillRect(0,0,W,H)

    const scrollW = W*0.45, scrollX = (W-scrollW)/2

    // ═══ SCROLL_APPEAR (2s) ═══
    if (s===STATES.SCROLL_APPEAR) {
      const t=Math.min(1,this._t/2), e=bounce(t)
      cx.globalAlpha = Math.min(1, this._t/1.2)
      const sy = H*0.15 + (1-e)*H*0.2
      this._drawRoll(cx, scrollX, sy, scrollW)
      this._drawParticles(cx)
      this._spawnParticles(2, W/2, sy, 'spark')
      cx.globalAlpha=1
      if (t>=1) { this._state=STATES.SCROLL_UNROLL; this._t=0; this._unrollProgress=0 }
    }

    // ═══ SCROLL_UNROLL (3s) ═══
    else if (s===STATES.SCROLL_UNROLL) {
      const t=Math.min(1,this._t/3), e=easeIO(t)
      this._unrollProgress = e
      const scrollTop = H*0.12
      const scrollH = e * H * 0.65 // grows as it unrolls
      this._drawParchment(cx, scrollX, scrollTop, scrollW, scrollH)
      this._drawRoll(cx, scrollX, scrollTop, scrollW) // roll at top
      // Bottom roll (unrolling)
      if (e < 1) {
        const botRollY = scrollTop + scrollH
        this._drawRoll(cx, scrollX, botRollY+12, scrollW)
      }
      this._drawParticles(cx)
      if (t>=1) { this._charIndex=0; this._state=STATES.WRITE_SCENARIO; this._t=0 }
    }

    // ═══ WRITE_SCENARIO (progress-driven — NO timer) ═══
    else if (s===STATES.WRITE_SCENARIO) {
      const scrollTop = H*0.12, scrollH = H*0.65
      this._drawParchment(cx, scrollX, scrollTop, scrollW, scrollH)
      this._drawRoll(cx, scrollX, scrollTop, scrollW)

      const text = this._introTarget || this._fallbackIntro
      const targetChars = Math.floor(Math.min(p.scenario, 1) * text.length)
      if (this._charIndex < targetChars) this._charIndex = Math.min(this._charIndex + dt*45, targetChars)

      const pos = this._writeText(cx, scrollX, scrollTop, scrollW, this._charIndex)
      if (this._charIndex < text.length) this._drawQuill(cx, pos.qx, pos.qy)

      // Quill trembles when waiting
      if (this._charIndex >= targetChars && p.scenario < 1) {
        this._drawQuill(cx, pos.qx + Math.sin(this._t*15)*3, pos.qy + Math.cos(this._t*12)*2)
      }

      this._drawParticles(cx)

      // Show continue button ONLY when text is fully written
      if (this._charIndex >= text.length || (p.scenario >= 1 && this._charIndex >= targetChars)) {
        this._continueBtn.style.display = 'block'
      }
    }

    // ═══ WAIT_CONTINUE (player clicks) ═══
    else if (s===STATES.WAIT_CONTINUE) { /* handled by button */ }

    // ═══ DRAW_MAP (progress-driven by terrain loading — NO timer) ═══
    else if (s===STATES.DRAW_MAP) {
      const scrollTop = H*0.12
      // Text section (scrolled up / compressed)
      const textH = H*0.3
      this._drawParchment(cx, scrollX, scrollTop, scrollW, textH)
      this._drawRoll(cx, scrollX, scrollTop, scrollW)
      // Compressed text (title + first few lines)
      cx.save(); cx.beginPath(); cx.rect(scrollX, scrollTop, scrollW, textH); cx.clip()
      const text = this._introTarget || this._fallbackIntro
      cx.fillStyle='#1a0e04'; cx.font=`bold ${Math.round(scrollW*0.04)}px Georgia,serif`
      cx.textAlign='center'; cx.fillText(this._title||'Brocéliande', scrollX+scrollW/2, scrollTop+25); cx.textAlign='left'
      cx.fillStyle='#1a1008'; cx.font=`${Math.round(scrollW*0.022)}px Georgia,serif`
      // First 200 chars compressed
      const short = text.substring(0, 200).split(' ')
      let line='', ty=scrollTop+45
      for (const w of short) { const t=line+w+' '; if(cx.measureText(t).width>scrollW*0.84){cx.fillText(line.trim(),scrollX+scrollW*0.08,ty);line=w+' ';ty+=14}else line=t }
      if(line.trim()) cx.fillText(line.trim(),scrollX+scrollW*0.08,ty)
      cx.restore()

      // Map section (below text)
      const mapTop = scrollTop + textH + 10
      const mapH = H*0.45
      // Map unrolls as terrain loads
      const terrainProg = Math.max(p.terrain, this._t * 0.08) // slow auto if terrain slow
      this._mapUnrollProgress = Math.min(1, terrainProg)
      const visibleMapH = mapH * this._mapUnrollProgress

      if (visibleMapH > 10) {
        this._drawParchment(cx, scrollX, mapTop, scrollW, visibleMapH)
        // Path segments = terrain progress
        const totalSegs = this._pathPoints.length
        const targetSegs = Math.floor(this._mapUnrollProgress * totalSegs)
        if (this._drawnSegs < targetSegs) this._drawnSegs = Math.min(this._drawnSegs + dt*2.5, targetSegs)
        this._drawMapSection(cx, scrollX, mapTop, scrollW, visibleMapH, Math.floor(this._drawnSegs))

        if (this._drawnSegs < totalSegs) {
          const seg = this._pathPoints[Math.min(Math.floor(this._drawnSegs), totalSegs-1)]
          this._drawQuill(cx, scrollX+scrollW*0.1+seg.nx*(scrollW*0.8), mapTop+30+seg.ny*visibleMapH*0.85)
        }
      }

      // Bottom roll
      if (this._mapUnrollProgress < 1) {
        this._drawRoll(cx, scrollX, mapTop+visibleMapH+12, scrollW)
      }

      this._drawParticles(cx)

      // Show enter button ONLY when map fully drawn
      if (this._drawnSegs >= this._pathPoints.length && this._mapUnrollProgress >= 0.95) {
        this._enterBtn.style.display = 'block'
      }
    }

    // ═══ WAIT_ENTER (player clicks) ═══
    else if (s===STATES.WAIT_ENTER) { /* handled by button */ }

    // ═══ DIVE (3s) ═══
    else if (s===STATES.DIVE) {
      const t=Math.min(1,this._t/3), e=easeIO(t)
      // Trigger 3D scene at start
      if (this._t < 0.05 && this._onDiveStart) { this._onDiveStart(); this._onDiveStart=null }
      // Zoom into map + fade overlay
      if (t < 0.6) {
        // Zoom phase
        const zoom = 1 + e * 8
        const mapCenterX = this._W/2, mapCenterY = this._H * 0.55
        cx.save()
        cx.translate(mapCenterX, mapCenterY); cx.scale(zoom, zoom); cx.translate(-mapCenterX, -mapCenterY)
        // Draw compressed map
        const scrollTop=this._H*0.12, textH=this._H*0.3, mapTop=scrollTop+textH+10
        this._drawParchment(cx, (this._W-this._W*0.45)/2, mapTop, this._W*0.45, this._H*0.45)
        this._drawMapSection(cx, (this._W-this._W*0.45)/2, mapTop, this._W*0.45, this._H*0.45, this._pathPoints.length)
        cx.restore()
        // Vignette
        cx.fillStyle=`rgba(0,0,0,${e*0.7})`
        cx.fillRect(0,0,W,H*0.25); cx.fillRect(0,H*0.75,W,H*0.25)
      } else {
        // Crossfade to 3D
        const fadeT = (t-0.6)/0.4
        this._wrapper.style.opacity = String(1-fadeT)
        this._wrapper.style.background = 'transparent'
      }

      // Dissolving particles
      if (t > 0.3) this._spawnParticles(3, W/2+(Math.random()-0.5)*W*0.3, H/2+(Math.random()-0.5)*H*0.3, 'spark')
      this._drawParticles(cx)

      if (t>=1) { this._state=STATES.DONE; this._cleanup(); this._onComplete?.() }
    }

    this._raf = requestAnimationFrame(() => this._animate())
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state===STATES.DONE }

  _cleanup() {
    this._state=STATES.DONE; cancelAnimationFrame(this._raf)
    window.removeEventListener('resize',this._resizeHandler)
    this._wrapper?.remove()
  }
}

// M.E.R.L.I.N. — Book Cinematic v4
// Pedestal + book + quill writes + page turn + map draws + fall into world

import * as THREE from 'three'

const STATES = {
  APPROACH: 0,       // camera approaches pedestal
  BOOK_OPEN: 1,      // cover opens, reveals RIGHT page
  WRITE_PAGE1: 2,    // quill writes scenario on RIGHT page
  WAIT_TURN: 3,      // player clicks to turn page
  PAGE_TURN: 4,      // page flips right→left
  WRITE_PAGE2: 5,    // scenario continues on LEFT page
  DRAW_MAP: 6,       // quill draws path on RIGHT page
  WAIT_START: 7,     // "Commencer" button
  ORBIT_MAP: 8,      // camera orbits above map page
  FALL_IN: 9,        // fall into the map → transition
  DONE: 10,
}

const ease = t => 1 - Math.pow(1 - t, 3)
const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2

export class BookCinematic {
  constructor(scene, camera) {
    this._scene = scene
    this._camera = camera
    this._state = STATES.APPROACH
    this._t = 0
    this._onComplete = null

    // Progress
    this._progress = { scenario: 0, pathEvents: 0, terrain: 0 }
    this._title = ''
    this._introText = ''
    this._introTarget = ''
    this._charIndex = 0
    this._page2CharIndex = 0
    this._pathPoints = this._defaultPath()
    this._drawnSegs = 0

    this._group = new THREE.Group()
    this._scene.add(this._group)
    this._build()
  }

  _defaultPath() {
    const pts = []; let px = 256, py = 660
    for (let i = 0; i < 10; i++) {
      const nx = 60 + Math.random() * 400, ny = py - 40 - Math.random() * 25
      pts.push({ x: px, y: py, nx, ny }); px = nx; py = ny
    }
    return pts
  }

  _build() {
    // ─── PEDESTAL ───
    const pedGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8)
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.6, metalness: 0.2 })
    this._pedestal = new THREE.Mesh(pedGeo, pedMat)
    this._pedestal.position.y = -0.6
    this._group.add(this._pedestal)

    // Pedestal light (warm glow from below)
    const pedLight = new THREE.PointLight(0xffcc66, 3, 5)
    pedLight.position.set(0, 0.5, 0)
    this._group.add(pedLight)

    // Spot from above
    const spot = new THREE.SpotLight(0xffeedd, 2, 8, 0.5, 0.5)
    spot.position.set(0, 4, 0)
    spot.target = this._pedestal
    this._group.add(spot)

    this._group.add(new THREE.AmbientLight(0x222222, 0.5))

    // ─── BOOK (on pedestal, no title — worn leather) ───
    const bookBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.1, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x3a2815, roughness: 0.9 })
    )
    bookBase.position.y = 0.05
    this._group.add(bookBase)

    // Cover (pivots left edge)
    this._coverPivot = new THREE.Group()
    this._coverPivot.position.set(-1.4, 0.06, 0)
    this._cover = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.04, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.85 })
    )
    this._cover.position.set(1.4, 0, 0)
    this._coverPivot.add(this._cover)
    this._group.add(this._coverPivot)

    // ─── RIGHT PAGE (first: scenario text, then: map after turn) ───
    this._rCv = document.createElement('canvas'); this._rCv.width = 512; this._rCv.height = 720
    this._rCx = this._rCv.getContext('2d')
    this._rTex = new THREE.CanvasTexture(this._rCv)
    this._pageR = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.85),
      new THREE.MeshBasicMaterial({ map: this._rTex })
    )
    this._pageR.rotation.x = -Math.PI / 2
    this._pageR.position.set(0.7, 0.07, 0)
    this._pageR.visible = false
    this._group.add(this._pageR)

    // ─── LEFT PAGE (visible after page turn — scenario continues) ───
    this._lCv = document.createElement('canvas'); this._lCv.width = 512; this._lCv.height = 720
    this._lCx = this._lCv.getContext('2d')
    this._lTex = new THREE.CanvasTexture(this._lCv)
    this._pageL = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.85),
      new THREE.MeshBasicMaterial({ map: this._lTex })
    )
    this._pageL.rotation.x = -Math.PI / 2
    this._pageL.position.set(-0.7, 0.07, 0)
    this._pageL.visible = false
    this._group.add(this._pageL)

    // ─── QUILL ───
    const q = new THREE.Group()
    q.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x111111 })), { position: new THREE.Vector3(0, -0.04, 0) }))
    q.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0xccbb88 })), { position: new THREE.Vector3(0, 0.14, 0) }))
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.2), new THREE.MeshBasicMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }))
    f.position.set(0.03, 0.28, 0); f.rotation.z = 0.3; q.add(f)
    this._quill = q; this._quill.visible = false
    this._quill.rotation.x = -0.5; this._quill.rotation.z = 0.2
    this._group.add(this._quill)

    // ─── Initial camera: far back, looking at pedestal ───
    this._camera.position.set(0, 2, 5)
    this._camera.lookAt(0, 0.5, 0)

    // ─── DOM buttons ───
    this._turnBtn = this._btn('Tourner la page ▶', 'bottom:40px;left:50%;transform:translateX(-50%);display:none;border:1px solid #ffcc44;color:#ffcc44;', () => {
      this._turnBtn.style.display = 'none'; this._state = STATES.PAGE_TURN; this._t = 0
    })
    this._startBtn = this._btn('Commencer l\'aventure ▶', 'bottom:40px;left:50%;transform:translateX(-50%);display:none;border:2px solid #33ff66;color:#33ff66;font-size:16px;padding:12px 24px;', () => {
      this._startBtn.style.display = 'none'; this._state = STATES.ORBIT_MAP; this._t = 0
    })
    this._skipBtn = this._btn('Passer ▶▶', 'bottom:16px;right:16px;', () => this.skip())
  }

  _btn(text, extra, onClick) {
    const b = document.createElement('button'); b.textContent = text
    b.style.cssText = `position:fixed;z-index:200;padding:10px 18px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.7);font:14px VT323,monospace;${extra}`
    b.addEventListener('click', onClick); document.body.appendChild(b); return b
  }

  // ─── Progress callbacks ───
  onTitleReady(t) { if (t) this._title = t; this._progress.scenario = Math.max(this._progress.scenario, 0.2) }
  onIntroReady(t) { if (t) this._introTarget = t; this._progress.scenario = Math.max(this._progress.scenario, 0.3) }
  onIntroProgress(f) { this._progress.scenario = 0.3 + f * 0.7 }
  onPathReady(events) {
    if (events?.length) {
      this._pathPoints = []; let px = 256, py = 660
      for (const ev of events.slice(0, 12)) {
        const nx = 50 + Math.random() * 410, ny = py - 35 - Math.random() * 25
        this._pathPoints.push({ x: px, y: py, nx, ny }); px = nx; py = ny
      }
    }
    this._progress.pathEvents = 1.0
  }
  onTerrainReady() { this._progress.terrain = 1.0 }
  onAssetsReady() {}
  setOnComplete(fn) { this._onComplete = fn }

  // ─── Canvas ───
  _blankPage(cx) {
    cx.fillStyle = '#ede4d0'; cx.fillRect(0, 0, 512, 720)
    cx.strokeStyle = 'rgba(140,120,90,0.08)'; cx.lineWidth = 0.5
    for (let y = 60; y < 700; y += 20) { cx.beginPath(); cx.moveTo(30, y); cx.lineTo(482, y); cx.stroke() }
  }

  _writeText(cx, tex, title, text, maxChars) {
    this._blankPage(cx)
    const n = Math.min(Math.floor(maxChars), text.length)
    // Title
    if (title) {
      cx.fillStyle = '#2a1a08'; cx.font = 'bold 22px Georgia,serif'
      cx.textAlign = 'center'; cx.fillText(title, 256, 42); cx.textAlign = 'left'
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(80, 52); cx.lineTo(432, 52); cx.stroke()
    }
    // Body
    cx.fillStyle = '#1a1208'; cx.font = '14px Georgia,serif'
    const words = text.substring(0, n).split(' ')
    let line = '', y = 72
    for (const w of words) {
      const t = line + w + ' '
      if (cx.measureText(t).width > 440) { cx.fillText(line.trim(), 35, y); line = w + ' '; y += 20; if (y > 710) break }
      else line = t
    }
    if (line.trim()) cx.fillText(line.trim(), 35, y)
    // Cursor
    if (n < text.length) cx.fillRect(35 + cx.measureText(line.trim()).width + 2, y - 10, 1.5, 12)
    tex.needsUpdate = true
  }

  _drawMap(cx, tex, segs) {
    this._blankPage(cx)
    const pts = this._pathPoints
    cx.fillStyle = '#5a4a30'; cx.font = 'bold 14px Georgia,serif'
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', 256, 30); cx.textAlign = 'left'
    cx.strokeStyle = '#4a3a20'; cx.lineWidth = 2.5; cx.lineCap = 'round'
    for (let i = 0; i < segs && i < pts.length; i++) {
      const p = pts[i]
      cx.beginPath(); cx.moveTo(p.x, p.y)
      cx.quadraticCurveTo((p.x+p.nx)/2 + (Math.random()-0.5)*15, (p.y+p.ny)/2, p.nx, p.ny)
      cx.stroke()
      cx.beginPath(); cx.arc(p.nx, p.ny, 4, 0, Math.PI*2)
      cx.fillStyle = i%3===0 ? '#cc6633' : '#2a8a3a'; cx.fill()
      cx.strokeStyle = '#4a3a20'; cx.lineWidth = 2.5
    }
    if (pts.length) { cx.beginPath(); cx.arc(pts[0].x, pts[0].y, 6, 0, Math.PI*2); cx.fillStyle = '#cc2222'; cx.fill() }
    tex.needsUpdate = true
  }

  // ─── UPDATE ───
  update(dt) {
    this._t += dt
    const s = this._state, cam = this._camera, p = this._progress

    // ═══ APPROACH (3s): camera approaches pedestal ═══
    if (s === STATES.APPROACH) {
      const t = Math.min(1, this._t / 3), e = ease(t)
      cam.position.lerpVectors(new THREE.Vector3(0, 2.5, 5), new THREE.Vector3(0, 2.0, 2.0), e)
      cam.lookAt(0, 0.3, 0)
      this._group.scale.setScalar(0.5 + e * 0.5) // scale up as we approach
      if (t >= 1) { this._state = STATES.BOOK_OPEN; this._t = 0 }
    }

    // ═══ BOOK_OPEN (3s): cover flips open ═══
    else if (s === STATES.BOOK_OPEN) {
      const t = Math.min(1, this._t / 3), e = easeIO(t)
      this._coverPivot.rotation.x = -Math.PI * e
      if (e > 0.4) this._pageR.visible = true
      cam.position.lerp(new THREE.Vector3(0, 1.8, 1.5), dt * 1.5)
      cam.lookAt(0.5, 0, 0) // look at right page
      if (t >= 1) {
        this._cover.visible = false; this._pageR.visible = true
        this._quill.visible = true; this._quill.position.set(0.3, 0.2, -0.6)
        this._charIndex = 0; this._blankPage(this._rCx)
        this._state = STATES.WRITE_PAGE1; this._t = 0
      }
    }

    // ═══ WRITE_PAGE1 (progress-driven): quill writes on RIGHT page ═══
    else if (s === STATES.WRITE_PAGE1) {
      const text = this._introTarget || this._introText || 'La forêt attend...'
      const target = Math.floor(Math.min(p.scenario, 1) * text.length * 0.5) // first half on page 1
      if (this._charIndex < target) this._charIndex = Math.min(this._charIndex + dt * 50, target)
      this._writeText(this._rCx, this._rTex, this._title, text, this._charIndex)

      // Quill animation
      const wr = text.length > 0 ? this._charIndex / text.length : 0
      this._quill.position.set(0.3 + Math.sin(this._t * 3) * 0.1, 0.12, -0.7 + wr * 1.0)

      // Quill trembles if waiting
      if (this._charIndex >= target && p.scenario < 0.6) {
        this._quill.position.x += Math.sin(this._t * 15) * 0.003
      }

      // Show turn button when first half written
      if (this._charIndex >= target && p.scenario >= 0.5) {
        this._turnBtn.style.display = 'block'
        if (this._t > 10 && p.scenario < 0.5) p.scenario = 0.5 // fallback
      }

      // Fallback: force after 12s
      if (this._t > 12) { this._turnBtn.style.display = 'block' }
    }

    // ═══ WAIT_TURN: waiting for player click ═══
    else if (s === STATES.WAIT_TURN) { /* handled by button click */ }

    // ═══ PAGE_TURN (1.5s): animated flip ═══
    else if (s === STATES.PAGE_TURN) {
      const t = Math.min(1, this._t / 1.5), e = easeIO(t)
      // Simple visual: right page fades, left page appears
      this._pageR.material.opacity = 1 - e * 0.3
      if (e > 0.5) {
        this._pageL.visible = true
        this._pageL.material.opacity = (e - 0.5) * 2
      }
      if (t >= 1) {
        // Left page = scenario continues, Right page = blank (will become map)
        this._blankPage(this._rCx); this._rTex.needsUpdate = true
        this._pageR.material.opacity = 1
        this._pageL.material.opacity = 1
        this._page2CharIndex = 0
        this._state = STATES.WRITE_PAGE2; this._t = 0
      }
    }

    // ═══ WRITE_PAGE2 (progress-driven): scenario continues on LEFT ═══
    else if (s === STATES.WRITE_PAGE2) {
      const text = this._introTarget || this._introText || ''
      const halfLen = Math.floor(text.length * 0.5)
      const page2Text = text.substring(halfLen)
      const target = Math.floor(Math.min(p.scenario, 1) * page2Text.length)
      if (this._page2CharIndex < target) this._page2CharIndex = Math.min(this._page2CharIndex + dt * 50, target)
      this._writeText(this._lCx, this._lTex, '', page2Text, this._page2CharIndex)

      // Quill on left page
      this._quill.position.set(-0.7 + Math.sin(this._t * 3) * 0.1, 0.12, -0.7 + (this._page2CharIndex / Math.max(1, page2Text.length)) * 1.0)
      cam.position.lerp(new THREE.Vector3(-0.3, 1.8, 1.3), dt)
      cam.lookAt(-0.3, 0, 0)

      // When done → draw map
      if ((this._page2CharIndex >= page2Text.length && p.scenario >= 1) || this._t > 10) {
        this._state = STATES.DRAW_MAP; this._t = 0; this._drawnSegs = 0
        // Reset right page for map
        this._blankPage(this._rCx); this._rTex.needsUpdate = true
      }
    }

    // ═══ DRAW_MAP (progress-driven): quill draws path on RIGHT ═══
    else if (s === STATES.DRAW_MAP) {
      const total = this._pathPoints.length
      const targetSegs = Math.floor(p.pathEvents * total)
      if (this._drawnSegs < targetSegs) this._drawnSegs = Math.min(this._drawnSegs + dt * 3, targetSegs)
      else if (this._t > 6) this._drawnSegs = total // fallback
      this._drawMap(this._rCx, this._rTex, Math.floor(this._drawnSegs))

      this._quill.position.set(0.4 + Math.sin(this._t * 2) * 0.15, 0.12, -0.5 + (this._drawnSegs / total) * 0.8)
      cam.position.lerp(new THREE.Vector3(0.3, 1.8, 1.3), dt)
      cam.lookAt(0.3, 0, 0)

      if (this._drawnSegs >= total) {
        this._quill.visible = false
        this._startBtn.style.display = 'block'
        this._state = STATES.WAIT_START; this._t = 0
      }
    }

    // ═══ WAIT_START ═══
    else if (s === STATES.WAIT_START) {
      cam.position.y = 1.8 + Math.sin(this._t * 0.4) * 0.02
    }

    // ═══ ORBIT_MAP (2s): camera orbits above map ═══
    else if (s === STATES.ORBIT_MAP) {
      const t = Math.min(1, this._t / 2), e = ease(t)
      // Camera rises and centers over the right page (map)
      cam.position.lerpVectors(new THREE.Vector3(0.3, 1.8, 1.3), new THREE.Vector3(0.7, 2.5, 0.3), e)
      cam.lookAt(0.7, 0, 0) // directly above map
      if (t >= 1) { this._state = STATES.FALL_IN; this._t = 0 }
    }

    // ═══ FALL_IN (2s): fall into map → done ═══
    else if (s === STATES.FALL_IN) {
      const t = Math.min(1, this._t / 2), e = easeIO(t)
      // Camera plunges toward the map
      cam.position.y = 2.5 - e * 3 // falls through the map
      cam.position.z = 0.3 - e * 0.3
      // Book fades
      this._group.traverse(o => { if (o.material && o.material.opacity !== undefined) o.material.opacity = 1 - e })
      if (t >= 1) { this._state = STATES.DONE; this._cleanup(); this._onComplete?.() }
    }
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state === STATES.DONE }

  _cleanup() {
    this._state = STATES.DONE
    this._scene.remove(this._group)
    this._skipBtn?.remove(); this._turnBtn?.remove(); this._startBtn?.remove()
    this._group.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose() } })
  }
}

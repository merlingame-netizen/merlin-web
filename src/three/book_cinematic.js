// M.E.R.L.I.N. — Book Cinematic v3 (Progress-Driven)
// Animations pilotées par le chargement réel, pas par des timers fixes
// Mécanique = durée fixe | Contenu = piloté par progress callbacks

import * as THREE from 'three'

const STATES = {
  BOOK_APPEAR: 0, BOOK_OPEN: 1, CAMERA_DOLLY: 2,
  WRITE_SCENARIO: 3, MAP_APPEAR: 4, DRAW_PATH: 5,
  COLOR_BIOME: 6, WAIT_CLICK: 7, FREEFALL: 8, DONE: 9,
}

const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export class BookCinematic {
  constructor(scene, camera) {
    this._scene = scene
    this._camera = camera
    this._state = STATES.BOOK_APPEAR
    this._t = 0
    this._group = new THREE.Group()
    this._scene.add(this._group)
    this._onComplete = null

    // ─── Progress object (fed by external callbacks) ───
    this._progress = {
      scenario: 0,     // 0→1 : titre(0.2) + intro chars(0.2→1.0)
      pathEvents: 0,   // 0→1 : events received
      terrain: 0,      // 0→1 : terrain ready
      assets: 0,       // 0→1 : props placed
    }

    // Buffered LLM data
    this._title = ''
    this._introText = ''
    this._introTarget = '' // full text to write toward
    this._pathPoints = this._generateFallbackPath()
    this._charIndex = 0
    this._drawnPathSegments = 0

    this._build()
  }

  _generateFallbackPath() {
    const pts = []
    let px = 256, py = 660
    for (let i = 0; i < 10; i++) {
      const nx = 50 + Math.random() * 410
      const ny = py - 40 - Math.random() * 25
      pts.push({ x: px, y: py, nx, ny })
      px = nx; py = ny
    }
    return pts
  }

  _build() {
    // ─── BOOK BODY ───
    this._book = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.12, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.8 })
    )
    this._group.add(this._book)

    // ─── COVER (pivots on left edge) ───
    this._coverPivot = new THREE.Group()
    this._coverPivot.position.set(-1.5, 0.07, 0)
    this._cover = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.04, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 })
    )
    this._cover.position.set(1.5, 0, 0)
    // Title label on cover
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 64
    const lcx = lc.getContext('2d')
    lcx.fillStyle = '#d4c5a0'; lcx.fillRect(0, 0, 512, 64)
    lcx.fillStyle = '#3a2510'; lcx.font = 'bold 28px Georgia,serif'; lcx.textAlign = 'center'
    lcx.fillText('M.E.R.L.I.N.', 256, 42)
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true })
    )
    labelMesh.rotation.x = -Math.PI / 2; labelMesh.position.y = 0.025
    this._cover.add(labelMesh)
    this._coverPivot.add(this._cover)
    this._group.add(this._coverPivot)

    // ─── LEFT PAGE (scenario text) ───
    this._pageCv = document.createElement('canvas'); this._pageCv.width = 512; this._pageCv.height = 720
    this._pageCx = this._pageCv.getContext('2d')
    this._pageTex = new THREE.CanvasTexture(this._pageCv)
    this._pageLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.0),
      new THREE.MeshBasicMaterial({ map: this._pageTex })
    )
    this._pageLeft.rotation.x = -Math.PI / 2
    this._pageLeft.position.set(-0.75, 0.08, 0)
    this._pageLeft.visible = false
    this._group.add(this._pageLeft)

    // ─── RIGHT PAGE (map) ───
    this._mapCv = document.createElement('canvas'); this._mapCv.width = 512; this._mapCv.height = 720
    this._mapCx = this._mapCv.getContext('2d')
    this._mapTex = new THREE.CanvasTexture(this._mapCv)
    this._pageRight = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.0),
      new THREE.MeshBasicMaterial({ map: this._mapTex })
    )
    this._pageRight.rotation.x = -Math.PI / 2
    this._pageRight.position.set(0.75, 0.08, 0)
    this._pageRight.visible = false
    this._group.add(this._pageRight)

    // ─── QUILL ───
    const q = new THREE.Group()
    q.add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x222222 })))
    q.children[0].position.y = -0.04
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0xccbb88 }))
    shaft.position.y = 0.14; q.add(shaft)
    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.2), new THREE.MeshBasicMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }))
    feather.position.set(0.03, 0.28, 0); feather.rotation.z = 0.3; q.add(feather)
    this._quill = q; this._quill.visible = false
    this._quill.rotation.x = -0.5; this._quill.rotation.z = 0.2
    this._group.add(this._quill)

    // ─── LIGHTS ───
    this._group.add(new THREE.PointLight(0xffcc88, 2, 8).translateY(3).translateZ(1))
    this._group.add(new THREE.AmbientLight(0x333333, 0.8))

    // ─── Initial state ───
    this._group.position.set(0, 0, 0)
    this._group.scale.setScalar(0.01)
    this._clearPage(); this._clearMap()

    // ─── DOM ───
    this._skipBtn = this._makeBtn('Passer ▶▶', 'bottom:20px;right:20px', () => this.skip())
    this._arrowBtn = this._makeBtn('Entrer dans la forêt ▶', 'bottom:40px;left:50%;transform:translateX(-50%)', () => {
      this._state = STATES.FREEFALL; this._t = 0
    })
    this._arrowBtn.style.display = 'none'
    this._arrowBtn.style.cssText += ';border:2px solid #33ff66;color:#33ff66;font-size:18px;padding:14px 28px;'
  }

  _makeBtn(text, pos, onClick) {
    const b = document.createElement('button'); b.textContent = text
    b.style.cssText = `position:fixed;${pos};z-index:200;padding:8px 16px;border-radius:6px;cursor:pointer;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5);font:13px VT323,monospace;`
    b.addEventListener('click', onClick); document.body.appendChild(b); return b
  }

  // ─── PROGRESS CALLBACKS (called from main.js as data arrives) ───
  onTitleReady(title) {
    if (title) { this._title = title; this._progress.scenario = Math.max(this._progress.scenario, 0.2) }
  }
  onIntroReady(text) {
    if (text) { this._introTarget = text; this._progress.scenario = Math.max(this._progress.scenario, 0.3) }
  }
  onIntroProgress(fraction) {
    // Called as LLM streams characters (0→1)
    this._progress.scenario = 0.3 + fraction * 0.7
  }
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
  onAssetsReady() { this._progress.assets = 1.0 }
  setOnComplete(fn) { this._onComplete = fn }

  // ─── Canvas helpers ───
  _clearPage() {
    const cx = this._pageCx
    cx.fillStyle = '#ede4d0'; cx.fillRect(0, 0, 512, 720)
    cx.strokeStyle = 'rgba(150,130,100,0.1)'; cx.lineWidth = 0.5
    for (let y = 70; y < 700; y += 22) { cx.beginPath(); cx.moveTo(35, y); cx.lineTo(477, y); cx.stroke() }
    this._pageTex.needsUpdate = true
  }

  _clearMap() {
    const cx = this._mapCx
    cx.fillStyle = '#d8cba8'; cx.fillRect(0, 0, 512, 720)
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 2; cx.strokeRect(10, 10, 492, 700)
    cx.fillStyle = '#5a4a30'; cx.font = 'bold 16px Georgia,serif'
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', 256, 35); cx.textAlign = 'left'
    this._mapTex.needsUpdate = true
  }

  _renderPage() {
    this._clearPage()
    const cx = this._pageCx
    const text = this._introTarget || this._introText
    const chars = Math.min(Math.floor(this._charIndex), text.length)
    const visible = text.substring(0, chars)

    // Title
    if (this._title) {
      cx.fillStyle = '#3a2510'; cx.font = 'bold 20px Georgia,serif'
      cx.textAlign = 'center'; cx.fillText(this._title, 256, 45); cx.textAlign = 'left'
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(80, 56); cx.lineTo(432, 56); cx.stroke()
    }

    // Body
    cx.fillStyle = '#4a3520'; cx.font = 'italic 13px Georgia,serif'
    const words = visible.split(' ')
    let line = '', y = 75
    for (const w of words) {
      const test = line + w + ' '
      if (cx.measureText(test).width > 430) { cx.fillText(line.trim(), 40, y); line = w + ' '; y += 20; if (y > 710) break }
      else line = test
    }
    if (line.trim()) cx.fillText(line.trim(), 40, y)

    // Cursor
    if (chars < text.length) { cx.fillRect(40 + cx.measureText(line.trim()).width + 2, y - 9, 1.5, 11) }
    this._pageTex.needsUpdate = true
  }

  _renderMap(segments) {
    this._clearMap()
    const cx = this._mapCx, pts = this._pathPoints
    cx.strokeStyle = '#5a4a2a'; cx.lineWidth = 2.5; cx.lineCap = 'round'
    for (let i = 0; i < segments && i < pts.length; i++) {
      const p = pts[i]
      cx.beginPath(); cx.moveTo(p.x, p.y)
      cx.quadraticCurveTo((p.x + p.nx) / 2 + (Math.random() - 0.5) * 15, (p.y + p.ny) / 2, p.nx, p.ny)
      cx.stroke()
      cx.beginPath(); cx.arc(p.nx, p.ny, 5, 0, Math.PI * 2)
      cx.fillStyle = i % 3 === 0 ? '#cc6633' : '#33aa55'; cx.fill()
      cx.strokeStyle = '#5a4a2a'; cx.lineWidth = 2.5
    }
    if (pts.length) { cx.beginPath(); cx.arc(pts[0].x, pts[0].y, 7, 0, Math.PI * 2); cx.fillStyle = '#cc3333'; cx.fill() }
    this._mapTex.needsUpdate = true
  }

  // ─── UPDATE (every frame) ───
  update(dt) {
    this._t += dt
    const s = this._state, cam = this._camera, p = this._progress

    // ═══ BOOK_APPEAR (3s fixed) ═══
    if (s === STATES.BOOK_APPEAR) {
      const t = Math.min(1, this._t / 3.0), e = easeOut(t)
      this._group.scale.setScalar(e)
      this._group.rotation.y = (1 - e) * 0.4
      cam.position.set(0, 3 - e * 0.5, 2.5 - e * 0.3); cam.lookAt(0, 0, 0)
      if (t >= 1) { this._state = STATES.BOOK_OPEN; this._t = 0 }
    }

    // ═══ BOOK_OPEN (3s fixed) ═══
    else if (s === STATES.BOOK_OPEN) {
      const t = Math.min(1, this._t / 3.0), e = easeInOut(t)
      this._coverPivot.rotation.x = -Math.PI * e
      if (e > 0.4) this._pageLeft.visible = true
      cam.position.y = 2.5 - e * 0.5; cam.lookAt(0, 0, 0)
      if (t >= 1) { this._cover.visible = false; this._pageLeft.visible = true; this._state = STATES.CAMERA_DOLLY; this._t = 0 }
    }

    // ═══ CAMERA_DOLLY (2s fixed) ═══
    else if (s === STATES.CAMERA_DOLLY) {
      const t = Math.min(1, this._t / 2.0), e = easeInOut(t)
      cam.position.lerpVectors(new THREE.Vector3(0, 2.0, 2.2), new THREE.Vector3(-0.5, 1.8, 1.2), e)
      cam.lookAt(-0.5, 0, 0)
      if (t >= 1) { this._quill.visible = true; this._quill.position.set(-1.2, 0.2, -0.6); this._charIndex = 0; this._state = STATES.WRITE_SCENARIO; this._t = 0 }
    }

    // ═══ WRITE_SCENARIO (progress-driven) ═══
    else if (s === STATES.WRITE_SCENARIO) {
      const text = this._introTarget || this._introText
      const targetChars = Math.floor(p.scenario * text.length)

      // Typewriter catches up to progress (smooth, 60 chars/sec max)
      if (this._charIndex < targetChars) {
        this._charIndex = Math.min(this._charIndex + dt * 60, targetChars)
      }
      this._renderPage()

      // Quill follows writing
      const writeRatio = text.length > 0 ? this._charIndex / text.length : 0
      this._quill.position.x = -1.1 + Math.sin(this._t * 3) * 0.15
      this._quill.position.z = -0.8 + writeRatio * 1.2
      this._quill.position.y = 0.15

      // Quill trembles if waiting for LLM
      if (this._charIndex >= targetChars && p.scenario < 1.0) {
        this._quill.position.x += Math.sin(this._t * 15) * 0.005
        this._quill.position.z += Math.cos(this._t * 12) * 0.003
      }

      // Fallback: if stuck > 8s with no progress, force complete
      if (this._t > 8 && p.scenario < 0.5) {
        this._introTarget = this._introText // use fallback
        p.scenario = 1.0
      }

      // Transition when scenario fully written
      if (this._charIndex >= text.length && p.scenario >= 1.0) {
        this._state = STATES.MAP_APPEAR; this._t = 0
      }
    }

    // ═══ MAP_APPEAR (1s fixed) ═══
    else if (s === STATES.MAP_APPEAR) {
      this._pageRight.visible = true
      const t = Math.min(1, this._t / 1.0), e = easeOut(t)
      this._pageRight.position.y = 0.08 + (1 - e) * 0.5
      cam.position.lerp(new THREE.Vector3(0, 2.0, 1.5), dt * 2); cam.lookAt(0, 0, 0)
      if (t >= 1) { this._drawnPathSegments = 0; this._state = STATES.DRAW_PATH; this._t = 0 }
    }

    // ═══ DRAW_PATH (progress-driven by pathEvents) ═══
    else if (s === STATES.DRAW_PATH) {
      const totalSegs = this._pathPoints.length
      const targetSegs = Math.floor(p.pathEvents * totalSegs)

      // Smoothly catch up (3 segments/sec max for visual effect)
      if (this._drawnPathSegments < targetSegs) {
        this._drawnPathSegments = Math.min(this._drawnPathSegments + dt * 3, targetSegs)
      }
      this._renderMap(Math.floor(this._drawnPathSegments))

      // Quill draws on map
      this._quill.position.set(0.4 + Math.sin(this._t * 2) * 0.2, 0.15, -0.5 + (this._drawnPathSegments / totalSegs) * 0.8)
      cam.position.lerp(new THREE.Vector3(0.5, 1.6, 1.3), dt); cam.lookAt(0.3, 0, 0)

      // Fallback: if no events after 6s, use default path
      if (this._t > 6 && p.pathEvents < 0.5) { p.pathEvents = 1.0 }

      if (this._drawnPathSegments >= totalSegs && p.pathEvents >= 1.0) {
        this._state = STATES.COLOR_BIOME; this._t = 0
      }
    }

    // ═══ COLOR_BIOME (progress-driven by terrain ready) ═══
    else if (s === STATES.COLOR_BIOME) {
      // Aquarelle effect on map as terrain loads
      const cx = this._mapCx
      const colorProgress = Math.min(1, p.terrain + this._t * 0.1) // slow auto-advance
      const paintY = 720 - colorProgress * 680
      if (Math.random() > 0.5) {
        for (let y = 710; y > paintY; y -= 8) {
          for (let x = 20; x < 492; x += 12) {
            const g = 80 + Math.random() * 60
            cx.fillStyle = `rgba(${60 + Math.random() * 30},${g},${40 + Math.random() * 20},0.03)`
            cx.fillRect(x + (Math.random() - 0.5) * 4, y, 8, 8)
          }
        }
        this._mapTex.needsUpdate = true
      }

      // Fallback: if terrain never ready, advance after 4s
      if (this._t > 4 || p.terrain >= 1.0) {
        this._quill.visible = false
        this._arrowBtn.style.display = 'block'
        this._state = STATES.WAIT_CLICK; this._t = 0
      }
    }

    // ═══ WAIT_CLICK ═══
    else if (s === STATES.WAIT_CLICK) {
      cam.position.y = 1.6 + Math.sin(this._t * 0.5) * 0.02
    }

    // ═══ FREEFALL (2.5s fixed) ═══
    else if (s === STATES.FREEFALL) {
      this._arrowBtn.style.display = 'none'
      const t = Math.min(1, this._t / 2.5), e = easeInOut(t)
      if (t < 0.5) { cam.position.lerp(new THREE.Vector3(0.75, 0.5, 0.3), e * 0.15); cam.lookAt(0.75, 0, 0) }
      else { this._group.scale.setScalar(Math.max(0.01, 1 - (t - 0.5) * 2)); this._group.position.y -= dt * 3 }
      if (t >= 1) { this._state = STATES.DONE; this._cleanup(); this._onComplete?.() }
    }
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state === STATES.DONE }

  _cleanup() {
    this._state = STATES.DONE
    this._scene.remove(this._group)
    this._skipBtn?.remove(); this._arrowBtn?.remove()
    this._group.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose() } })
  }
}

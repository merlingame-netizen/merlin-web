// M.E.R.L.I.N. — Book Cinematic
// 3D book opens, quill writes scenario, map draws paths, transitions to game
// State machine: BOOK_APPEAR → BOOK_OPEN → WRITE_TITLE → WRITE_PAGE → MAP_DRAW → FREEFALL

import * as THREE from 'three'

const STATES = {
  BOOK_APPEAR: 0, BOOK_OPEN: 1, CAMERA_ZOOM: 2,
  WRITE_TITLE: 3, WRITE_PAGE1: 4, PAGE_TURN: 5, WRITE_PAGE2: 6,
  MAP_APPEAR: 7, DRAW_PATH: 8, WAIT_CLICK: 9,
  MAP_FOCUS: 10, FREEFALL: 11, DONE: 12,
}

export class BookCinematic {
  constructor(scene, camera, renderer) {
    this._scene = scene
    this._camera = camera
    this._renderer = renderer
    this._state = STATES.BOOK_APPEAR
    this._t = 0
    this._group = new THREE.Group()
    this._scene.add(this._group)

    // Data from LLM (fed progressively)
    this._title = null
    this._introText = ''
    this._pathEvents = []
    this._terrainReady = false

    // Callbacks
    this._onComplete = null
    this._onSkip = null

    // Meshes
    this._book = null
    this._cover = null
    this._pageLeft = null
    this._pageRight = null
    this._quill = null
    this._mapPlane = null

    // Canvas textures
    this._pageCanvas = null
    this._pageCx = null
    this._pageTexture = null
    this._mapCanvas = null
    this._mapCx = null
    this._mapTexture = null

    // Animation state
    this._charIndex = 0
    this._pathProgress = 0
    this._pathPoints = []

    this._build()
  }

  _build() {
    // ─── BOOK BASE (brown slab) ───
    const bookGeo = new THREE.BoxGeometry(2.4, 0.08, 1.7)
    const bookMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
    this._book = new THREE.Mesh(bookGeo, bookMat)
    this._book.position.set(0, 0, 0)
    this._group.add(this._book)

    // ─── COVER (pivots on left edge) ───
    const coverGeo = new THREE.PlaneGeometry(2.4, 1.7)
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x6a4a2a, side: THREE.DoubleSide,
    })
    this._cover = new THREE.Mesh(coverGeo, coverMat)
    this._cover.rotation.x = -Math.PI / 2 // flat on top
    this._cover.position.set(0, 0.05, 0)
    // Pivot point: left edge
    this._coverPivot = new THREE.Group()
    this._coverPivot.position.set(-1.2, 0.05, 0)
    this._cover.position.set(1.2, 0, 0) // offset from pivot
    this._coverPivot.add(this._cover)
    this._group.add(this._coverPivot)

    // Cover decoration
    const titleGeo = new THREE.PlaneGeometry(1.8, 0.3)
    const titleCanvas = document.createElement('canvas')
    titleCanvas.width = 512; titleCanvas.height = 64
    const tcx = titleCanvas.getContext('2d')
    tcx.fillStyle = '#d4c5a0'; tcx.fillRect(0, 0, 512, 64)
    tcx.fillStyle = '#3a2510'; tcx.font = 'bold 32px Georgia, serif'
    tcx.textAlign = 'center'; tcx.fillText('M.E.R.L.I.N.', 256, 42)
    const titleTex = new THREE.CanvasTexture(titleCanvas)
    const titleMesh = new THREE.Mesh(titleGeo, new THREE.MeshBasicMaterial({ map: titleTex, transparent: true }))
    titleMesh.position.set(0, 0.001, 0)
    this._cover.add(titleMesh)

    // ─── PAGE LEFT (writable) ───
    this._pageCanvas = document.createElement('canvas')
    this._pageCanvas.width = 512; this._pageCanvas.height = 720
    this._pageCx = this._pageCanvas.getContext('2d')
    this._clearPage()
    this._pageTexture = new THREE.CanvasTexture(this._pageCanvas)

    const pageGeo = new THREE.PlaneGeometry(1.15, 1.6)
    this._pageLeft = new THREE.Mesh(pageGeo, new THREE.MeshBasicMaterial({ map: this._pageTexture }))
    this._pageLeft.rotation.x = -Math.PI / 2
    this._pageLeft.position.set(-0.6, 0.06, 0)
    this._pageLeft.visible = false // hidden until cover opens
    this._group.add(this._pageLeft)

    // ─── PAGE RIGHT (for map later) ───
    this._mapCanvas = document.createElement('canvas')
    this._mapCanvas.width = 512; this._mapCanvas.height = 720
    this._mapCx = this._mapCanvas.getContext('2d')
    this._clearMap()
    this._mapTexture = new THREE.CanvasTexture(this._mapCanvas)

    this._pageRight = new THREE.Mesh(pageGeo.clone(), new THREE.MeshBasicMaterial({ map: this._mapTexture }))
    this._pageRight.rotation.x = -Math.PI / 2
    this._pageRight.position.set(0.6, 0.06, 0)
    this._pageRight.visible = false // hidden until MAP_APPEAR
    this._group.add(this._pageRight)

    // ─── QUILL (cone tip + cylinder body) ───
    const quillGroup = new THREE.Group()
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.06, 4),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    )
    tip.position.y = -0.03
    quillGroup.add(tip)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.012, 0.25, 5),
      new THREE.MeshStandardMaterial({ color: 0xddcc99 })
    )
    body.position.y = 0.1
    quillGroup.add(body)
    // Feather
    const feather = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xeeeeee, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    )
    feather.position.set(0.02, 0.2, 0); feather.rotation.z = 0.3
    quillGroup.add(feather)

    this._quill = quillGroup
    this._quill.position.set(-0.9, 0.15, -0.5)
    this._quill.rotation.x = -0.4
    this._quill.rotation.z = 0.2
    this._quill.visible = false
    this._group.add(this._quill)

    // ─── LIGHTING ───
    const light = new THREE.PointLight(0xffcc88, 1.5, 5)
    light.position.set(0, 2, 1)
    this._group.add(light)
    const ambient = new THREE.AmbientLight(0x444444, 0.5)
    this._group.add(ambient)

    // ─── POSITION book — starts small at center, grows into view ───
    this._group.position.set(0, 0, 0)
    this._group.scale.setScalar(0.01) // starts tiny

    // ─── Skip button (DOM) ───
    this._skipBtn = document.createElement('button')
    this._skipBtn.textContent = 'Passer ▶▶'
    this._skipBtn.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:200;
      padding:8px 16px;border-radius:6px;cursor:pointer;
      background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);
      color:rgba(255,255,255,0.6);font:12px VT323,monospace;
    `
    this._skipBtn.addEventListener('click', () => this.skip())
    document.body.appendChild(this._skipBtn)

    // ─── Arrow button (hidden until WAIT_CLICK) ───
    this._arrowBtn = document.createElement('button')
    this._arrowBtn.textContent = 'Entrer dans la forêt ▶'
    this._arrowBtn.style.cssText = `
      position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:200;
      padding:12px 24px;border-radius:8px;cursor:pointer;display:none;
      background:rgba(6,13,6,0.9);border:2px solid #33ff66;
      color:#33ff66;font:16px VT323,monospace;
    `
    this._arrowBtn.addEventListener('click', () => { this._state = STATES.MAP_FOCUS })
    document.body.appendChild(this._arrowBtn)
  }

  // ─── LLM data callbacks ───
  onTitleReady(title) { this._title = title }
  onIntroReady(text) { this._introText = text }
  onPathReady(events) {
    this._pathEvents = events
    // Generate path points from events
    this._pathPoints = []
    let px = 256, py = 660
    for (const ev of events.slice(0, 12)) {
      const nx = 60 + Math.random() * 390
      const ny = py - 35 - Math.random() * 25
      this._pathPoints.push({ x: px, y: py, nx, ny })
      px = nx; py = ny
    }
  }
  onTerrainReady() { this._terrainReady = true }

  setOnComplete(fn) { this._onComplete = fn }

  // ─── Canvas helpers ───
  _clearPage() {
    const cx = this._pageCx
    cx.fillStyle = '#e8dcc8'; cx.fillRect(0, 0, 512, 720)
    // Subtle lines
    cx.strokeStyle = 'rgba(150,130,100,0.15)'; cx.lineWidth = 0.5
    for (let y = 80; y < 680; y += 28) { cx.beginPath(); cx.moveTo(40, y); cx.lineTo(472, y); cx.stroke() }
    // Margin line
    cx.strokeStyle = 'rgba(180,60,60,0.15)'; cx.lineWidth = 1
    cx.beginPath(); cx.moveTo(55, 30); cx.lineTo(55, 690); cx.stroke()
  }

  _clearMap() {
    const cx = this._mapCx
    cx.fillStyle = '#d4c5a0'; cx.fillRect(0, 0, 512, 720)
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 2; cx.strokeRect(8, 8, 496, 704)
    cx.strokeStyle = '#9a8050'; cx.lineWidth = 1; cx.strokeRect(14, 14, 484, 692)
    // Title
    cx.fillStyle = '#4a3520'; cx.font = 'bold 18px Georgia, serif'
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', 256, 35); cx.textAlign = 'left'
    // Compass rose
    cx.fillStyle = '#7a6a50'; cx.font = '14px serif'; cx.textAlign = 'center'
    cx.fillText('N', 470, 55); cx.fillText('S', 470, 700)
    cx.textAlign = 'left'
  }

  _writeTextOnPage(text, charIdx) {
    this._clearPage()
    const cx = this._pageCx
    const maxChars = Math.min(charIdx, text.length)
    const visibleText = text.substring(0, maxChars)

    // Title (first line, centered, bold)
    if (this._title) {
      cx.fillStyle = '#3a2510'; cx.font = 'bold 22px Georgia, serif'
      cx.textAlign = 'center'; cx.fillText(this._title, 256, 55); cx.textAlign = 'left'
    }

    // Body text
    cx.fillStyle = '#4a3520'; cx.font = 'italic 14px Georgia, serif'
    const words = visibleText.split(' ')
    let line = '', y = 90, maxW = 400
    for (const w of words) {
      const test = line + w + ' '
      if (cx.measureText(test).width > maxW) {
        cx.fillText(line.trim(), 65, y); line = w + ' '; y += 26
        if (y > 690) break
      } else { line = test }
    }
    if (line.trim()) cx.fillText(line.trim(), 65, y)

    // Quill cursor
    if (maxChars < text.length) {
      cx.fillStyle = '#3a2510'; cx.fillRect(65 + cx.measureText(line.trim()).width + 2, y - 12, 2, 14)
    }

    this._pageTexture.needsUpdate = true
  }

  _drawPathOnMap(progress) {
    this._clearMap()
    const cx = this._mapCx
    const pts = this._pathPoints
    const count = Math.floor(progress * pts.length)

    cx.strokeStyle = '#5a4a2a'; cx.lineWidth = 2.5
    for (let i = 0; i < count && i < pts.length; i++) {
      const p = pts[i]
      cx.beginPath(); cx.moveTo(p.x, p.y)
      cx.quadraticCurveTo((p.x + p.nx) / 2 + (Math.random() - 0.5) * 30, (p.y + p.ny) / 2, p.nx, p.ny)
      cx.stroke()
      // Event dot
      cx.beginPath(); cx.arc(p.nx, p.ny, 4, 0, Math.PI * 2)
      cx.fillStyle = '#33aa55'; cx.fill()
      cx.beginPath(); cx.arc(p.nx, p.ny, 7, 0, Math.PI * 2)
      cx.strokeStyle = 'rgba(51,170,85,0.3)'; cx.lineWidth = 1; cx.stroke()
      cx.lineWidth = 2.5
    }
    // Start marker
    if (pts.length > 0) {
      cx.beginPath(); cx.arc(pts[0].x, pts[0].y, 6, 0, Math.PI * 2)
      cx.fillStyle = '#cc6633'; cx.fill()
    }

    this._mapTexture.needsUpdate = true
  }

  // ─── Update (called every frame) ───
  update(dt) {
    this._t += dt // dt is already in seconds (THREE.Clock.getDelta)
    const s = this._state

    // BOOK_APPEAR: grow from tiny center (3s, smooth ease-out)
    if (s === STATES.BOOK_APPEAR) {
      const t = Math.min(1, this._t / 3.0)
      const ease = 1 - Math.pow(1 - t, 3) // cubic ease-out
      this._group.scale.setScalar(0.01 + ease * 0.99) // 0.01 → 1.0
      this._group.position.y = (1 - ease) * -0.3 // slight rise
      this._group.rotation.y = (1 - ease) * 0.4
      if (t >= 1) {
        this._group.scale.setScalar(1.0)
        this._group.position.y = 0
        this._group.rotation.y = 0
        this._state = STATES.BOOK_OPEN; this._t = 0
      }
    }

    // BOOK_OPEN: cover flips open (3s, smooth ease-in-out)
    else if (s === STATES.BOOK_OPEN) {
      const t = Math.min(1, this._t / 3.0)
      // Smooth ease-in-out (cubic)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      this._coverPivot.rotation.z = -Math.PI * ease
      // Subtle camera drift during open
      this._camera.position.y = 2 - ease * 0.3
      // Reveal pages when cover is halfway open
      if (ease > 0.3 && !this._pageLeft.visible) {
        this._pageLeft.visible = true
      }
      if (t >= 1) {
        this._cover.visible = false
        this._pageLeft.visible = true
        this._quill.visible = true
        this._state = STATES.WRITE_TITLE; this._t = 0; this._charIndex = 0
      }
    }

    // WRITE_TITLE + WRITE_PAGE1: typewriter on left page
    else if (s === STATES.WRITE_TITLE || s === STATES.WRITE_PAGE1) {
      const text = this._introText || this._title || 'Le destin s\'écrit...'
      this._charIndex += dt / 1000 * 30 // 30 chars/sec
      this._writeTextOnPage(text, Math.floor(this._charIndex))

      // Move quill
      const qx = -0.9 + Math.sin(this._t * 2) * 0.1
      const qz = -0.5 + Math.min(this._t * 0.08, 0.4)
      this._quill.position.set(qx, 0.12, qz)

      if (this._charIndex >= text.length) {
        this._state = STATES.MAP_APPEAR; this._t = 0
      }
    }

    // MAP_APPEAR: right page slides in
    else if (s === STATES.MAP_APPEAR) {
      this._pageRight.visible = true
      const t = Math.min(1, this._t / 1.0)
      this._pageRight.position.y = 0.06 + (1 - t) * 0.3
      if (t >= 1) { this._state = STATES.DRAW_PATH; this._t = 0; this._pathProgress = 0 }
    }

    // DRAW_PATH: quill draws path on map
    else if (s === STATES.DRAW_PATH) {
      this._pathProgress = Math.min(1, this._t / 5) // 5s to draw full path
      this._drawPathOnMap(this._pathProgress)
      // Move quill to map side
      this._quill.position.set(0.3 + Math.sin(this._t) * 0.15, 0.12, -0.3 + this._t * 0.08)
      if (this._pathProgress >= 1) {
        this._state = STATES.WAIT_CLICK; this._t = 0
        this._arrowBtn.style.display = 'block'
        this._quill.visible = false
      }
    }

    // WAIT_CLICK: arrow button visible
    else if (s === STATES.WAIT_CLICK) {
      // Idle — waiting for player click
    }

    // MAP_FOCUS: zoom into map
    else if (s === STATES.MAP_FOCUS) {
      this._arrowBtn.style.display = 'none'
      const t = Math.min(1, this._t / 2)
      // Zoom camera toward map
      this._camera.position.lerp(new THREE.Vector3(0.6, 1, -1.5), t * 0.05)
      this._camera.lookAt(this._pageRight.getWorldPosition(new THREE.Vector3()))
      if (t >= 1) { this._state = STATES.FREEFALL; this._t = 0 }
    }

    // FREEFALL: fade out and complete
    else if (s === STATES.FREEFALL) {
      const t = Math.min(1, this._t / 1.5)
      this._group.position.y -= dt / 1000 * 2 // book falls away
      this._group.scale.setScalar(Math.max(0.01, 1 - t))
      if (t >= 1) { this._state = STATES.DONE; this._cleanup(); this._onComplete?.() }
    }
  }

  skip() {
    this._cleanup()
    this._onComplete?.()
  }

  _cleanup() {
    this._state = STATES.DONE
    this._scene.remove(this._group)
    this._skipBtn?.remove()
    this._arrowBtn?.remove()
    // Dispose geometries + materials
    this._group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose()
        obj.material.dispose()
      }
    })
  }

  getState() { return this._state }
  isDone() { return this._state === STATES.DONE }
}

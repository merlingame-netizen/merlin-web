// M.E.R.L.I.N. — Book Cinematic v2
// 3D book: appear → open → quill writes → map draws → freefall transition
// Camera: starts above → dolly down face-to-book → zoom page → zoom map → freefall

import * as THREE from 'three'

const STATES = {
  BOOK_APPEAR: 0, BOOK_OPEN: 1, CAMERA_DOLLY: 2,
  WRITE_SCENARIO: 3, MAP_APPEAR: 4, DRAW_PATH: 5,
  WAIT_CLICK: 6, FREEFALL: 7, DONE: 8,
}

// Smooth ease functions
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export class BookCinematic {
  constructor(scene, camera, renderer) {
    this._scene = scene
    this._camera = camera
    this._renderer = renderer
    this._state = STATES.BOOK_APPEAR
    this._t = 0
    this._group = new THREE.Group()
    this._scene.add(this._group)

    // LLM data
    this._title = 'Brocéliande' // fallback
    this._introText = 'Les brumes de la forêt se lèvent lentement, dévoilant les racines noueuses des chênes millénaires...'
    this._pathEvents = []
    this._onComplete = null
    this._charIndex = 0
    this._pathProgress = 0

    // Path points for map drawing
    this._pathPoints = this._generateDefaultPath()

    this._build()
  }

  _generateDefaultPath() {
    const pts = []
    let px = 256, py = 660
    for (let i = 0; i < 10; i++) {
      const nx = 60 + Math.random() * 400
      const ny = py - 40 - Math.random() * 25
      pts.push({ x: px, y: py, nx, ny })
      px = nx; py = ny
    }
    return pts
  }

  _build() {
    // ─── BOOK BODY ───
    const bookGeo = new THREE.BoxGeometry(3.0, 0.12, 2.2)
    const bookMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.8 })
    this._book = new THREE.Mesh(bookGeo, bookMat)
    this._group.add(this._book)

    // ─── COVER (pivots on LEFT edge via parent group) ───
    this._coverPivot = new THREE.Group()
    this._coverPivot.position.set(-1.5, 0.07, 0) // left edge of book

    const coverGeo = new THREE.BoxGeometry(3.0, 0.04, 2.2)
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 })
    this._cover = new THREE.Mesh(coverGeo, coverMat)
    this._cover.position.set(1.5, 0, 0) // offset from pivot

    // Cover title label
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 512; labelCanvas.height = 64
    const lcx = labelCanvas.getContext('2d')
    lcx.fillStyle = '#d4c5a0'; lcx.fillRect(0, 0, 512, 64)
    lcx.fillStyle = '#3a2510'; lcx.font = 'bold 28px Georgia, serif'
    lcx.textAlign = 'center'; lcx.fillText('M.E.R.L.I.N.', 256, 42)
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.3),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
    )
    labelMesh.rotation.x = -Math.PI / 2
    labelMesh.position.y = 0.025
    this._cover.add(labelMesh)

    this._coverPivot.add(this._cover)
    this._group.add(this._coverPivot)

    // ─── LEFT PAGE (writable) ───
    this._pageCanvas = document.createElement('canvas')
    this._pageCanvas.width = 512; this._pageCanvas.height = 720
    this._pageCx = this._pageCanvas.getContext('2d')
    this._clearPage()
    this._pageTexture = new THREE.CanvasTexture(this._pageCanvas)

    this._pageLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.0),
      new THREE.MeshBasicMaterial({ map: this._pageTexture })
    )
    this._pageLeft.rotation.x = -Math.PI / 2
    this._pageLeft.position.set(-0.75, 0.08, 0)
    this._pageLeft.visible = false
    this._group.add(this._pageLeft)

    // ─── RIGHT PAGE (map) ───
    this._mapCanvas = document.createElement('canvas')
    this._mapCanvas.width = 512; this._mapCanvas.height = 720
    this._mapCx = this._mapCanvas.getContext('2d')
    this._clearMap()
    this._mapTexture = new THREE.CanvasTexture(this._mapCanvas)

    this._pageRight = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.0),
      new THREE.MeshBasicMaterial({ map: this._mapTexture })
    )
    this._pageRight.rotation.x = -Math.PI / 2
    this._pageRight.position.set(0.75, 0.08, 0)
    this._pageRight.visible = false
    this._group.add(this._pageRight)

    // ─── QUILL ───
    const quillG = new THREE.Group()
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }))
    tip.position.y = -0.04
    quillG.add(tip)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0xccbb88 }))
    shaft.position.y = 0.14
    quillG.add(shaft)
    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.2), new THREE.MeshBasicMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }))
    feather.position.set(0.03, 0.28, 0); feather.rotation.z = 0.3
    quillG.add(feather)
    this._quill = quillG
    this._quill.visible = false
    this._quill.rotation.x = -0.5; this._quill.rotation.z = 0.2
    this._group.add(this._quill)

    // ─── LIGHT ───
    const light = new THREE.PointLight(0xffcc88, 2, 8)
    light.position.set(0, 3, 1)
    this._group.add(light)
    this._group.add(new THREE.AmbientLight(0x333333, 0.8))

    // ─── INITIAL STATE: book at center, scale 0 ───
    this._group.position.set(0, 0, 0)
    this._group.scale.setScalar(0.01)

    // ─── DOM buttons ───
    this._skipBtn = document.createElement('button')
    this._skipBtn.textContent = 'Passer ▶▶'
    this._skipBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:200;padding:8px 16px;border-radius:6px;cursor:pointer;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5);font:12px VT323,monospace;'
    this._skipBtn.addEventListener('click', () => this.skip())
    document.body.appendChild(this._skipBtn)

    this._arrowBtn = document.createElement('button')
    this._arrowBtn.textContent = 'Entrer dans la forêt ▶'
    this._arrowBtn.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:200;padding:14px 28px;border-radius:10px;cursor:pointer;display:none;background:rgba(6,13,6,0.9);border:2px solid #33ff66;color:#33ff66;font:18px VT323,monospace;'
    this._arrowBtn.addEventListener('click', () => { this._state = STATES.FREEFALL; this._t = 0 })
    document.body.appendChild(this._arrowBtn)
  }

  // ─── LLM callbacks ───
  onTitleReady(title) { if (title) this._title = title }
  onIntroReady(text) { if (text) this._introText = text }
  onPathReady(events) {
    if (events?.length) {
      this._pathEvents = events
      this._pathPoints = []
      let px = 256, py = 660
      for (const ev of events.slice(0, 12)) {
        const nx = 50 + Math.random() * 410
        const ny = py - 35 - Math.random() * 25
        this._pathPoints.push({ x: px, y: py, nx, ny })
        px = nx; py = ny
      }
    }
  }
  onTerrainReady() {}
  setOnComplete(fn) { this._onComplete = fn }

  // ─── Canvas ───
  _clearPage() {
    const cx = this._pageCx, W = 512, H = 720
    cx.fillStyle = '#ede4d0'; cx.fillRect(0, 0, W, H)
    cx.strokeStyle = 'rgba(150,130,100,0.12)'; cx.lineWidth = 0.5
    for (let y = 70; y < 680; y += 24) { cx.beginPath(); cx.moveTo(35, y); cx.lineTo(477, y); cx.stroke() }
  }

  _clearMap() {
    const cx = this._mapCx, W = 512, H = 720
    cx.fillStyle = '#d8cba8'; cx.fillRect(0, 0, W, H)
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 2; cx.strokeRect(10, 10, W - 20, H - 20)
    cx.fillStyle = '#5a4a30'; cx.font = 'bold 16px Georgia, serif'
    cx.textAlign = 'center'; cx.fillText('Carte de la Quête', W / 2, 35); cx.textAlign = 'left'
  }

  _writeOnPage(charIdx) {
    this._clearPage()
    const cx = this._pageCx
    const title = this._title
    const text = this._introText
    const maxChars = Math.min(Math.floor(charIdx), text.length)

    // Title
    cx.fillStyle = '#3a2510'; cx.font = 'bold 20px Georgia, serif'
    cx.textAlign = 'center'; cx.fillText(title, 256, 45); cx.textAlign = 'left'
    // Divider
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 1
    cx.beginPath(); cx.moveTo(100, 55); cx.lineTo(412, 55); cx.stroke()

    // Body text (typewriter)
    cx.fillStyle = '#4a3520'; cx.font = 'italic 13px Georgia, serif'
    const visible = text.substring(0, maxChars)
    const words = visible.split(' ')
    let line = '', y = 78, maxW = 430
    for (const w of words) {
      const test = line + w + ' '
      if (cx.measureText(test).width > maxW) {
        cx.fillText(line.trim(), 40, y); line = w + ' '; y += 22
        if (y > 700) break
      } else { line = test }
    }
    if (line.trim()) cx.fillText(line.trim(), 40, y)

    // Cursor blink
    if (maxChars < text.length) {
      cx.fillStyle = '#3a2510'
      cx.fillRect(40 + cx.measureText(line.trim()).width + 2, y - 10, 1.5, 12)
    }

    this._pageTexture.needsUpdate = true
  }

  _drawMapPath(progress) {
    this._clearMap()
    const cx = this._mapCx, pts = this._pathPoints
    const count = Math.floor(progress * pts.length)

    // Draw path segments
    cx.strokeStyle = '#5a4a2a'; cx.lineWidth = 2.5; cx.lineCap = 'round'
    for (let i = 0; i < count && i < pts.length; i++) {
      const p = pts[i]
      cx.beginPath(); cx.moveTo(p.x, p.y)
      cx.quadraticCurveTo((p.x + p.nx) / 2 + (Math.random() - 0.5) * 20, (p.y + p.ny) / 2, p.nx, p.ny)
      cx.stroke()
      // Event rune dot
      cx.beginPath(); cx.arc(p.nx, p.ny, 5, 0, Math.PI * 2)
      cx.fillStyle = i % 3 === 0 ? '#cc6633' : '#33aa55'; cx.fill()
      cx.beginPath(); cx.arc(p.nx, p.ny, 8, 0, Math.PI * 2)
      cx.strokeStyle = 'rgba(51,170,85,0.25)'; cx.lineWidth = 1; cx.stroke()
      cx.lineWidth = 2.5; cx.strokeStyle = '#5a4a2a'
    }
    // Start marker
    if (pts.length > 0) {
      cx.beginPath(); cx.arc(pts[0].x, pts[0].y, 7, 0, Math.PI * 2)
      cx.fillStyle = '#cc3333'; cx.fill()
      cx.fillStyle = '#fff'; cx.font = 'bold 8px sans-serif'
      cx.textAlign = 'center'; cx.fillText('▶', pts[0].x, pts[0].y + 3); cx.textAlign = 'left'
    }

    this._mapTexture.needsUpdate = true
  }

  // ─── UPDATE ───
  update(dt) {
    this._t += dt
    const s = this._state
    const cam = this._camera

    // ═══ BOOK_APPEAR (3s): grow from center ═══
    if (s === STATES.BOOK_APPEAR) {
      const t = Math.min(1, this._t / 3.0)
      const e = easeOut(t)
      this._group.scale.setScalar(e)
      this._group.rotation.y = (1 - e) * 0.4
      // Camera starts high, looking down at book
      cam.position.set(0, 3 - e * 0.5, 2.5 - e * 0.3)
      cam.lookAt(0, 0, 0)
      if (t >= 1) { this._state = STATES.BOOK_OPEN; this._t = 0 }
    }

    // ═══ BOOK_OPEN (3s): cover flips on LEFT hinge ═══
    else if (s === STATES.BOOK_OPEN) {
      const t = Math.min(1, this._t / 3.0)
      const e = easeInOut(t)
      // Cover rotates around X axis (natural book opening)
      this._coverPivot.rotation.x = -Math.PI * e
      // Reveal pages at 40%
      if (e > 0.4) { this._pageLeft.visible = true }
      // Camera drifts down slightly
      cam.position.y = 2.5 - e * 0.5
      cam.lookAt(0, 0, 0)
      if (t >= 1) {
        this._cover.visible = false
        this._pageLeft.visible = true
        this._state = STATES.CAMERA_DOLLY; this._t = 0
      }
    }

    // ═══ CAMERA_DOLLY (2s): camera moves to face the open pages ═══
    else if (s === STATES.CAMERA_DOLLY) {
      const t = Math.min(1, this._t / 2.0)
      const e = easeInOut(t)
      // Move from above-behind to front-facing the left page
      const startPos = new THREE.Vector3(0, 2.0, 2.2)
      const endPos = new THREE.Vector3(-0.5, 1.8, 1.2)
      cam.position.lerpVectors(startPos, endPos, e)
      cam.lookAt(-0.5, 0, 0) // look at left page
      if (t >= 1) {
        this._quill.visible = true
        this._quill.position.set(-1.2, 0.2, -0.6)
        this._charIndex = 0
        this._state = STATES.WRITE_SCENARIO; this._t = 0
      }
    }

    // ═══ WRITE_SCENARIO (8s): quill writes title + intro on left page ═══
    else if (s === STATES.WRITE_SCENARIO) {
      this._charIndex += dt * 40 // 40 chars/sec
      this._writeOnPage(this._charIndex)

      // Animate quill position (follows text roughly)
      const writeProgress = Math.min(1, this._charIndex / Math.max(1, this._introText.length))
      this._quill.position.x = -1.1 + Math.sin(this._t * 3) * 0.15
      this._quill.position.z = -0.8 + writeProgress * 1.2
      this._quill.position.y = 0.15

      if (this._charIndex >= this._introText.length) {
        this._state = STATES.MAP_APPEAR; this._t = 0
      }
    }

    // ═══ MAP_APPEAR (1.5s): right page slides visible ═══
    else if (s === STATES.MAP_APPEAR) {
      this._pageRight.visible = true
      const t = Math.min(1, this._t / 1.5)
      const e = easeOut(t)
      this._pageRight.position.y = 0.08 + (1 - e) * 0.5

      // Camera shifts to see both pages
      cam.position.lerp(new THREE.Vector3(0, 2.0, 1.5), dt * 2)
      cam.lookAt(0, 0, 0)

      if (t >= 1) {
        this._pathProgress = 0
        this._state = STATES.DRAW_PATH; this._t = 0
      }
    }

    // ═══ DRAW_PATH (5s): quill draws path on map ═══
    else if (s === STATES.DRAW_PATH) {
      this._pathProgress = Math.min(1, this._t / 5.0)
      this._drawMapPath(this._pathProgress)

      // Quill moves to right page
      this._quill.position.set(0.4 + Math.sin(this._t * 2) * 0.2, 0.15, -0.5 + this._pathProgress * 0.8)

      // Camera zooms slightly toward map
      cam.position.lerp(new THREE.Vector3(0.5, 1.6, 1.3), dt)
      cam.lookAt(0.5, 0, 0)

      if (this._pathProgress >= 1) {
        this._quill.visible = false
        this._arrowBtn.style.display = 'block'
        this._state = STATES.WAIT_CLICK; this._t = 0
      }
    }

    // ═══ WAIT_CLICK: player clicks "Entrer dans la forêt" ═══
    else if (s === STATES.WAIT_CLICK) {
      // Gentle idle bob
      cam.position.y = 1.6 + Math.sin(this._t * 0.5) * 0.02
    }

    // ═══ FREEFALL (2.5s): camera zooms into map then falls ═══
    else if (s === STATES.FREEFALL) {
      this._arrowBtn.style.display = 'none'
      const t = Math.min(1, this._t / 2.5)
      const e = easeInOut(t)

      if (t < 0.5) {
        // Zoom into map
        cam.position.lerp(new THREE.Vector3(0.75, 0.5, 0.3), e * 0.15)
        cam.lookAt(0.75, 0, 0)
      } else {
        // Book shrinks, screen goes dark
        this._group.scale.setScalar(Math.max(0.01, 1 - (t - 0.5) * 2))
        this._group.position.y -= dt * 3
      }

      if (t >= 1) {
        this._state = STATES.DONE
        this._cleanup()
        this._onComplete?.()
      }
    }
  }

  skip() { this._cleanup(); this._onComplete?.() }
  isDone() { return this._state === STATES.DONE }
  getState() { return this._state }

  _cleanup() {
    this._state = STATES.DONE
    this._scene.remove(this._group)
    this._skipBtn?.remove()
    this._arrowBtn?.remove()
    this._group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose()
        obj.material.dispose()
      }
    })
  }
}

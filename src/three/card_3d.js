// M.E.R.L.I.N. — 3D Card System (Hand of Fate 2 style)
// Animated card mesh: flip, glow, hover, select
// Uses CanvasTexture for dynamic face generation

import * as THREE from 'three'

const CARD_W = 2.0, CARD_H = 2.8
const FLIP_DUR = 0.6, FLIP_OUT_DUR = 0.4

// Faction colors for card border
const FACTION_COLORS = {
  druides: '#33aa55', anciens: '#aa8833', korrigans: '#aa55aa',
  niamh: '#4488cc', ankou: '#884444', guerriers: '#cc4444',
  pretresses: '#aa55cc', marins: '#4488aa',
}

function _createFaceTexture(card, parchment, choices) {
  const cv = document.createElement('canvas')
  const texW = 1024, texH = 1536
  cv.width = texW; cv.height = texH
  const cx = cv.getContext('2d')
  const margin = 36

  if (parchment) {
    // --- PARCHMENT SCROLL STYLE ---
    // Base warm beige gradient
    const grad = cx.createLinearGradient(0, 0, 0, texH)
    grad.addColorStop(0, '#d4c5a0')
    grad.addColorStop(0.3, '#cebf98')
    grad.addColorStop(0.7, '#c2b080')
    grad.addColorStop(1, '#b0a068')
    cx.fillStyle = grad
    cx.fillRect(0, 0, texW, texH)

    // Noise / stain effect — semi-transparent brown circles
    const stains = [
      { x: 360, y: 540, r: 90 }, { x: 120, y: 200, r: 60 },
      { x: 250, y: 650, r: 50 }, { x: 80, y: 500, r: 70 },
      { x: 400, y: 150, r: 45 }, { x: 300, y: 380, r: 55 },
    ]
    for (const s of stains) {
      cx.fillStyle = `rgba(120,100,60,${0.04 + Math.random() * 0.06})`
      cx.beginPath()
      cx.arc(s.x, s.y, s.r + Math.random() * 20, 0, Math.PI * 2)
      cx.fill()
    }
    // Additional tiny speckles
    for (let i = 0; i < 30; i++) {
      cx.fillStyle = `rgba(100,80,40,${0.03 + Math.random() * 0.05})`
      cx.beginPath()
      cx.arc(Math.random() * texW, Math.random() * texH, 3 + Math.random() * 12, 0, Math.PI * 2)
      cx.fill()
    }

    // Ornate double-line border (darker brown)
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 4
    cx.strokeRect(10, 10, texW - 20, texH - 20)
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 2
    cx.strokeRect(18, 18, texW - 36, texH - 36)

    // Title — dark brown, large serif
    cx.fillStyle = '#1a0800'
    cx.font = `bold ${Math.round(texH * 0.04)}px "Times New Roman", Georgia, serif`
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    cx.fillText((card.title || '').slice(0, 30), texW / 2, texH * 0.08)

    // Ornamental divider under title
    const divY = texH * 0.12
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 1.5
    cx.beginPath(); cx.moveTo(margin + 20, divY); cx.lineTo(texW - margin - 20, divY); cx.stroke()
    // Small diamond in center of divider
    cx.fillStyle = '#8a7040'
    cx.beginPath()
    cx.moveTo(texW / 2, divY - 5)
    cx.lineTo(texW / 2 + 5, divY)
    cx.lineTo(texW / 2, divY + 5)
    cx.lineTo(texW / 2 - 5, divY)
    cx.closePath()
    cx.fill()

    // Body text OMITTED from initial texture — animateText() reveals it progressively
    // Bottom line also omitted — added by _renderPage() after animation completes

    // No faction label for parchment

  } else {
    // --- ENCOUNTER CARD — Organic parchment (matches 3D forest aesthetic) ---
    const grad = cx.createLinearGradient(0, 0, 0, texH)
    grad.addColorStop(0, 'rgba(180, 165, 130, 0.94)')
    grad.addColorStop(0.4, 'rgba(165, 150, 115, 0.96)')
    grad.addColorStop(1, 'rgba(140, 125, 90, 0.94)')
    cx.fillStyle = grad
    cx.fillRect(0, 0, texW, texH)

    // Subtle parchment noise texture
    for (let i = 0; i < 100; i++) {
      cx.fillStyle = `rgba(${100 + Math.random() * 40}, ${80 + Math.random() * 30}, ${50 + Math.random() * 20}, 0.04)`
      cx.fillRect(Math.random() * texW, Math.random() * texH, 3 + Math.random() * 8, 3 + Math.random() * 8)
    }

    const fCol = FACTION_COLORS[card._faction] || '#aa8833'

    // Warm border (faction-tinted)
    cx.strokeStyle = fCol
    cx.lineWidth = 4
    cx.strokeRect(6, 6, texW - 12, texH - 12)

    // Inner border (double frame like parchment)
    cx.strokeStyle = 'rgba(120, 100, 60, 0.3)'
    cx.lineWidth = 1
    cx.strokeRect(14, 14, texW - 28, texH - 28)

    // Faction header tint
    cx.fillStyle = fCol
    cx.globalAlpha = 0.1
    cx.fillRect(14, 14, texW - 28, texH * 0.11)
    cx.globalAlpha = 1

    // Title — dark brown, serif, medieval feel
    cx.fillStyle = '#3a2810'
    cx.font = `bold ${Math.round(texH * 0.034)}px Georgia, 'Times New Roman', serif`
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    cx.fillText((card.title || 'Rencontre').slice(0, 28), texW / 2, texH * 0.07)

    // Ornamental divider
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 1.5
    cx.beginPath()
    cx.moveTo(margin + 40, texH * 0.12)
    cx.lineTo(texW - margin - 40, texH * 0.12)
    cx.stroke()
    // Center diamond ornament
    const divY = texH * 0.12
    cx.fillStyle = '#8a7040'
    cx.beginPath(); cx.moveTo(texW / 2, divY - 5); cx.lineTo(texW / 2 + 5, divY); cx.lineTo(texW / 2, divY + 5); cx.lineTo(texW / 2 - 5, divY); cx.fill()

    // Body text — dark brown on parchment, italic serif
    cx.fillStyle = '#4a3520'
    cx.font = `italic ${Math.round(texH * 0.024)}px Georgia, 'Times New Roman', serif`
    cx.textAlign = 'left'
    cx.textBaseline = 'top'
    const text = card.text || ''
    const textWords = text.split(' ')
    let bodyLine = '', bodyY = texH * 0.15
    const maxBodyW = texW - margin * 2
    const bodyLineH = Math.round(texH * 0.034)
    const bodyYLimit = choices?.length ? texH * 0.58 : texH * 0.82
    for (const w of textWords) {
      const test = bodyLine + w + ' '
      if (cx.measureText(test).width > maxBodyW) {
        cx.fillText(bodyLine.trim(), margin, bodyY)
        bodyLine = w + ' '
        bodyY += bodyLineH
        if (bodyY > bodyYLimit) break
      } else {
        bodyLine = test
      }
    }
    if (bodyLine.trim()) cx.fillText(bodyLine.trim(), margin, bodyY)

    // --- CHOICES — parchment style, warm tones ---
    if (choices?.length) {
      const choiceY = texH * 0.63

      // Ornamental separator
      cx.strokeStyle = '#8a7040'
      cx.lineWidth = 1
      cx.beginPath(); cx.moveTo(margin + 20, choiceY - 8); cx.lineTo(texW - margin - 20, choiceY - 8); cx.stroke()

      const dotColors = ['#2a6a2a', '#8a6a20', '#2a4a6a'] // forest green, amber, deep blue
      const choiceH = (texH * 0.32) / 3

      for (let i = 0; i < choices.length && i < 3; i++) {
        const cy = choiceY + i * choiceH + choiceH / 2

        // Subtle choice zone tint
        cx.fillStyle = 'rgba(120, 100, 60, 0.06)'
        cx.fillRect(margin, cy - choiceH * 0.38, texW - margin * 2, choiceH * 0.76)

        // Dot (small filled circle)
        cx.beginPath()
        cx.arc(margin + 12, cy, 7, 0, Math.PI * 2)
        cx.fillStyle = dotColors[i]
        cx.fill()

        // Label — dark brown serif, readable on parchment
        cx.fillStyle = '#3a2810'
        cx.font = `${Math.round(texH * 0.023)}px Georgia, 'Times New Roman', serif`
        cx.textAlign = 'left'
        cx.textBaseline = 'middle'
        const label = (typeof choices[i] === 'string' ? choices[i] : choices[i].label || '').slice(0, 36)
        cx.fillText(label, margin + 28, cy)

        // Preview hint if available
        const preview = choices[i]?.preview
        if (preview) {
          cx.fillStyle = '#7a6a50'
          cx.font = `italic ${Math.round(texH * 0.016)}px Georgia, serif`
          cx.fillText(preview.slice(0, 30), margin + 28, cy + texH * 0.022)
        }
      }
    }

    // Faction tag — muted, bottom right
    cx.fillStyle = fCol
    cx.font = `bold ${Math.round(texH * 0.015)}px Georgia, serif`
    cx.textAlign = 'right'
    cx.textBaseline = 'bottom'
    cx.fillText((card._faction || '').toUpperCase(), texW - margin, texH - 14)

    // Scene tag if available
    if (card.scene_tag) {
      cx.fillStyle = 'rgba(51, 255, 102, 0.5)'
      cx.font = `${Math.round(texH * 0.014)}px 'VT323', monospace`
      cx.fillText(card.scene_tag.toUpperCase(), texW - margin, texH - 34)
    }
  }

  return new THREE.CanvasTexture(cv)
}

function _createBackTexture() {
  const cv = document.createElement('canvas')
  cv.width = 1024; cv.height = 1536
  const cx = cv.getContext('2d')

  // Dark background
  cx.fillStyle = '#0a1a0a'
  cx.fillRect(0, 0, 1024, 1536)

  // Border
  cx.strokeStyle = '#554422'
  cx.lineWidth = 5
  cx.strokeRect(16, 16, 992, 1504)

  // Celtic knot pattern (simplified)
  cx.strokeStyle = '#443322'
  cx.lineWidth = 2.5
  for (let i = 0; i < 8; i++) {
    const y = 192 + i * 160
    cx.beginPath()
    cx.moveTo(160, y)
    cx.bezierCurveTo(360, y - 60, 664, y + 60, 864, y)
    cx.stroke()
    cx.beginPath()
    cx.moveTo(160, y + 80)
    cx.bezierCurveTo(360, y + 140, 664, y + 20, 864, y + 80)
    cx.stroke()
  }

  // Center logo
  cx.fillStyle = '#665533'
  cx.font = 'bold 72px sans-serif'
  cx.textAlign = 'center'
  cx.textBaseline = 'middle'
  cx.fillText('M.E.R.L.I.N.', 512, 768)

  return new THREE.CanvasTexture(cv)
}

// Shared back texture (created once)
let _backTex = null
function getBackTex() {
  if (!_backTex) _backTex = _createBackTexture()
  return _backTex
}

/**
 * Compute choice zones for raycasting (normalized UV coordinates).
 * Returns array of { yMin, yMax } in canvas-space fractions.
 */
function _computeChoiceZones(choices) {
  if (!choices?.length) return null
  const texH = 1536
  const choiceY = texH * 0.68
  const choiceH = (texH * 0.28) / 3
  return choices.slice(0, 3).map((_, i) => ({
    yMin: (choiceY + i * choiceH) / texH,
    yMax: (choiceY + (i + 1) * choiceH) / texH,
  }))
}

/**
 * Split long text into pages that fit within the parchment text area.
 * Uses a temporary canvas to measure text width.
 */
function _splitTextToPages(text, fontSpec, maxW, startY, lineH, maxY) {
  const cv = document.createElement('canvas')
  cv.width = 100; cv.height = 100
  const cx = cv.getContext('2d')
  cx.font = fontSpec

  const words = text.split(' ')
  const pages = []
  let pageLines = [], line = '', y = startY

  for (const w of words) {
    const test = line + w + ' '
    if (cx.measureText(test).width > maxW) {
      pageLines.push(line.trim())
      line = w + ' '
      y += lineH
      if (y + lineH > maxY) {
        pages.push(pageLines.join('\n'))
        pageLines = []
        y = startY
      }
    } else {
      line = test
    }
  }
  if (line.trim()) pageLines.push(line.trim())
  if (pageLines.length) pages.push(pageLines.join('\n'))
  return pages.length ? pages : [text]
}

export class Card3D {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera  — currently unused but reserved
   * @param {Object} opts
   * @param {THREE.Vector3} opts.position
   * @param {Object} opts.card
   * @param {Function} opts.onChoice
   * @param {boolean} opts.parchment
   * @param {Array} opts.choices
   */
  constructor(scene, camera, { position, card, onChoice, parchment = false, choices = [] } = {}) {
    this._scene = scene
    this._camera = camera
    this._parchment = parchment
    this._choices = choices
    this._onChoice = onChoice || null
    this._choiceZones = _computeChoiceZones(choices)
    this._group = null
    this._light = null
    this._tween = null // { start, duration, from, to, easing, onUpdate, onComplete }
    this._state = 'idle' // idle | flipping_in | visible | flipping_out | dismissed
    this._pages = []
    this._currentPage = 0
    this._totalPages = 0

    // Auto-spawn if card + position provided
    if (card && position) {
      this.spawn(position, card)
    }
  }

  /**
   * Return choice index at the given UV coordinate, or -1.
   * UV comes from a raycast intersection on the front face.
   */
  getChoiceAtUV(uv) {
    if (!this._choiceZones) return -1
    const y = 1 - uv.y // canvas Y is inverted from UV
    for (let i = 0; i < this._choiceZones.length; i++) {
      if (y >= this._choiceZones[i].yMin && y < this._choiceZones[i].yMax) return i
    }
    return -1
  }

  /**
   * Spawn card at position, facing camera. Starts face-down.
   */
  spawn(position, card) {
    this.dismiss()

    const faceTex = _createFaceTexture(card, this._parchment, this._choices)

    // Pre-compute pages for parchment scrolls
    if (this._parchment && card.text) {
      const texH = 1536, margin = 36
      const fontSpec = `italic ${Math.round(texH * 0.026)}px "Times New Roman", Georgia, serif`
      const maxW = 1024 - margin * 2
      const startY = texH * 0.16
      const lineH = Math.round(texH * 0.034)
      const maxY = texH * 0.82
      this._pages = _splitTextToPages(card.text, fontSpec, maxW, startY, lineH, maxY)
      this._totalPages = this._pages.length
      this._currentPage = 0
      this._cardData = card // store for re-rendering
      // Re-render page 0 with page indicator
      if (this._totalPages > 1) {
        this._renderPage(0)
      }
    }

    const backTex = getBackTex()

    // Front face — standard PlaneGeometry, DoubleSide so visible from both directions
    const frontGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)
    const front = new THREE.Mesh(frontGeo, new THREE.MeshBasicMaterial({
      map: faceTex, side: THREE.DoubleSide
    }))
    front.position.z = 0.002

    // Back face — rotated PI so pattern faces outward
    const backGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)
    const back = new THREE.Mesh(backGeo, new THREE.MeshBasicMaterial({
      map: backTex, side: THREE.DoubleSide
    }))
    back.rotation.y = Math.PI
    back.position.z = -0.002

    this._group = new THREE.Group()
    this._group.add(front)
    this._group.add(back)
    this._group.position.copy(position)

    // Glow light
    const fCol = this._parchment ? '#c8a860' : (FACTION_COLORS[card._faction] || '#aa8833')
    this._light = new THREE.PointLight(new THREE.Color(fCol), 0.8, 5)
    this._light.position.set(0, 0, 0.3)
    this._group.add(this._light)

    this._group.scale.set(0.01, 0.01, 0.01)
    this._scene.add(this._group)
    this._state = 'idle'
  }

  /** Orient card to face a target position (call before flipIn) */
  faceCamera(camPos) {
    if (!this._group) return
    // Rotate Y so the plane normal (+Z) points toward camera
    const dx = camPos.x - this._group.position.x
    const dz = camPos.z - this._group.position.z
    this._group.rotation.y = Math.atan2(dx, dz)
  }

  /**
   * Flip in: scale up + rotate to show face + float-up from below
   */
  flipIn(camPos) {
    if (!this._group) return Promise.resolve()
    this._state = 'flipping_in'

    // Face the camera using manual Y rotation
    if (camPos) this.faceCamera(camPos)
    const baseRotY = this._group.rotation.y

    // Float-up: start 0.5 below target position
    const targetY = this._group.position.y
    this._group.position.y = targetY - 0.5

    return new Promise(resolve => {
      const start = performance.now()
      const animate = () => {
        const elapsed = (performance.now() - start) / 1000
        const t = Math.min(elapsed / FLIP_DUR, 1)
        const c1 = 1.70158, c3 = c1 + 1
        const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)

        // Scale up from 0 — card already faces camera
        this._group.scale.setScalar(Math.max(0.01, ease))

        // Float up from -0.5 to target Y (eased)
        this._group.position.y = targetY - 0.5 * (1 - ease)

        // Keep facing camera, no extra rotation
        this._group.rotation.y = baseRotY

        if (this._light) this._light.intensity = 0.4 + ease * 0.6

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          this._group.position.y = targetY
          this._state = 'visible'
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Drop card from sky with bounce — for intro/cinematic
   */
  dropFromSky(camPos) {
    if (!this._group) return Promise.resolve()
    this._state = 'flipping_in'
    if (camPos) this.faceCamera(camPos)

    const targetY = this._group.position.y
    this._group.position.y = targetY + 8
    this._group.scale.setScalar(0.3)

    return new Promise(resolve => {
      const start = performance.now()
      const dur = 0.9
      const animate = () => {
        const t = Math.min((performance.now() - start) / 1000 / dur, 1)
        // EaseOutBounce
        let ease
        if (t < 1 / 2.75) { ease = 7.5625 * t * t }
        else if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; ease = 7.5625 * t2 * t2 + 0.75 }
        else if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; ease = 7.5625 * t2 * t2 + 0.9375 }
        else { const t2 = t - 2.625 / 2.75; ease = 7.5625 * t2 * t2 + 0.984375 }

        this._group.position.y = targetY + 8 * (1 - ease)
        this._group.scale.setScalar(0.3 + 0.7 * ease)
        if (this._light) this._light.intensity = ease * 0.8

        if (t < 1) requestAnimationFrame(animate)
        else { this._state = 'visible'; resolve() }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Subtle scale pulse (1.0 → 1.05 → 1.0 over 300ms) — call after text finishes writing
   */
  pulseScale() {
    if (!this._group || this._state !== 'visible') return Promise.resolve()
    return new Promise(resolve => {
      const start = performance.now()
      const dur = 300
      const animate = () => {
        const t = Math.min((performance.now() - start) / dur, 1)
        // Sine curve: 0 → 1 → 0
        const pulse = Math.sin(t * Math.PI)
        this._group.scale.setScalar(1.0 + pulse * 0.05)
        if (t < 1) requestAnimationFrame(animate)
        else { this._group.scale.setScalar(1.0); resolve() }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Brief emissive glow flash on card edges (200ms)
   */
  flashEdgeGlow() {
    if (!this._group) return Promise.resolve()
    const front = this._group.children[0]
    if (!front?.material) return Promise.resolve()

    // Switch to MeshStandardMaterial temporarily for emissive support
    const oldMat = front.material
    const glowMat = new THREE.MeshStandardMaterial({
      map: oldMat.map,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0xffcc55),
      emissiveIntensity: 0.0,
    })
    front.material = glowMat

    return new Promise(resolve => {
      const start = performance.now()
      const dur = 200
      const animate = () => {
        const t = Math.min((performance.now() - start) / dur, 1)
        // Flash up then down
        const intensity = Math.sin(t * Math.PI) * 0.4
        glowMat.emissiveIntensity = intensity
        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          // Restore original material
          front.material = oldMat
          glowMat.dispose()
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Animate text appearing on card face (typewriter on CanvasTexture)
   */
  animateText(card, charsPerSec = 50) {
    if (!this._group) return Promise.resolve()
    const front = this._group.children[0]
    if (!front?.material?.map) return Promise.resolve()

    const fullText = card.text || ''
    // Batch chars per render to avoid 1024x1536 canvas thrashing
    const charsPerTick = Math.max(3, Math.ceil(charsPerSec / 15))
    const interval = Math.max(33, 1000 * charsPerTick / charsPerSec) // ~15 renders/sec max

    return new Promise(resolve => {
      let charCount = 0
      const tick = setInterval(() => {
        charCount += charsPerTick
        if (charCount >= fullText.length) {
          charCount = fullText.length
          clearInterval(tick)
          this._updateFaceTexture(front, card, charCount)
          resolve()
          return
        }
        this._updateFaceTexture(front, card, charCount)
      }, interval)
    })
  }

  _updateFaceTexture(mesh, card, charCount) {
    const cv = document.createElement('canvas')
    const texW = 1024, texH = 1536
    cv.width = texW; cv.height = texH
    const cx = cv.getContext('2d')
    const margin = 36
    const isParchment = this._parchment

    if (isParchment) {
      const grad = cx.createLinearGradient(0, 0, 0, texH)
      grad.addColorStop(0, '#d4c5a0'); grad.addColorStop(0.5, '#cebf98'); grad.addColorStop(1, '#b0a068')
      cx.fillStyle = grad; cx.fillRect(0, 0, texW, texH)
      // Border
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 4; cx.strokeRect(10, 10, texW - 20, texH - 20)
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 2; cx.strokeRect(18, 18, texW - 36, texH - 36)
      // Stains
      cx.fillStyle = 'rgba(120,100,60,0.06)'
      cx.beginPath(); cx.arc(360, 540, 80, 0, Math.PI * 2); cx.fill()
      cx.beginPath(); cx.arc(120, 200, 50, 0, Math.PI * 2); cx.fill()
      // Title
      cx.fillStyle = '#1a0800'
      cx.font = `bold ${Math.round(texH * 0.045)}px "Times New Roman", Georgia, serif`
      cx.textAlign = 'center'; cx.textBaseline = 'middle'
      cx.fillText((card.title || '').slice(0, 30), texW / 2, texH * 0.07)
      // Divider
      cx.strokeStyle = '#8a7040'; cx.lineWidth = 1.5
      cx.beginPath(); cx.moveTo(margin + 20, texH * 0.1); cx.lineTo(texW - margin - 20, texH * 0.1); cx.stroke()
    } else {
      const grad = cx.createLinearGradient(0, 0, 0, texH)
      grad.addColorStop(0, '#1a2a15'); grad.addColorStop(1, '#0a1508')
      cx.fillStyle = grad; cx.fillRect(0, 0, texW, texH)
      const fCol = FACTION_COLORS[card._faction] || '#aa8833'
      cx.strokeStyle = fCol; cx.lineWidth = 5; cx.strokeRect(8, 8, texW - 16, texH - 16)
      cx.fillStyle = '#ffcc55'
      cx.font = `bold ${Math.round(texH * 0.042)}px Inter, sans-serif`
      cx.textAlign = 'center'; cx.textBaseline = 'middle'
      cx.fillText((card.title || '').slice(0, 24), texW / 2, texH * 0.065)
      cx.strokeStyle = fCol; cx.lineWidth = 1.5
      cx.beginPath(); cx.moveTo(margin, texH * 0.1); cx.lineTo(texW - margin, texH * 0.1); cx.stroke()
    }

    // Text (progressive reveal)
    cx.fillStyle = isParchment ? '#1a0800' : '#aaddaa'
    cx.font = isParchment
      ? `italic ${Math.round(texH * 0.03)}px "Times New Roman", Georgia, serif`
      : `${Math.round(texH * 0.03)}px Inter, sans-serif`
    cx.textAlign = 'left'; cx.textBaseline = 'top'
    const visibleText = (card.text || '').slice(0, charCount)
    const words = visibleText.split(' ')
    let line = '', y = texH * 0.13
    const maxTextW = texW - margin * 2
    const lineH = Math.round(texH * 0.04)
    for (const w of words) {
      const test = line + w + ' '
      if (cx.measureText(test).width > maxTextW) {
        cx.fillText(line.trim(), margin, y)
        line = w + ' '
        y += lineH
        if (y > texH * 0.82) break
      } else {
        line = test
      }
    }
    if (line.trim()) cx.fillText(line.trim(), margin, y)

    // Cursor blink
    if (charCount < (card.text || '').length) {
      cx.fillStyle = isParchment ? '#4a3520' : '#33ff66'
      cx.fillText('\u2588', cx.measureText(line).width + margin + 2, y)
    }

    const tex = new THREE.CanvasTexture(cv)
    mesh.material.map = tex
    mesh.material.needsUpdate = true
  }

  /**
   * Flip 180deg in place (toggle front/back)
   */
  flip() {
    if (!this._group || this._state !== 'visible') return Promise.resolve()
    this._state = 'flipping_in'
    const startRot = this._group.rotation.y
    const targetRot = startRot + Math.PI

    return new Promise(resolve => {
      const start = performance.now()
      const dur = 0.5
      const animate = () => {
        const t = Math.min((performance.now() - start) / 1000 / dur, 1)
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
        this._group.rotation.y = startRot + Math.PI * ease
        if (t < 1) requestAnimationFrame(animate)
        else { this._state = 'visible'; resolve() }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Flip out: rotate + scale down + remove
   */
  flipOut() {
    if (!this._group) return Promise.resolve()
    this._state = 'flipping_out'

    return new Promise(resolve => {
      const start = performance.now()
      const animate = () => {
        const elapsed = (performance.now() - start) / 1000
        const t = Math.min(elapsed / FLIP_OUT_DUR, 1)
        // EaseInCubic
        const ease = t * t * t

        this._group.scale.setScalar(1 - ease * 0.9)
        this._group.position.y += 0.008

        if (this._light) this._light.intensity = 1 - ease

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          this.dismiss()
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })
  }

  /**
   * Hover animation (call in update loop)
   */
  update(elapsed) {
    if (!this._group || this._state !== 'visible') return
    // Gentle float
    this._group.position.y += Math.sin(elapsed * 2) * 0.0003
    // Subtle rotation
    this._group.rotation.z = Math.sin(elapsed * 1.5) * 0.02
    // Light pulse
    if (this._light) {
      this._light.intensity = 0.6 + Math.sin(elapsed * 3) * 0.2
    }
  }

  /**
   * Remove from scene
   */
  dismiss() {
    if (this._group) {
      this._scene.remove(this._group)
      this._group.traverse(c => {
        if (c.geometry) c.geometry.dispose()
        if (c.material) {
          if (c.material.map) c.material.map.dispose()
          c.material.dispose()
        }
      })
      this._group = null
      this._light = null
    }
    this._choiceZones = null
    this._state = 'dismissed'
  }

  /**
   * Highlight a choice zone (hover effect) — brightens emissive on front material.
   * Pass -1 to clear highlight.
   */
  highlightChoice(choiceIdx) {
    if (this._highlightedChoice === choiceIdx) return
    this._highlightedChoice = choiceIdx

    const front = this._group?.children[0]
    if (!front?.material) return

    if (choiceIdx >= 0 && this._choiceZones?.[choiceIdx]) {
      // Apply subtle brightness boost via emissive on a StandardMaterial
      if (!this._hoverMat) {
        const oldMat = front.material
        this._hoverMat = new THREE.MeshStandardMaterial({
          map: oldMat.map,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.08,
        })
        this._originalMat = oldMat
      }
      front.material = this._hoverMat
      // Sync map in case texture changed
      if (this._originalMat?.map) this._hoverMat.map = this._originalMat.map
    } else {
      // Restore original material
      if (this._originalMat) {
        front.material = this._originalMat
        if (this._hoverMat) { this._hoverMat.dispose(); this._hoverMat = null }
        this._originalMat = null
      }
    }
  }

  /**
   * Flash the card white briefly (100ms) — call on choice click before processing.
   */
  flashChoiceConfirm() {
    return new Promise(resolve => {
      const el = document.createElement('div')
      el.style.cssText = `
        position:fixed;inset:0;z-index:55;
        background:rgba(255,255,255,0.25);
        pointer-events:none;
        transition:opacity 100ms;
      `
      document.body.appendChild(el)
      requestAnimationFrame(() => {
        el.style.opacity = '0'
        setTimeout(() => { el.remove(); resolve() }, 100)
      })
    })
  }

  get state() { return this._state }
  get group() { return this._group }
  get parchment() { return this._parchment }
  get choices() { return this._choices }
  get choiceZones() { return this._choiceZones }
  get pageCount() { return this._totalPages || 1 }
  get currentPageIndex() { return this._currentPage || 0 }
  get isLastPage() { return (this._currentPage || 0) >= (this._totalPages || 1) - 1 }

  /**
   * Flip to next page with squeeze animation.
   */
  nextPage() {
    if (!this._group || this._currentPage >= this._totalPages - 1) return Promise.resolve()
    this._currentPage++

    const front = this._group.children[0]
    if (!front?.material) return Promise.resolve()
    const baseRotY = this._group.rotation.y

    return new Promise(resolve => {
      const start = performance.now()
      const phase1 = () => {
        const t = Math.min((performance.now() - start) / 300, 1)
        this._group.scale.x = Math.max(0.01, 1 - t)
        if (t < 1) { requestAnimationFrame(phase1); return }

        // At midpoint: swap texture
        this._renderPage(this._currentPage)

        const start2 = performance.now()
        const phase2 = () => {
          const t2 = Math.min((performance.now() - start2) / 300, 1)
          const ease = 1 - (1 - t2) * (1 - t2)
          this._group.scale.x = 0.01 + ease * 0.99
          if (t2 < 1) { requestAnimationFrame(phase2); return }
          this._group.scale.x = 1
          resolve()
        }
        requestAnimationFrame(phase2)
      }
      requestAnimationFrame(phase1)
    })
  }

  /**
   * Re-render the parchment texture for a specific page.
   */
  _renderPage(pageIdx) {
    if (!this._cardData || !this._pages?.[pageIdx]) return
    const front = this._group?.children[0]
    if (!front?.material) return

    const pageText = this._pages[pageIdx]
    const isLast = pageIdx >= this._totalPages - 1

    const cv = document.createElement('canvas')
    const texW = 1024, texH = 1536
    cv.width = texW; cv.height = texH
    const cx = cv.getContext('2d')
    const margin = 36

    // Parchment background
    const grad = cx.createLinearGradient(0, 0, 0, texH)
    grad.addColorStop(0, '#d4c5a0')
    grad.addColorStop(0.5, '#cebf98')
    grad.addColorStop(1, '#b0a068')
    cx.fillStyle = grad
    cx.fillRect(0, 0, texW, texH)

    // Stains
    cx.fillStyle = 'rgba(120,100,60,0.06)'
    cx.beginPath(); cx.arc(720, 1080, 160, 0, Math.PI * 2); cx.fill()
    cx.beginPath(); cx.arc(240, 400, 100, 0, Math.PI * 2); cx.fill()

    // Border
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 6
    cx.strokeRect(14, 14, texW - 28, texH - 28)
    cx.strokeStyle = '#8a7040'
    cx.lineWidth = 3
    cx.strokeRect(24, 24, texW - 48, texH - 48)

    // Title only on first page
    if (pageIdx === 0) {
      cx.fillStyle = '#1a0800'
      cx.font = `bold ${Math.round(texH * 0.04)}px "Times New Roman", Georgia, serif`
      cx.textAlign = 'center'
      cx.textBaseline = 'middle'
      cx.fillText((this._cardData.title || '').slice(0, 40), texW / 2, texH * 0.08)

      cx.strokeStyle = '#8a7040'
      cx.lineWidth = 2
      cx.beginPath()
      cx.moveTo(margin + 30, texH * 0.12)
      cx.lineTo(texW - margin - 30, texH * 0.12)
      cx.stroke()

      cx.fillStyle = '#8a7040'
      cx.beginPath()
      cx.moveTo(texW / 2, texH * 0.12 - 7)
      cx.lineTo(texW / 2 + 7, texH * 0.12)
      cx.lineTo(texW / 2, texH * 0.12 + 7)
      cx.lineTo(texW / 2 - 7, texH * 0.12)
      cx.closePath()
      cx.fill()
    }

    // Body text
    cx.fillStyle = '#1a0800'
    cx.font = `italic ${Math.round(texH * 0.026)}px "Times New Roman", Georgia, serif`
    cx.textAlign = 'left'
    cx.textBaseline = 'top'
    const startY = pageIdx === 0 ? texH * 0.16 : texH * 0.06
    const lines = pageText.split('\n')
    const lineH = Math.round(texH * 0.034)
    let y = startY
    for (const l of lines) {
      if (y > texH * 0.85) break
      cx.fillText(l, margin, y)
      y += lineH
    }

    // Page indicator
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
    if (isLast) {
      cx.fillStyle = '#4a3520'
      cx.font = `italic ${Math.round(texH * 0.022)}px "Times New Roman", Georgia, serif`
      cx.fillText('Entrer dans la for\u00eat \u25B6', texW / 2, texH * 0.93)
    } else {
      cx.fillStyle = '#8a6030'
      cx.font = `${Math.round(texH * 0.018)}px "Times New Roman", Georgia, serif`
      cx.fillText(`Page ${pageIdx + 1}/${this._totalPages} \u2014 Tournez \u25B6`, texW / 2, texH * 0.93)
    }

    const tex = new THREE.CanvasTexture(cv)
    front.material.map = tex
    front.material.needsUpdate = true
  }
}

// M.E.R.L.I.N. — Billboard Sprite System
// Canvas-generated 2D-HD tree/plant textures on camera-facing instanced quads
// No external assets — everything procedurally generated

import * as THREE from 'three'

// ── Canvas Texture Generators ──────────────────────────────────────────

function _createCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function _generateConiferTexture() {
  const c = _createCanvas(512, 1024)
  const ctx = c.getContext('2d')
  const cx = 256

  // Trunk with bark detail
  ctx.fillStyle = '#5a3a1a'
  ctx.fillRect(236, 640, 40, 384)
  // Bark lines
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `rgba(60, 30, 10, ${0.3 + Math.random() * 0.3})`
    ctx.fillRect(238 + Math.random() * 36, 650 + i * 18, 2, 8 + Math.random() * 12)
  }

  // Canopy layers (5 triangles of green, overlapping)
  const greens = ['#1a5a1a', '#2a6a2a', '#3a8a3a', '#4a9a4a', '#2a7a3a']
  for (let layer = 0; layer < 5; layer++) {
    const y = 80 + layer * 120
    const w = 80 + layer * 50
    ctx.fillStyle = greens[layer]
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx + w, y + 180)
    ctx.lineTo(cx - w, y + 180)
    ctx.closePath()
    ctx.fill()
    // Shadow edge
    ctx.fillStyle = `rgba(10, 40, 10, 0.2)`
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx - w, y + 180)
    ctx.lineTo(cx - w * 0.3, y + 180)
    ctx.closePath()
    ctx.fill()
  }

  // Leaf details (varied circles + highlights)
  for (let i = 0; i < 200; i++) {
    const x = 100 + Math.random() * 312
    const y = 90 + Math.random() * 560
    const r = 2 + Math.random() * 6
    const g = 80 + Math.random() * 100
    ctx.fillStyle = `rgba(${30 + Math.random() * 50}, ${g}, ${20 + Math.random() * 40}, 0.5)`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Light highlights
  for (let i = 0; i < 40; i++) {
    const x = 160 + Math.random() * 200
    const y = 100 + Math.random() * 400
    ctx.fillStyle = `rgba(140, 200, 100, 0.2)`
    ctx.beginPath()
    ctx.arc(x, y, 3 + Math.random() * 5, 0, Math.PI * 2)
    ctx.fill()
  }

  return c
}

function _generateOakTexture() {
  const c = _createCanvas(512, 1024)
  const ctx = c.getContext('2d')

  // Trunk with bark texture
  ctx.fillStyle = '#6a4a2a'
  ctx.fillRect(216, 560, 80, 464)
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(80, 50, 20, ${0.2 + Math.random() * 0.3})`
    ctx.fillRect(218 + Math.random() * 76, 570 + i * 14, 3, 6 + Math.random() * 10)
  }

  // Canopy (overlapping circles, more of them)
  const baseX = 256, baseY = 340
  const colors = ['#1a6a1a', '#2a7a2a', '#3a9a3a', '#4aaa4a', '#35853a', '#2a8030']
  for (let i = 0; i < 35; i++) {
    const x = baseX + (Math.random() - 0.5) * 260
    const y = baseY + (Math.random() - 0.5) * 280
    const r = 40 + Math.random() * 60
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Shadow underneath canopy
  for (let i = 0; i < 10; i++) {
    const x = baseX + (Math.random() - 0.5) * 200
    const y = baseY + 60 + Math.random() * 100
    ctx.fillStyle = `rgba(10, 30, 10, 0.15)`
    ctx.beginPath()
    ctx.arc(x, y, 30 + Math.random() * 40, 0, Math.PI * 2)
    ctx.fill()
  }

  // Leaf highlights (varied sizes)
  for (let i = 0; i < 120; i++) {
    const x = baseX + (Math.random() - 0.5) * 300
    const y = baseY + (Math.random() - 0.5) * 320
    const size = 2 + Math.random() * 5
    ctx.fillStyle = `rgba(${70 + Math.random() * 40}, ${140 + Math.random() * 80}, ${40 + Math.random() * 30}, 0.35)`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  return c
}

function _generateBirchTexture() {
  const c = _createCanvas(512, 1024)
  const ctx = c.getContext('2d')

  // White trunk with dark marks
  ctx.fillStyle = '#e8e0d0'
  ctx.fillRect(236, 400, 40, 624)
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = `rgba(40, 40, 40, ${0.4 + Math.random() * 0.3})`
    ctx.fillRect(236, 420 + i * 24 + Math.random() * 12, 40, 2 + Math.random() * 4)
  }
  // Slight shadow on one side
  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  ctx.fillRect(236, 400, 12, 624)

  // Light airy canopy (more circles, larger)
  for (let i = 0; i < 70; i++) {
    const x = 256 + (Math.random() - 0.5) * 340
    const y = 200 + (Math.random() - 0.5) * 320
    ctx.fillStyle = `rgba(${70 + Math.random() * 40}, ${170 + Math.random() * 70}, ${50 + Math.random() * 40}, 0.45)`
    ctx.beginPath()
    ctx.arc(x, y, 12 + Math.random() * 25, 0, Math.PI * 2)
    ctx.fill()
  }

  return c
}

function _generateWillowTexture() {
  const c = _createCanvas(512, 1024)
  const ctx = c.getContext('2d')

  // Thick curved trunk
  ctx.fillStyle = '#5a4a2a'
  ctx.beginPath()
  ctx.moveTo(216, 1024)
  ctx.quadraticCurveTo(200, 700, 240, 400)
  ctx.lineTo(272, 400)
  ctx.quadraticCurveTo(312, 700, 296, 1024)
  ctx.fill()

  // Drooping branches (more, longer)
  for (let i = 0; i < 40; i++) {
    const startX = 256 + (Math.random() - 0.5) * 160
    const startY = 240 + Math.random() * 160
    ctx.strokeStyle = `rgba(${40 + Math.random() * 30}, ${110 + Math.random() * 60}, ${35}, 0.55)`
    ctx.lineWidth = 1.5 + Math.random() * 2.5
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(
      startX + (Math.random() - 0.5) * 120,
      startY + 200 + Math.random() * 120,
      startX + (Math.random() - 0.5) * 200,
      startY + 360 + Math.random() * 160
    )
    ctx.stroke()
  }

  // Leaf clusters on branches
  for (let i = 0; i < 200; i++) {
    const x = 256 + (Math.random() - 0.5) * 400
    const y = 240 + Math.random() * 560
    ctx.fillStyle = `rgba(${50 + Math.random() * 40}, ${130 + Math.random() * 80}, ${40}, 0.45)`
    ctx.beginPath()
    ctx.arc(x, y, 2 + Math.random() * 6, 0, Math.PI * 2)
    ctx.fill()
  }

  return c
}

function _generateFernTexture() {
  const c = _createCanvas(256, 512)
  const ctx = c.getContext('2d')

  // Fern fronds radiating from base (more detail at 2x resolution)
  for (let f = 0; f < 7; f++) {
    const angle = -0.8 + f * 0.27
    ctx.strokeStyle = `rgba(${35 + f * 8}, ${90 + f * 18}, ${25}, 0.75)`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    const baseX = 128, baseY = 480
    for (let i = 0; i < 25; i++) {
      const t = i / 24
      const x = baseX + Math.sin(angle + t * 0.5) * t * 100
      const y = baseY - t * 420
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)

      // Leaflets (larger, more varied)
      if (i > 2 && i < 22) {
        ctx.fillStyle = `rgba(${40 + Math.random() * 30}, ${110 + Math.random() * 60}, ${30}, 0.55)`
        ctx.fillRect(x - 8 - Math.random() * 8, y, 16 + Math.random() * 12, 4)
      }
    }
    ctx.stroke()
  }

  return c
}

function _generateFlowerBushTexture() {
  const c = _createCanvas(256, 512)
  const ctx = c.getContext('2d')

  // Bush body (more circles, layered)
  for (let i = 0; i < 20; i++) {
    const x = 128 + (Math.random() - 0.5) * 160
    const y = 280 + (Math.random() - 0.5) * 160
    ctx.fillStyle = `rgba(${35 + Math.random() * 30}, ${80 + Math.random() * 50}, ${30}, 0.55)`
    ctx.beginPath()
    ctx.arc(x, y, 20 + Math.random() * 25, 0, Math.PI * 2)
    ctx.fill()
  }

  // Flowers (more, varied sizes)
  const flowerColors = ['#cc66aa', '#ddaa44', '#eeee66', '#aa88cc', '#ff8866', '#ee88aa']
  for (let i = 0; i < 30; i++) {
    const x = 128 + (Math.random() - 0.5) * 180
    const y = 250 + (Math.random() - 0.5) * 160
    ctx.fillStyle = flowerColors[i % flowerColors.length]
    ctx.beginPath()
    ctx.arc(x, y, 4 + Math.random() * 8, 0, Math.PI * 2)
    ctx.fill()
    // White center dot
    ctx.fillStyle = 'rgba(255,255,230,0.6)'
    ctx.beginPath()
    ctx.arc(x, y, 1.5 + Math.random() * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  return c
}

// ── Texture Cache ──────────────────────────────────────────────────────

const _textureCache = new Map()

function _getTexture(generator, key) {
  if (_textureCache.has(key)) return _textureCache.get(key)
  const canvas = generator()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipMapLinearFilter
  tex.magFilter = THREE.LinearFilter
  _textureCache.set(key, tex)
  return tex
}

// ── Billboard Configs Per Biome ────────────────────────────────────────

const BILLBOARD_CONFIGS = {
  broceliande: [
    { generator: _generateConiferTexture, key: 'conifer', count: 200, spread: 85, scaleMin: 3, scaleMax: 7, heightW: 3, heightH: 6 },
    { generator: _generateOakTexture, key: 'oak', count: 150, spread: 75, scaleMin: 3, scaleMax: 6, heightW: 4, heightH: 5 },
    { generator: _generateBirchTexture, key: 'birch', count: 100, spread: 70, scaleMin: 2.5, scaleMax: 5, heightW: 2.5, heightH: 5 },
    { generator: _generateWillowTexture, key: 'willow', count: 50, spread: 60, scaleMin: 3, scaleMax: 5, heightW: 3, heightH: 5 },
    { generator: _generateFernTexture, key: 'fern', count: 300, spread: 50, scaleMin: 0.5, scaleMax: 1.5, heightW: 1, heightH: 2 },
    { generator: _generateFlowerBushTexture, key: 'flowerbush', count: 150, spread: 55, scaleMin: 0.6, scaleMax: 1.2, heightW: 1, heightH: 2 },
  ],
  landes: [
    { generator: _generateFernTexture, key: 'fern', count: 400, spread: 80, scaleMin: 0.4, scaleMax: 1.2, heightW: 1, heightH: 2 },
    { generator: _generateFlowerBushTexture, key: 'flowerbush', count: 200, spread: 70, scaleMin: 0.5, scaleMax: 1.0, heightW: 1, heightH: 2 },
  ],
  huelgoat: [
    { generator: _generateOakTexture, key: 'oak', count: 200, spread: 65, scaleMin: 3, scaleMax: 7, heightW: 4, heightH: 5 },
    { generator: _generateFernTexture, key: 'fern', count: 350, spread: 55, scaleMin: 0.6, scaleMax: 1.8, heightW: 1, heightH: 2 },
    { generator: _generateWillowTexture, key: 'willow', count: 80, spread: 60, scaleMin: 3, scaleMax: 6, heightW: 3, heightH: 5 },
  ],
}

// Fallback: use broceliande for unknown biomes
function _getConfigs(biomeKey) {
  return BILLBOARD_CONFIGS[biomeKey] ?? BILLBOARD_CONFIGS.broceliande
}

// ── Seeded Random ──────────────────────────────────────────────────────

function _seededRandom(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

// ── Billboard System Class ─────────────────────────────────────────────

export class BillboardSpriteSystem {
  constructor(biomeKey, heightFn, pathCurve) {
    this._meshes = []
    this._camera = null
    const configs = _getConfigs(biomeKey)

    for (const config of configs) {
      const texture = _getTexture(config.generator, config.key)
      const geo = new THREE.PlaneGeometry(config.heightW, config.heightH)
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.3,
        side: THREE.DoubleSide,
        depthWrite: true,
      })

      const instanced = new THREE.InstancedMesh(geo, mat, config.count)
      const rng = _seededRandom(biomeKey.length * 100 + config.count)
      const dummy = new THREE.Object3D()
      let placed = 0

      for (let i = 0; i < config.count * 2 && placed < config.count; i++) {
        const x = (rng() - 0.5) * config.spread * 2
        const z = (rng() - 0.5) * config.spread * 2

        // Path avoidance: skip if too close to path
        if (pathCurve) {
          const dist = _distToPath(x, z, pathCurve)
          if (dist < 2.5) continue
        }

        const y = heightFn(x, z)
        const scale = config.scaleMin + rng() * (config.scaleMax - config.scaleMin)

        dummy.position.set(x, y + config.heightH * scale * 0.5, z)
        dummy.scale.set(scale, scale, 1)
        dummy.rotation.y = rng() * Math.PI * 2
        dummy.updateMatrix()
        instanced.setMatrixAt(placed, dummy.matrix)
        placed++
      }

      instanced.count = placed
      instanced.instanceMatrix.needsUpdate = true
      this._meshes.push(instanced)
    }
  }

  getMeshes() { return this._meshes }

  /** Make billboards face the camera each frame */
  update(dt, camera) {
    if (!camera) return
    // For InstancedMesh billboards, we update all matrices to face camera
    // This is expensive for 1000+ instances, so we do it every 3rd frame
    this._frameCount = (this._frameCount ?? 0) + 1
    if (this._frameCount % 3 !== 0) return

    const camPos = camera.position
    const dummy = new THREE.Object3D()
    const _mat = new THREE.Matrix4()

    for (const mesh of this._meshes) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, _mat)
        dummy.position.setFromMatrixPosition(_mat)
        const scale = new THREE.Vector3()
        scale.setFromMatrixScale(_mat)

        // Face camera (Y-axis billboard — only rotate around Y)
        const dx = camPos.x - dummy.position.x
        const dz = camPos.z - dummy.position.z
        dummy.rotation.y = Math.atan2(dx, dz)
        dummy.scale.copy(scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  dispose() {
    for (const m of this._meshes) {
      m.geometry.dispose()
      m.material.map?.dispose()
      m.material.dispose()
    }
    this._meshes = []
  }
}

// ── Utility ────────────────────────────────────────────────────────────

function _distToPath(x, z, curve) {
  // Sample path at 50 points, find min distance in xz-plane
  let minDist = Infinity
  for (let i = 0; i <= 50; i++) {
    const p = curve.getPointAt(i / 50)
    const dx = x - p.x
    const dz = z - p.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < minDist) minDist = d
  }
  return minDist
}

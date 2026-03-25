// M.E.R.L.I.N. — Ambient Entities
// Biome-specific ambient particles between encounters: fireflies, ravens, mist, stars
// Phase 4: Enhanced fireflies (sin-wave, per-particle opacity), dust motes (camera-aware)

import * as THREE from 'three'
import { getRealPeriod } from './lighting_system.js'

// ── Programmatic glow texture (canvas-based, shared) ─────────────────────
let _glowTextureCache = null
function _getGlowTexture() {
  if (_glowTextureCache) return _glowTextureCache
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  _glowTextureCache = new THREE.CanvasTexture(canvas)
  return _glowTextureCache
}

// ── Biomes that activate fireflies at night/twilight ─────────────────────
const FIREFLY_BIOMES = new Set(['broceliande', 'huelgoat', 'monts', 'ile_sein', 'ecosse'])
const MARAIS_LIKE = new Set(['broceliande', 'huelgoat', 'monts']) // denser fireflies

const AMBIENT_CONFIGS = {
  broceliande: [
    { type: 'fireflies', count: 500, color: 0x66ff88, size: 0.18, speed: 0.3, spread: 45, height: [1, 6] },
    { type: 'dust', count: 600, color: 0x88aa66, size: 0.08, speed: 0.05, spread: 55, height: [0, 10] },
    { type: 'pollen', count: 350, color: 0xdddd88, size: 0.06, speed: 0.08, spread: 40, height: [1, 7] },
    { type: 'spores', count: 150, color: 0xaaddaa, size: 0.04, speed: 0.02, spread: 35, height: [0, 4] },
    { type: 'sparks', count: 80, color: 0xffffaa, size: 0.2, speed: 0.05, spread: 50, height: [2, 8] },
  ],
  landes: [
    { type: 'dust', count: 200, color: 0x998877, size: 0.05, speed: 0.1, spread: 55, height: [0, 6] },
    { type: 'seeds', count: 60, color: 0xccbb88, size: 0.03, speed: 0.15, spread: 40, height: [1, 8] },
    { type: 'mist', count: 40, color: 0x8a8a7a, size: 0.15, speed: 0.04, spread: 50, height: [0, 3] },
  ],
  cotes: [
    { type: 'spray', count: 100, color: 0xbbddee, size: 0.06, speed: 0.2, spread: 45, height: [0, 4] },
    { type: 'dust', count: 80, color: 0x99aabb, size: 0.04, speed: 0.08, spread: 40, height: [1, 7] },
    { type: 'sparks', count: 40, color: 0xffffff, size: 0.03, speed: 0.12, spread: 35, height: [2, 10] },
  ],
  monts: [
    { type: 'wisps', count: 50, color: 0x8866cc, size: 0.12, speed: 0.15, spread: 35, height: [2, 8] },
    { type: 'dust', count: 100, color: 0x554455, size: 0.04, speed: 0.03, spread: 45, height: [0, 6] },
    { type: 'fireflies', count: 30, color: 0xaa66dd, size: 0.06, speed: 0.1, spread: 25, height: [1, 5] },
  ],
  ile_sein: [
    { type: 'stars', count: 200, color: 0xffffff, size: 0.05, speed: 0.01, spread: 65, height: [10, 40] },
    { type: 'dust', count: 80, color: 0x7788aa, size: 0.04, speed: 0.06, spread: 40, height: [0, 5] },
    { type: 'fireflies', count: 40, color: 0x88bbff, size: 0.06, speed: 0.15, spread: 30, height: [1, 6] },
  ],
  huelgoat: [
    { type: 'droplets', count: 100, color: 0x99ccdd, size: 0.04, speed: 0.5, spread: 35, height: [3, 10] },
    { type: 'fireflies', count: 50, color: 0x66ff88, size: 0.06, speed: 0.2, spread: 30, height: [1, 4] },
    { type: 'pollen', count: 60, color: 0xbbcc88, size: 0.03, speed: 0.06, spread: 25, height: [1, 5] },
  ],
  ecosse: [
    { type: 'mist', count: 70, color: 0x9988aa, size: 0.2, speed: 0.08, spread: 45, height: [0, 3] },
    { type: 'dust', count: 100, color: 0x887788, size: 0.04, speed: 0.05, spread: 40, height: [0, 6] },
    { type: 'seeds', count: 40, color: 0xaa99aa, size: 0.03, speed: 0.12, spread: 35, height: [1, 7] },
  ],
  iles_mystiques: [
    { type: 'sparks', count: 120, color: 0xddaa44, size: 0.08, speed: 0.25, spread: 40, height: [1, 8] },
    { type: 'wisps', count: 40, color: 0xffcc66, size: 0.15, speed: 0.1, spread: 30, height: [2, 6] },
    { type: 'pollen', count: 80, color: 0xffdd88, size: 0.04, speed: 0.08, spread: 35, height: [1, 5] },
  ],
}

// ── Enhanced Firefly System ──────────────────────────────────────────────
// Sin-wave floating, per-particle phase, opacity pulsing 0.3-0.8
// Only visible in forest/marais biomes at night or twilight

function _createFireflySystem(biomeKey) {
  const isDense = MARAIS_LIKE.has(biomeKey)
  const count = isDense ? 40 : 25
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count) // per-particle sin phase
  const basePositions = new Float32Array(count * 3) // origin for sin-wave orbit

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 30
    const y = 1.0 + Math.random() * 4.0
    const z = (Math.random() - 0.5) * 30
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    basePositions[i * 3] = x
    basePositions[i * 3 + 1] = y
    basePositions[i * 3 + 2] = z
    phases[i] = Math.random() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.08,
    color: 0xccff66,
    transparent: true,
    opacity: 0.5,
    map: _getGlowTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  points.visible = false // controlled by time-of-day

  return { points, phases, basePositions, count }
}

// ── Dust Motes in Sunlight ──────────────────────────────────────────────
// 30 tiny white particles drifting down, visible when camera faces light

function _createDustMotes() {
  const count = 30
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20
    positions[i * 3 + 1] = 2.0 + Math.random() * 6.0
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    velocities[i * 3] = (Math.random() - 0.5) * 0.02
    velocities[i * 3 + 1] = -0.02 - Math.random() * 0.03 // slow downward drift
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  points.visible = false // controlled by camera-light dot product

  return { points, velocities, count }
}

export class AmbientEntities {
  constructor(biomeKey) {
    this._systems = []
    this._biomeKey = biomeKey
    this._fireflies = null
    this._dustMotes = null
    const configs = AMBIENT_CONFIGS[biomeKey] ?? AMBIENT_CONFIGS.broceliande

    for (const config of configs) {
      const count = config.count
      const positions = new Float32Array(count * 3)
      const velocities = new Float32Array(count * 3)

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * config.spread * 2
        positions[i * 3 + 1] = config.height[0] + Math.random() * (config.height[1] - config.height[0])
        positions[i * 3 + 2] = (Math.random() - 0.5) * config.spread * 2

        velocities[i * 3] = (Math.random() - 0.5) * config.speed
        velocities[i * 3 + 1] = (Math.random() - 0.5) * config.speed * 0.5
        velocities[i * 3 + 2] = (Math.random() - 0.5) * config.speed
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const mat = new THREE.PointsMaterial({
        size: config.size,
        color: config.color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const points = new THREE.Points(geo, mat)
      this._systems.push({ points, velocities, config })
    }

    // Enhanced fireflies (only for forest/marais biomes)
    if (FIREFLY_BIOMES.has(biomeKey)) {
      this._fireflies = _createFireflySystem(biomeKey)
    }

    // Dust motes (all biomes, visibility controlled by daytime + camera direction)
    this._dustMotes = _createDustMotes()
  }

  getMeshes() {
    const meshes = this._systems.map(s => s.points)
    if (this._fireflies) meshes.push(this._fireflies.points)
    if (this._dustMotes) meshes.push(this._dustMotes.points)
    return meshes
  }

  update(dt, playerPos, camera, sunDirection) {
    const elapsed = performance.now() * 0.001
    const period = getRealPeriod()

    for (const sys of this._systems) {
      const pos = sys.points.geometry.attributes.position
      const vel = sys.velocities
      const cfg = sys.config
      const count = pos.count

      for (let i = 0; i < count; i++) {
        // Move
        pos.array[i * 3] += vel[i * 3] * dt
        pos.array[i * 3 + 1] += vel[i * 3 + 1] * dt
        pos.array[i * 3 + 2] += vel[i * 3 + 2] * dt

        // Wrap around player position
        if (playerPos) {
          const dx = pos.array[i * 3] - playerPos.x
          const dz = pos.array[i * 3 + 2] - playerPos.z
          if (Math.abs(dx) > cfg.spread) pos.array[i * 3] = playerPos.x + (Math.random() - 0.5) * cfg.spread * 2
          if (Math.abs(dz) > cfg.spread) pos.array[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * cfg.spread * 2
        }

        // Height bounds
        if (pos.array[i * 3 + 1] < cfg.height[0]) {
          pos.array[i * 3 + 1] = cfg.height[1]
          vel[i * 3 + 1] = -Math.abs(vel[i * 3 + 1])
        }
        if (pos.array[i * 3 + 1] > cfg.height[1]) {
          pos.array[i * 3 + 1] = cfg.height[0]
          vel[i * 3 + 1] = Math.abs(vel[i * 3 + 1])
        }

        // Subtle random drift
        vel[i * 3] += (Math.random() - 0.5) * 0.01
        vel[i * 3 + 2] += (Math.random() - 0.5) * 0.01
      }
      pos.needsUpdate = true

      // Flicker opacity for fireflies/wisps/sparks
      if (['fireflies', 'wisps', 'sparks'].includes(cfg.type)) {
        sys.points.material.opacity = 0.5 + Math.sin(elapsed * 3.0 + cfg.count) * 0.3
      }
    }

    // ── Enhanced fireflies: sin-wave + per-particle opacity pulsing ──
    if (this._fireflies) {
      const ff = this._fireflies
      const isNightOrTwilight = period === 'nuit' || period === 'crepuscule'
      ff.points.visible = isNightOrTwilight

      if (isNightOrTwilight) {
        const pos = ff.points.geometry.attributes.position
        for (let i = 0; i < ff.count; i++) {
          const phase = ff.phases[i]
          // Sin-wave floating movement around base position
          pos.array[i * 3] = ff.basePositions[i * 3] + Math.sin(elapsed * 0.4 + phase) * 1.5
          pos.array[i * 3 + 1] = ff.basePositions[i * 3 + 1] + Math.sin(elapsed * 0.6 + phase * 1.3) * 0.8
          pos.array[i * 3 + 2] = ff.basePositions[i * 3 + 2] + Math.cos(elapsed * 0.5 + phase * 0.7) * 1.2

          // Slow base drift (so they don't stay in one spot forever)
          ff.basePositions[i * 3] += Math.sin(elapsed * 0.05 + phase) * 0.003
          ff.basePositions[i * 3 + 2] += Math.cos(elapsed * 0.04 + phase) * 0.003
        }
        pos.needsUpdate = true

        // Per-particle opacity pulsing (material-level approximation: 0.3-0.8 range)
        const pulse = 0.3 + (Math.sin(elapsed * 2.0) * 0.5 + 0.5) * 0.5
        ff.points.material.opacity = pulse
      }
    }

    // ── Dust motes: visible when camera faces toward light ──
    if (this._dustMotes) {
      const dm = this._dustMotes
      const isDaytime = period === 'jour' || period === 'aube'

      if (isDaytime && camera && sunDirection) {
        // Camera forward direction (negative Z in camera space, transformed to world)
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        const lightDir = sunDirection.clone().normalize()
        const dot = camForward.dot(lightDir)

        // Visible only when looking roughly toward the sun (dot > 0.5)
        dm.points.visible = dot > 0.5
        dm.points.material.opacity = 0.2 + (dot - 0.5) * 0.4 // 0.2 at threshold, 0.4 at direct
      } else {
        dm.points.visible = false
      }

      if (dm.points.visible) {
        const pos = dm.points.geometry.attributes.position
        const vel = dm.velocities
        for (let i = 0; i < dm.count; i++) {
          pos.array[i * 3] += vel[i * 3] * dt
          pos.array[i * 3 + 1] += vel[i * 3 + 1] * dt
          pos.array[i * 3 + 2] += vel[i * 3 + 2] * dt

          // Reset when fallen below ground
          if (pos.array[i * 3 + 1] < 0.5) {
            pos.array[i * 3 + 1] = 6.0 + Math.random() * 3.0
            if (playerPos) {
              pos.array[i * 3] = playerPos.x + (Math.random() - 0.5) * 20
              pos.array[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 20
            }
          }
        }
        pos.needsUpdate = true
      }
    }
  }

  dispose() {
    for (const sys of this._systems) {
      sys.points.geometry.dispose()
      sys.points.material.dispose()
    }
    if (this._fireflies) {
      this._fireflies.points.geometry.dispose()
      this._fireflies.points.material.dispose()
    }
    if (this._dustMotes) {
      this._dustMotes.points.geometry.dispose()
      this._dustMotes.points.material.dispose()
    }
  }
}

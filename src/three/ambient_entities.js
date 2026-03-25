// M.E.R.L.I.N. — Ambient Entities
// Biome-specific ambient particles between encounters: fireflies, ravens, mist, stars

import * as THREE from 'three'

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

export class AmbientEntities {
  constructor(biomeKey) {
    this._systems = []
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
  }

  getMeshes() { return this._systems.map(s => s.points) }

  update(dt, playerPos) {
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
        sys.points.material.opacity = 0.5 + Math.sin(performance.now() * 0.003 + cfg.count) * 0.3
      }
    }
  }

  dispose() {
    for (const sys of this._systems) {
      sys.points.geometry.dispose()
      sys.points.material.dispose()
    }
  }
}

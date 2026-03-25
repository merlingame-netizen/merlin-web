// M.E.R.L.I.N. — Effect Visuals
// Visual feedback for game effects: screen flash, camera shake, particle bursts

import * as THREE from 'three'

export class EffectVisuals {
  constructor(camera, scene) {
    this._camera = camera
    this._scene = scene
    this._shakeIntensity = 0
    this._shakeDecay = 0
    this._originalPos = new THREE.Vector3()
    this._flashOverlay = null
  }

  // Call every frame
  update(dt) {
    if (this._shakeIntensity > 0.001) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5
      this._shakeIntensity *= (1 - this._shakeDecay * dt)
    }
  }

  playDamage() {
    this._shakeIntensity = 0.3
    this._shakeDecay = 5.0
    this._flashScreen(0xff3326, 0.3, 500)
  }

  playHeal() {
    this._flashScreen(0x33ff66, 0.2, 400)
    this._spawnRing(0x33ff66)
  }

  // Shift faction: color flash based on faction
  playShiftFaction(faction) {
    const colors = {
      druides: 0x22c55e,
      korrigans: 0xa855f7,
      marins: 0x3b82f6,
      guerriers: 0xff6b35,
      pretresses: 0xec4899,
      anciens: 0x94a3b8,
    }
    this._flashScreen(colors[faction] ?? 0xffbe33, 0.25, 350)
  }

  // Legacy compat
  playShiftAspect(aspect) {
    this.playShiftFaction(aspect)
  }

  playAddSouffle() {
    this._flashScreen(0x4dd9cc, 0.15, 300)
    this._spawnBurst(0x4dd9cc, 30)
  }

  playTension() {
    this._flashScreen(0x331100, 0.2, 600)
  }

  _flashScreen(color, alpha, duration) {
    const el = document.createElement('div')
    const c = new THREE.Color(color)
    el.style.cssText = `
      position:fixed;inset:0;z-index:50;
      background:rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha});
      pointer-events:none;
      transition:opacity ${duration}ms;
    `
    document.body.appendChild(el)
    requestAnimationFrame(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), duration)
    })
  }

  _spawnRing(color) {
    const geo = new THREE.TorusGeometry(0.5, 0.05, 8, 24)
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
    const ring = new THREE.Mesh(geo, mat)
    ring.rotation.x = Math.PI / 2
    ring.position.copy(this._camera.position)
    ring.position.y -= 0.5
    this._scene.add(ring)

    const start = performance.now()
    const animate = () => {
      const t = (performance.now() - start) / 1000
      if (t > 1.0) {
        this._scene.remove(ring)
        geo.dispose()
        mat.dispose()
        return
      }
      ring.scale.setScalar(1 + t * 8)
      mat.opacity = 0.8 * (1 - t)
      requestAnimationFrame(animate)
    }
    animate()
  }

  _spawnBurst(color, count) {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const basePos = this._camera.position

    for (let i = 0; i < count; i++) {
      positions[i * 3] = basePos.x
      positions[i * 3 + 1] = basePos.y
      positions[i * 3 + 2] = basePos.z

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 3
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.5 + 1
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.1, color, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const points = new THREE.Points(geo, mat)
    this._scene.add(points)

    const start = performance.now()
    const animate = () => {
      const t = (performance.now() - start) / 1000
      if (t > 1.5) {
        this._scene.remove(points)
        geo.dispose()
        mat.dispose()
        return
      }
      const pos = geo.attributes.position
      for (let i = 0; i < count; i++) {
        pos.array[i * 3] += velocities[i * 3] * 0.016
        pos.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016
        pos.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016
        velocities[i * 3 + 1] -= 0.016 * 2
      }
      pos.needsUpdate = true
      mat.opacity = Math.max(0, 1 - t / 1.5)
      requestAnimationFrame(animate)
    }
    animate()
  }
}

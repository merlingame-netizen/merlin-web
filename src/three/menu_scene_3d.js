// M.E.R.L.I.N. — 3D Menu Scene v2
// Slow orbiting camera, Ogham rune ring, ambient particles, ground fog
// Clean, atmospheric, cohérent celtic

import * as THREE from 'three'

const RUNES = ['\u1681','\u1682','\u1683','\u1684','\u1685','\u1686','\u1687','\u1688','\u1689','\u168A','\u168B','\u168C','\u168D','\u168E','\u168F','\u1690','\u1691','\u1692']
const AMBER = 0xffbe33
const PHOSPHOR = 0x33ff66
const DARK = 0x040a04

export class MenuScene3D {
  constructor() {
    this._scene = new THREE.Scene()
    this._camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100)
    this._camera.position.set(0, 2.5, 8)

    this._scene.background = new THREE.Color(DARK)
    this._scene.fog = new THREE.FogExp2(DARK, 0.05)

    this._runeSprites = []
    this._particles = null

    this._buildLighting()
    this._buildRuneRing()
    this._buildGroundPlane()
    this._buildParticles()
  }

  getScene() { return this._scene }
  getCamera() { return this._camera }

  update(dt, elapsed) {
    // Slow orbit around center
    const orbitR = 8, orbitSpeed = 0.08
    const angle = elapsed * orbitSpeed
    this._camera.position.x = Math.sin(angle) * orbitR
    this._camera.position.z = Math.cos(angle) * orbitR
    this._camera.position.y = 2.2 + Math.sin(elapsed * 0.15) * 0.3
    this._camera.lookAt(0, 1.2, 0)

    // Rotate rune ring
    for (let i = 0; i < this._runeSprites.length; i++) {
      const sprite = this._runeSprites[i]
      const a = (i / RUNES.length) * Math.PI * 2 + elapsed * 0.15
      const r = 3.2
      sprite.position.x = Math.cos(a) * r
      sprite.position.z = Math.sin(a) * r
      sprite.position.y = 1.0 + Math.sin(elapsed * 0.6 + i * 0.4) * 0.25
      // Fade runes based on distance to camera
      const d = sprite.position.distanceTo(this._camera.position)
      sprite.material.opacity = Math.max(0.15, Math.min(0.8, 1.2 - d / 10))
    }

    // Animate particles (gentle float upward)
    if (this._particles) {
      const pos = this._particles.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i)
        y += 0.003 + Math.sin(elapsed + i) * 0.001
        if (y > 6) y = -1
        pos.setY(i, y)
      }
      pos.needsUpdate = true
    }
  }

  _buildLighting() {
    this._scene.add(new THREE.AmbientLight(0x223322, 0.3))

    const center = new THREE.PointLight(AMBER, 1.8, 18)
    center.position.set(0, 3, 0)
    this._scene.add(center)

    const accent = new THREE.PointLight(PHOSPHOR, 0.5, 12)
    accent.position.set(-3, 1.5, -2)
    this._scene.add(accent)

    const warm = new THREE.PointLight(0xcc6633, 0.4, 10)
    warm.position.set(3, 0.5, 3)
    this._scene.add(warm)
  }

  _buildRuneRing() {
    for (let i = 0; i < RUNES.length; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 64, 64)
      ctx.fillStyle = '#33ff66'
      ctx.font = 'bold 44px serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 10
      ctx.fillText(RUNES[i], 32, 32)

      const tex = new THREE.CanvasTexture(canvas)
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(0.5, 0.5, 1)
      this._scene.add(sprite)
      this._runeSprites.push(sprite)
    }
  }

  _buildParticles() {
    const count = 120
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14
      positions[i * 3 + 1] = Math.random() * 6 - 1
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14

      // 70% green fireflies, 30% amber sparks
      if (Math.random() > 0.7) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.75; colors[i * 3 + 2] = 0.2
      } else {
        colors[i * 3] = 0.3; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.3
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this._particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.06, transparent: true, opacity: 0.5,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    this._scene.add(this._particles)
  }

  _buildGroundPlane() {
    const geo = new THREE.PlaneGeometry(30, 30)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a150a, metalness: 0.6, roughness: 0.5,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -0.5
    this._scene.add(mesh)
  }

  dispose() {
    this._scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose()
        obj.material.dispose()
      }
    })
  }
}

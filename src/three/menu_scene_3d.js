// M.E.R.L.I.N. — Spectacular 3D Menu Scene
// Orbiting camera, animated title, Ogham rune ring, 200 particles, LLM indicator

import * as THREE from 'three'

const RUNES = ['ᚁ','ᚂ','ᚃ','ᚄ','ᚅ','ᚆ','ᚇ','ᚈ','ᚉ','ᚊ','ᚋ','ᚌ','ᚍ','ᚎ','ᚏ','ᚐ','ᚑ','ᚒ']
const AMBER = 0xffbe33
const PHOSPHOR = 0x33ff66
const DARK = 0x050c05

export class MenuScene3D {
  constructor() {
    this._scene = new THREE.Scene()
    this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    this._camera.position.set(0, 2, 8)

    this._scene.background = new THREE.Color(DARK)
    this._scene.fog = new THREE.FogExp2(DARK, 0.06)

    this._runeSprites = []
    this._particles = null
    this._burstParticles = null
    this._titleMesh = null
    this._llmIndicator = null
    this._llmStatus = 'connecting' // connecting | ok | slow | error

    this._buildLighting()
    // No title mesh, no particles, no burst, no LLM indicator — just runes
    this._buildRuneRing()
    this._buildGroundPlane()
  }

  getScene() { return this._scene }
  getCamera() { return this._camera }

  setLLMStatus(status) {
    this._llmStatus = status
  }

  update(dt, elapsed) {
    // Static camera — no orbiting
    this._camera.lookAt(0, 1, 0)

    // Rotate rune ring only
    for (let i = 0; i < this._runeSprites.length; i++) {
      const sprite = this._runeSprites[i]
      const angle = (i / RUNES.length) * Math.PI * 2 + elapsed * 0.2
      const r = 3.5
      sprite.position.x = Math.cos(angle) * r
      sprite.position.z = Math.sin(angle) * r
      sprite.position.y = 1.2 + Math.sin(elapsed * 0.8 + i * 0.5) * 0.3
    }
  }

  _buildLighting() {
    const ambient = new THREE.AmbientLight(PHOSPHOR, 0.15)
    this._scene.add(ambient)

    const point = new THREE.PointLight(AMBER, 2, 20)
    point.position.set(0, 3, 0)
    this._scene.add(point)

    const point2 = new THREE.PointLight(PHOSPHOR, 0.8, 15)
    point2.position.set(3, 1, -3)
    this._scene.add(point2)
  }

  _buildTitle() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 256)

    // Title text
    ctx.fillStyle = '#ffbe33'
    ctx.font = 'bold 120px "VT323", "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#ffbe33'
    ctx.shadowBlur = 30
    ctx.fillText('M.E.R.L.I.N.', 512, 100)

    // Subtitle
    ctx.shadowBlur = 10
    ctx.font = '48px "VT323", "Courier New", monospace'
    ctx.fillStyle = '#33ff66'
    ctx.fillText('Le Jeu des Oghams', 512, 190)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true

    const geo = new THREE.PlaneGeometry(6, 1.5)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTexture: { value: tex },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(uTexture, vUv);
          float glow = 0.8 + 0.2 * sin(uTime * 2.0);
          tex.rgb *= glow;
          // Add subtle scan effect
          float scan = 0.95 + 0.05 * sin(vUv.y * 50.0 + uTime * 3.0);
          tex.rgb *= scan;
          gl_FragColor = tex;
        }
      `,
    })

    this._titleMesh = new THREE.Mesh(geo, mat)
    this._titleMesh.position.set(0, 3.5, 0)
    this._titleMesh.lookAt(this._camera.position)
    this._scene.add(this._titleMesh)
  }

  _buildRuneRing() {
    for (let i = 0; i < RUNES.length; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 64, 64)
      ctx.fillStyle = '#33ff66'
      ctx.font = 'bold 48px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#33ff66'
      ctx.shadowBlur = 12
      ctx.fillText(RUNES[i], 32, 32)

      const tex = new THREE.CanvasTexture(canvas)
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(0.6, 0.6, 1)
      this._scene.add(sprite)
      this._runeSprites.push(sprite)
    }
  }

  _buildParticles() {
    const count = 150
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = Math.random() * 8 - 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16

      // Mix of green and amber particles
      if (Math.random() > 0.7) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.75; colors[i * 3 + 2] = 0.2
      } else {
        colors[i * 3] = 0.2; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 0.4
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this._particles = new THREE.Points(geo, mat)
    this._scene.add(this._particles)
  }

  _buildBurstParticles() {
    const count = 80
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 2
      positions[i * 3 + 2] = 0

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 4
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 2
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      color: AMBER,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this._burstParticles = new THREE.Points(geo, mat)
    this._burstParticles.userData = { velocities }
    this._scene.add(this._burstParticles)
  }

  _buildLLMIndicator() {
    const geo = new THREE.SphereGeometry(0.15, 16, 16)
    const mat = new THREE.MeshStandardMaterial({
      color: AMBER,
      emissive: AMBER,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.5,
    })
    this._llmIndicator = new THREE.Mesh(geo, mat)
    this._llmIndicator.position.set(0, 5.2, 0)
    this._scene.add(this._llmIndicator)
  }

  _buildGroundPlane() {
    // Dark reflective ground
    const geo = new THREE.PlaneGeometry(40, 40)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1a0a,
      metalness: 0.8,
      roughness: 0.4,
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

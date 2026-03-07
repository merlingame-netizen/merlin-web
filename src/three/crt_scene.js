// M.E.R.L.I.N. — Three.js CRT Background Scene
// Animated phosphor terminal atmosphere: scanlines, rune particles, glow

import * as THREE from 'three'

const RUNE_SYMBOLS = ['ᚁ','ᚂ','ᚃ','ᚄ','ᚅ','ᚆ','ᚇ','ᚈ','ᚉ','ᚊ','ᚋ','ᚌ','ᚍ','ᚎ','ᚏ','ᚐ','ᚑ','ᚒ']

export class CRTScene {
  constructor(canvas) {
    this._canvas = canvas
    this._renderer = null
    this._scene = null
    this._camera = null
    this._particles = null
    this._scanlines = null
    this._clock = new THREE.Clock()
    this._runeTextures = []
    this._animId = null
    this._init()
  }

  _init() {
    // Renderer
    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, alpha: true, antialias: false })
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

    // Scene
    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x050c05)

    // Orthographic camera (2D plane)
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this._camera.position.z = 1

    // Background gradient plane
    this._createBackground()

    // Ogham rune particles
    this._createRuneParticles()

    // CRT scanline overlay
    this._createScanlines()

    // Vignette
    this._createVignette()

    // Resize handler
    window.addEventListener('resize', () => this._onResize())

    // Start loop
    this._animate()
  }

  _createBackground() {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x050c05) },
        uColor2: { value: new THREE.Color(0x0a1a0a) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        void main() {
          float grad = smoothstep(0.0, 1.0, vUv.y);
          float noise = fract(sin(dot(vUv * 100.0 + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5);
          vec3 color = mix(uColor1, uColor2, grad);
          color += noise * 0.008;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
    this._bgMesh = new THREE.Mesh(geo, mat)
    this._bgMesh.position.z = -0.5
    this._scene.add(this._bgMesh)
  }

  _createRuneParticles() {
    // Create canvas textures for each rune glyph
    const count = 40
    const positions = []
    const speeds = []
    const runeIndices = []
    const opacities = []
    const sizes = []

    for (let i = 0; i < count; i++) {
      positions.push(
        (Math.random() - 0.5) * 2,    // x
        (Math.random() - 0.5) * 2,    // y
        0,                             // z
      )
      speeds.push(Math.random() * 0.0003 + 0.0001)
      runeIndices.push(Math.floor(Math.random() * RUNE_SYMBOLS.length))
      opacities.push(Math.random() * 0.4 + 0.05)
      sizes.push(Math.random() * 12 + 8)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this._buildRuneAtlas() },
        uAtlasSize: { value: RUNE_SYMBOLS.length },
      },
      vertexShader: `
        attribute float aRuneIndex;
        attribute float aOpacity;
        attribute float aSize;
        varying float vOpacity;
        varying float vRune;
        uniform float uTime;
        void main() {
          vOpacity = aOpacity;
          vRune = aRuneIndex;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uAtlasSize;
        varying float vOpacity;
        varying float vRune;
        void main() {
          float col = floor(vRune);
          float u = (col + gl_PointCoord.x) / uAtlasSize;
          float v = gl_PointCoord.y;
          vec4 tex = texture2D(uTexture, vec2(u, v));
          gl_FragColor = vec4(0.20, 1.0, 0.40, tex.a * vOpacity);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
    })

    // Add custom attributes
    geo.setAttribute('aRuneIndex', new THREE.Float32BufferAttribute(runeIndices.map(Number), 1))
    geo.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1))
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))

    this._particles = new THREE.Points(geo, mat)
    this._particles.userData = { positions, speeds, count }
    this._scene.add(this._particles)
  }

  _buildRuneAtlas() {
    const tileSize = 32
    const canvas = document.createElement('canvas')
    canvas.width = tileSize * RUNE_SYMBOLS.length
    canvas.height = tileSize
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#33ff66'
    ctx.font = `bold ${tileSize - 4}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    RUNE_SYMBOLS.forEach((sym, i) => {
      ctx.fillText(sym, i * tileSize + tileSize / 2, tileSize / 2)
    })
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }

  _createScanlines() {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float scanline = mod(vUv.y * 300.0 + uTime * 10.0, 2.0);
          float alpha = scanline < 1.0 ? 0.04 : 0.0;
          // Rolling scan bar
          float bar = mod(vUv.y + uTime * 0.1, 1.0);
          float barAlpha = smoothstep(0.0, 0.05, bar) * smoothstep(0.12, 0.06, bar) * 0.06;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha + barAlpha);
        }
      `,
    })
    this._scanlinesMesh = new THREE.Mesh(geo, mat)
    this._scanlinesMesh.position.z = 0.4
    this._scene.add(this._scanlinesMesh)
  }

  _createVignette() {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv * 2.0 - 1.0;
          float vign = length(uv);
          float alpha = smoothstep(0.4, 1.2, vign) * 0.7;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      `,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = 0.45
    this._scene.add(mesh)
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate())
    const t = this._clock.getElapsedTime()

    // Update uniforms
    if (this._bgMesh?.material?.uniforms) {
      this._bgMesh.material.uniforms.uTime.value = t
    }
    if (this._scanlinesMesh?.material?.uniforms) {
      this._scanlinesMesh.material.uniforms.uTime.value = t
    }

    // Float rune particles upward
    if (this._particles) {
      const pos = this._particles.geometry.attributes.position
      const { speeds, count } = this._particles.userData
      for (let i = 0; i < count; i++) {
        pos.array[i * 3 + 1] += speeds[i]
        if (pos.array[i * 3 + 1] > 1.1) {
          pos.array[i * 3 + 1] = -1.1
          pos.array[i * 3] = (Math.random() - 0.5) * 2
        }
      }
      pos.needsUpdate = true
    }

    this._renderer.render(this._scene, this._camera)
  }

  _onResize() {
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }

  destroy() {
    if (this._animId) cancelAnimationFrame(this._animId)
    this._renderer?.dispose()
    window.removeEventListener('resize', this._onResize)
  }
}

// M.E.R.L.I.N. — Sky System
// Inverted hemisphere + gradient shader per biome
// Phase 3: Day/night cycle based on player's real local time + seasonal tinting

import * as THREE from 'three'

const SKY_PROFILES = {
  broceliande:    { top: [0.3, 0.5, 0.8],   bottom: [0.5, 0.7, 0.4],  fogColor: 0x5a7a5a, fogDensity: 0.008 },
  landes:         { top: [0.5, 0.55, 0.65], bottom: [0.65, 0.62, 0.55], fogColor: 0x6a6a65, fogDensity: 0.007 },
  cotes:          { top: [0.4, 0.6, 0.8],   bottom: [0.55, 0.65, 0.72], fogColor: 0x6a8590, fogDensity: 0.009 },
  monts:          { top: [0.2, 0.2, 0.3],   bottom: [0.3, 0.25, 0.3],  fogColor: 0x3a3a45, fogDensity: 0.018 },
  ile_sein:       { top: [0.3, 0.4, 0.65],  bottom: [0.4, 0.5, 0.6],  fogColor: 0x4a6075, fogDensity: 0.006 },
  huelgoat:       { top: [0.3, 0.5, 0.3],   bottom: [0.4, 0.6, 0.3],  fogColor: 0x4a6a4a, fogDensity: 0.012 },
  ecosse:         { top: [0.5, 0.4, 0.5],   bottom: [0.6, 0.5, 0.55], fogColor: 0x6a5068, fogDensity: 0.01 },
  iles_mystiques: { top: [0.6, 0.55, 0.4],  bottom: [0.7, 0.6, 0.45], fogColor: 0x6a6545, fogDensity: 0.006 },
}

// Time-of-day palettes (dawn/day/dusk/night)
const TIME_PALETTES = {
  dawn:  { top: [0.55, 0.4, 0.5],  bottom: [0.85, 0.55, 0.35], blend: 0.6 },
  day:   { top: [0.0, 0.0, 0.0],   bottom: [0.0, 0.0, 0.0],   blend: 0.0 }, // use biome colors
  dusk:  { top: [0.4, 0.25, 0.4],  bottom: [0.8, 0.35, 0.2],  blend: 0.65 },
  night: { top: [0.05, 0.05, 0.15], bottom: [0.08, 0.08, 0.12], blend: 0.85 },
}

// Seasonal tint overlays
const SEASON_TINTS = {
  0: { r: -0.02, g: -0.03, b: 0.05 }, // Samhain (cold, violet mist)
  1: { r: 0.0, g: 0.04, b: -0.02 },   // Imbolc (green, soft)
  2: { r: 0.05, g: 0.03, b: -0.02 },   // Bealtaine (golden, warm)
  3: { r: 0.04, g: -0.02, b: -0.04 },  // Lughnasadh (amber, end of summer)
}

function _getTimePhase(hour) {
  if (hour >= 5 && hour < 8) return { phase: 'dawn', t: (hour - 5) / 3 }
  if (hour >= 8 && hour < 17) return { phase: 'day', t: 0 }
  if (hour >= 17 && hour < 20) return { phase: 'dusk', t: (hour - 17) / 3 }
  return { phase: 'night', t: 0 }
}

function _lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export class SkySystem {
  constructor(biomeKey) {
    const profile = SKY_PROFILES[biomeKey] ?? SKY_PROFILES.broceliande
    this._profile = profile
    this._biomeTop = [...profile.top]
    this._biomeBottom = [...profile.bottom]
    this._mesh = null
    this._starsMesh = null
    this._nightBlend = 0
    this._build(profile)
  }

  getMesh() { return this._mesh }
  getStarsMesh() { return this._starsMesh }
  getFogColor() { return this._profile.fogColor }
  getFogDensity() { return this._profile.fogDensity }
  getNightBlend() { return this._nightBlend }

  _build(profile) {
    const geo = new THREE.SphereGeometry(80, 16, 12)
    this._uniforms = {
      uTopColor: { value: new THREE.Vector3(...profile.top) },
      uBottomColor: { value: new THREE.Vector3(...profile.bottom) },
      uTime: { value: 0 },
    }

    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this._uniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = smoothstep(-0.1, 0.6, h);
          vec3 color = mix(uBottomColor, uTopColor, t);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })

    this._mesh = new THREE.Mesh(geo, mat)

    // Stars (visible at night)
    const starCount = 300
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random()) // upper hemisphere
      const r = 75
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.cos(phi) + 5 // shift up
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({
      size: 0.4,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: false,
    })
    this._starsMesh = new THREE.Points(starGeo, starMat)
  }

  /** Set sky colors based on real time of day + season */
  setTimeOfDay(hour, seasonIndex = 0) {
    const { phase } = _getTimePhase(hour)
    const palette = TIME_PALETTES[phase]
    const seasonTint = SEASON_TINTS[seasonIndex] ?? SEASON_TINTS[0]

    let topColor, bottomColor
    if (palette.blend === 0) {
      // Day — use pure biome colors + season tint
      topColor = [...this._biomeTop]
      bottomColor = [...this._biomeBottom]
    } else {
      // Blend biome with time palette
      topColor = _lerpColor(this._biomeTop, palette.top, palette.blend)
      bottomColor = _lerpColor(this._biomeBottom, palette.bottom, palette.blend)
    }

    // Apply season tint
    topColor[0] = Math.max(0, Math.min(1, topColor[0] + seasonTint.r))
    topColor[1] = Math.max(0, Math.min(1, topColor[1] + seasonTint.g))
    topColor[2] = Math.max(0, Math.min(1, topColor[2] + seasonTint.b))
    bottomColor[0] = Math.max(0, Math.min(1, bottomColor[0] + seasonTint.r * 0.5))
    bottomColor[1] = Math.max(0, Math.min(1, bottomColor[1] + seasonTint.g * 0.5))
    bottomColor[2] = Math.max(0, Math.min(1, bottomColor[2] + seasonTint.b * 0.5))

    this._uniforms.uTopColor.value.set(...topColor)
    this._uniforms.uBottomColor.value.set(...bottomColor)

    // Night blend for post-processing
    this._nightBlend = phase === 'night' ? 0.7 : (phase === 'dusk' ? 0.3 : (phase === 'dawn' ? 0.15 : 0))

    // Stars visibility
    if (this._starsMesh) {
      this._starsMesh.material.opacity = phase === 'night' ? 0.8 : (phase === 'dusk' ? 0.3 : 0)
    }
  }

  dispose() {
    if (this._mesh) {
      this._mesh.geometry.dispose()
      this._mesh.material.dispose()
    }
    if (this._starsMesh) {
      this._starsMesh.geometry.dispose()
      this._starsMesh.material.dispose()
    }
  }
}

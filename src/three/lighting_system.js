// M.E.R.L.I.N. — Lighting System
// DirectionalLight (sun) + AmbientLight (fill) per biome
// Phase 3: Real-time day/night cycle + seasonal modulation from PC clock

import * as THREE from 'three'

// Real-time period from PC clock
export function getRealPeriod() {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  if (h >= 6 && h < 8) return 'aube'
  if (h >= 8 && h < 18) return 'jour'
  if (h >= 18 && h < 20.5) return 'crepuscule'
  return 'nuit'
}

// Real-time season from PC month
export function getRealSeason() {
  const m = new Date().getMonth() // 0-11
  if (m >= 2 && m <= 4) return 'printemps'
  if (m >= 5 && m <= 7) return 'ete'
  if (m >= 8 && m <= 10) return 'automne'
  return 'hiver'
}

// Season color multipliers
const SEASON_MODS = {
  printemps: { ground: 1.15, canopy: 1.1, fogDensity: 0.8, sunWarmth: 0.0 },
  ete:       { ground: 1.0,  canopy: 0.95, fogDensity: 0.6, sunWarmth: 0.1 },
  automne:   { ground: 0.85, canopy: 0.7, fogDensity: 1.2, sunWarmth: 0.15 },
  hiver:     { ground: 0.7,  canopy: 0.6, fogDensity: 1.5, sunWarmth: -0.1 },
}

// Biome color grading:
// - Forest (broceliande/huelgoat): green-tinted ambient
// - Marais-like (monts): purple/blue fog ambient
// - Cotes: bright blue-white ambient
// - Landes: warm amber ambient
// - Ecosse: heather purple-grey
// - Iles mystiques: golden glow
const LIGHT_PROFILES = {
  broceliande:    { sunColor: 0xddcc88, sunIntensity: 1.2, ambColor: 0x3a7a3a, ambIntensity: 0.85, sunDir: [1, 2, 0.5] },
  landes:         { sunColor: 0xccbb88, sunIntensity: 1.0, ambColor: 0x7a6a40, ambIntensity: 0.8, sunDir: [0, 2, 1] },
  cotes:          { sunColor: 0xccddee, sunIntensity: 1.4, ambColor: 0x6a88aa, ambIntensity: 0.75, sunDir: [-1, 2, 0.5] },
  monts:          { sunColor: 0x776677, sunIntensity: 0.7, ambColor: 0x3a3060, ambIntensity: 0.5, sunDir: [0, 1, -1] },
  ile_sein:       { sunColor: 0x8899dd, sunIntensity: 1.1, ambColor: 0x4a6080, ambIntensity: 0.8, sunDir: [0, 3, 1] },
  huelgoat:       { sunColor: 0x99dd77, sunIntensity: 0.9, ambColor: 0x2a6a2a, ambIntensity: 0.7, sunDir: [1, 1, 0] },
  ecosse:         { sunColor: 0xbbaa99, sunIntensity: 0.9, ambColor: 0x4a4560, ambIntensity: 0.7, sunDir: [1, 2, -0.5] },
  iles_mystiques: { sunColor: 0xffdd88, sunIntensity: 1.5, ambColor: 0x6a6545, ambIntensity: 0.9, sunDir: [0, 3, 0] },
}

const MOODS = {
  warm:    { sunColor: 0xffcc88, ambBoost: 1.2 },
  cold:    { sunColor: 0x88aadd, ambBoost: 0.8 },
  danger:  { sunColor: 0xcc4422, ambBoost: 0.6 },
  sacred:  { sunColor: 0xddddff, ambBoost: 1.3 },
  journey: { sunColor: 0xddbb66, ambBoost: 1.1 },
  dark:    { sunColor: 0x334466, ambBoost: 0.4 },
  festive: { sunColor: 0xffdd99, ambBoost: 1.4 },
  neutral: { sunColor: null, ambBoost: 1.0 },
}

// Time-based sun color and intensity multipliers (French period keys)
const TIME_SUN = {
  aube:        { color: 0xffaa66, intensityMul: 0.7, ambMul: 0.7, ambColor: null },
  jour:        { color: null,     intensityMul: 1.0, ambMul: 1.0, ambColor: null },
  crepuscule:  { color: 0xff7744, intensityMul: 0.55, ambMul: 0.7, ambColor: null },
  nuit:        { color: 0x3344aa, intensityMul: 0.12, ambMul: 0.5, ambColor: 0x2a3a6a },
}

export class LightingSystem {
  constructor(biomeKey) {
    const profile = LIGHT_PROFILES[biomeKey] ?? LIGHT_PROFILES.broceliande
    this._profile = profile
    this._lights = []

    const sun = new THREE.DirectionalLight(profile.sunColor, profile.sunIntensity * 1.3)
    sun.position.set(...profile.sunDir).normalize().multiplyScalar(20)
    this._lights.push(sun)
    this._sun = sun
    this._baseSunIntensity = profile.sunIntensity * 1.3
    this._baseSunColor = new THREE.Color(profile.sunColor)

    const ambient = new THREE.AmbientLight(profile.ambColor, profile.ambIntensity)
    this._lights.push(ambient)
    this._ambient = ambient
    this._baseAmbIntensity = profile.ambIntensity

    // Hemisphere light for rich forest ambient
    const hemi = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.7)
    this._lights.push(hemi)

    // Scene fog reference (set via setFog)
    this._fog = null
    this._baseFogDensity = 0
  }

  getLights() { return this._lights }

  /** Store reference to scene fog for seasonal modulation */
  setFog(fog) {
    this._fog = fog
    this._baseFogDensity = fog ? fog.density : 0
  }

  setMood(mood) {
    const m = MOODS[mood] ?? MOODS.neutral
    if (m.sunColor && this._sun) this._sun.color.set(m.sunColor)
    if (this._ambient) this._ambient.intensity = this._baseAmbIntensity * m.ambBoost
  }

  resetMood() {
    this.setMood('neutral')
  }

  /** Adjust sun/ambient/fog based on real PC time + season */
  setTimeOfDay(hour) {
    const period = getRealPeriod()
    const season = getRealSeason()
    const config = TIME_SUN[period]
    const sMod = SEASON_MODS[season]

    // --- Sun intensity (enforce bright daytime: >= 1.5) ---
    let sunIntensity = this._baseSunIntensity * config.intensityMul
    if (period === 'jour') {
      sunIntensity = Math.max(1.5, sunIntensity)
    }
    this._sun.intensity = sunIntensity

    // --- Sun color (null = use biome default) ---
    if (config.color) {
      this._sun.color.set(config.color)
    } else {
      this._sun.color.copy(this._baseSunColor)
    }

    // --- Season: warm/cool the sun ---
    if (sMod.sunWarmth > 0) {
      this._sun.color.r = Math.min(1, this._sun.color.r + sMod.sunWarmth)
      this._sun.color.b = Math.max(0, this._sun.color.b - sMod.sunWarmth * 0.5)
    } else if (sMod.sunWarmth < 0) {
      // Hiver: cooler sun (more blue, less red)
      this._sun.color.r = Math.max(0, this._sun.color.r + sMod.sunWarmth)
      this._sun.color.b = Math.min(1, this._sun.color.b - sMod.sunWarmth * 0.3)
    }

    // --- Ambient ---
    let ambIntensity = this._baseAmbIntensity * config.ambMul
    if (period === 'jour') {
      ambIntensity = Math.max(0.6, ambIntensity)
    }
    this._ambient.intensity = ambIntensity

    if (config.ambColor) {
      this._ambient.color.set(config.ambColor)
    } else {
      this._ambient.color.set(this._profile.ambColor)
    }

    // Hiver: blue-grey ambient override
    if (season === 'hiver' && period !== 'nuit') {
      this._ambient.color.lerp(new THREE.Color(0x8899bb), 0.3)
    }

    // --- Fog: season modulation ---
    if (this._fog) {
      let fogDensity = this._baseFogDensity * sMod.fogDensity
      // Enforce bright daytime: fog <= 0.015
      if (period === 'jour') {
        fogDensity = Math.min(0.015, fogDensity)
      }
      // Night: denser fog
      if (period === 'nuit') {
        fogDensity *= 1.4
      }
      this._fog.density = fogDensity
    }
  }

  /**
   * Create fake shadow blobs under billboard trees
   */
  createShadowBlobs(positions, heightFn) {
    if (!positions || positions.length === 0) return null
    const geo = new THREE.CircleGeometry(0.8, 6)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    })
    const count = Math.min(positions.length, 400)
    const mesh = new THREE.InstancedMesh(geo, mat, count)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const p = positions[i]
      const y = heightFn ? heightFn(p.x, p.z) + 0.05 : p.y + 0.05
      dummy.position.set(p.x, y, p.z)
      dummy.scale.set(1.5 + Math.random() * 1.0, 1, 1.5 + Math.random() * 1.0)
      dummy.rotation.y = Math.random() * Math.PI
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.renderOrder = 1
    this._lights.push(mesh) // Store for disposal
    return mesh
  }

  dispose() {
    for (const l of this._lights) {
      if (l.geometry) { l.geometry.dispose(); l.material.dispose() }
    }
  }
}

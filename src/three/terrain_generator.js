// M.E.R.L.I.N. — Procedural Terrain Generator
// PlaneGeometry + noise displacement per biome. 1 draw call, ~16K vertices

import * as THREE from 'three'

// Random seed per run (makes terrain different each game)
let _seed = Math.floor(Math.random() * 100000)
export function setTerrainSeed(s) { _seed = s }

// Simple 2D noise (value noise with smoothstep)
function _hash(x, y) {
  let h = (x + _seed) * 374761393 + (y + _seed * 7) * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (h & 0x7fffffff) / 0x7fffffff
}

function _smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = _hash(ix, iy), b = _hash(ix + 1, iy)
  const c = _hash(ix, iy + 1), d = _hash(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

function _fbm(x, y, octaves, freq, amp) {
  let val = 0, f = freq, a = amp
  for (let i = 0; i < octaves; i++) {
    val += _smoothNoise(x * f, y * f) * a
    f *= 2.1
    a *= 0.45
  }
  return val
}

// Biome terrain profiles
const BIOME_PROFILES = {
  broceliande:    { amplitude: 6,   frequency: 0.02, octaves: 4, colors: [[0.2, 0.55, 0.15], [0.3, 0.7, 0.25], [0.45, 0.8, 0.35]] },
  landes:         { amplitude: 1,   frequency: 0.01, octaves: 2, colors: [[0.4, 0.38, 0.3], [0.5, 0.48, 0.35], [0.55, 0.52, 0.4]] },
  cotes:          { amplitude: 6,   frequency: 0.03, octaves: 3, colors: [[0.7, 0.65, 0.5], [0.45, 0.55, 0.5], [0.35, 0.45, 0.4]] },
  monts:          { amplitude: 8,   frequency: 0.04, octaves: 4, colors: [[0.25, 0.22, 0.2], [0.38, 0.33, 0.28], [0.48, 0.43, 0.38]] },
  ile_sein:       { amplitude: 1.5, frequency: 0.015, octaves: 2, colors: [[0.4, 0.48, 0.55], [0.35, 0.5, 0.45], [0.4, 0.55, 0.5]] },
  huelgoat:       { amplitude: 5,   frequency: 0.06, octaves: 4, colors: [[0.22, 0.4, 0.2], [0.3, 0.5, 0.25], [0.28, 0.45, 0.22]] },
  ecosse:         { amplitude: 4,   frequency: 0.03, octaves: 3, colors: [[0.42, 0.32, 0.38], [0.38, 0.35, 0.33], [0.34, 0.3, 0.35]] },
  iles_mystiques: { amplitude: 3,   frequency: 0.02, octaves: 3, colors: [[0.45, 0.42, 0.35], [0.55, 0.5, 0.4], [0.65, 0.56, 0.45]] },
}

export class TerrainGenerator {
  constructor(biomeKey) {
    const profile = BIOME_PROFILES[biomeKey] ?? BIOME_PROFILES.broceliande
    this._profile = profile
    this._mesh = null
    this._size = 200
    this._segments = 128
    this._pathCurve = null

    this._build(profile)
  }

  getMesh() { return this._mesh }

  setPathCurve(curve) {
    this._pathCurve = curve
    if (curve) this._applyPathToTerrain(curve)
  }

  heightAt(x, z) {
    const p = this._profile
    return _fbm(x, z, p.octaves, p.frequency, p.amplitude) + _smoothNoise(x * 0.15, z * 0.15) * 0.3
  }

  _distToPath(x, z, curve) {
    let minDist = Infinity
    for (let i = 0; i <= 50; i++) {
      const p = curve.getPointAt(i / 50)
      const dx = x - p.x, dz = z - p.z
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < minDist) minDist = d
    }
    return minDist
  }

  _applyPathToTerrain(curve) {
    const geo = this._mesh.geometry
    const pos = geo.attributes.position
    const colors = geo.attributes.color
    const profile = this._profile
    const [cLow, cMid, cHigh] = profile.colors
    // Smooth dirt trail color (warm earthy brown)
    const trailCenter = [0.45, 0.30, 0.14]
    const trailEdge = [0.38, 0.32, 0.18]

    for (let i = 0; i < pos.count; i++) {
      const x = pos.array[i * 3]
      const z = pos.array[i * 3 + 2]
      const dist = this._distToPath(x, z, curve)

      // Smooth trail (3.5 units wide) with gentle edges
      if (dist < 4.0) {
        const baseY = _fbm(x, z, profile.octaves, profile.frequency, profile.amplitude)
        // Smooth blend: cubic falloff for gentle edges
        const raw = Math.max(0, 1 - dist / 4.0)
        const blend = raw * raw * (3 - 2 * raw) // smoothstep
        // Flatten center strongly, edges gently
        const flatFactor = blend * 0.9
        pos.array[i * 3 + 1] = baseY * (1 - flatFactor)

        const t = Math.min(1, Math.max(0, (baseY + profile.amplitude * 0.5) / (profile.amplitude * 1.5)))
        const baseC = t < 0.5
          ? [cLow[0] + (cMid[0] - cLow[0]) * t * 2, cLow[1] + (cMid[1] - cLow[1]) * t * 2, cLow[2] + (cMid[2] - cLow[2]) * t * 2]
          : [cMid[0] + (cHigh[0] - cMid[0]) * (t - 0.5) * 2, cMid[1] + (cHigh[1] - cMid[1]) * (t - 0.5) * 2, cMid[2] + (cHigh[2] - cMid[2]) * (t - 0.5) * 2]

        // Smooth gradient: center = dirt, edges = blend to terrain
        const tc = dist < 1.5 ? trailCenter : trailEdge

        colors.array[i * 3] = baseC[0] + (tc[0] - baseC[0]) * blend
        colors.array[i * 3 + 1] = baseC[1] + (tc[1] - baseC[1]) * blend
        colors.array[i * 3 + 2] = baseC[2] + (tc[2] - baseC[2]) * blend
      }
    }

    pos.needsUpdate = true
    colors.needsUpdate = true
    geo.computeVertexNormals()
  }

  _build(profile) {
    const geo = new THREE.PlaneGeometry(this._size, this._size, this._segments, this._segments)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const [cLow, cMid, cHigh] = profile.colors

    for (let i = 0; i < pos.count; i++) {
      const x = pos.array[i * 3]
      const z = pos.array[i * 3 + 2]
      const y = _fbm(x, z, profile.octaves, profile.frequency, profile.amplitude)
      pos.array[i * 3 + 1] = y

      // Height-based vertex coloring
      const t = Math.min(1, Math.max(0, (y + profile.amplitude * 0.5) / (profile.amplitude * 1.5)))
      const c = t < 0.5
        ? [cLow[0] + (cMid[0] - cLow[0]) * t * 2, cLow[1] + (cMid[1] - cLow[1]) * t * 2, cLow[2] + (cMid[2] - cLow[2]) * t * 2]
        : [cMid[0] + (cHigh[0] - cMid[0]) * (t - 0.5) * 2, cMid[1] + (cHigh[1] - cMid[1]) * (t - 0.5) * 2, cMid[2] + (cHigh[2] - cMid[2]) * (t - 0.5) * 2]
      colors[i * 3] = c[0]
      colors[i * 3 + 1] = c[1]
      colors[i * 3 + 2] = c[2]
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    })

    this._mesh = new THREE.Mesh(geo, mat)
  }

  dispose() {
    if (this._mesh) {
      this._mesh.geometry.dispose()
      this._mesh.material.dispose()
    }
  }
}

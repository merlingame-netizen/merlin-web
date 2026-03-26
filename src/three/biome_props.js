// M.E.R.L.I.N. — Biome Props Generator
// Procedural props via InstancedMesh per biome: trees (split trunk/canopy), menhirs, rocks, etc.
// Phase 1: Fixed trunk-canopy gap, brown trunks, thicker menhirs
// Phase 2: Wind vertex shader on grass/fern

import * as THREE from 'three'

// Simple seeded random
function _seededRandom(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

// Spatial collision grid — prevents props overlapping
class _CollisionGrid {
  constructor(cellSize = 4) { this._cells = new Map(); this._cs = cellSize }
  _key(x, z) { return `${Math.floor(x / this._cs)},${Math.floor(z / this._cs)}` }
  occupied(x, z, r) {
    const cx = Math.floor(x / this._cs), cz = Math.floor(z / this._cs)
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const items = this._cells.get(`${cx + dx},${cz + dz}`)
      if (items) for (const it of items) {
        if (Math.hypot(x - it.x, z - it.z) < r + it.r) return true
      }
    }
    return false
  }
  add(x, z, r) {
    const k = this._key(x, z)
    if (!this._cells.has(k)) this._cells.set(k, [])
    this._cells.get(k).push({ x, z, r })
  }
}

// ── Wind vertex shader for grass/fern (opaque solid 3D tufts) ────────────
const WIND_VERTEX = `
  uniform float uTime;
  uniform float uWindStrength;
  void main() {
    vec3 pos = position;
    float windFactor = smoothstep(0.0, 0.5, pos.y);
    // Perlin-like variation: sum of multiple sin frequencies for non-uniform wind
    float windX = sin(uTime * 2.0 + pos.x * 3.0 + pos.z * 2.0)
                + 0.5 * sin(uTime * 3.7 + pos.x * 1.3 + pos.z * 4.1)
                + 0.25 * sin(uTime * 5.3 + pos.x * 7.0 + pos.z * 0.8);
    float windZ = cos(uTime * 1.5 + pos.z * 4.0)
                + 0.4 * cos(uTime * 2.9 + pos.z * 1.7 + pos.x * 3.3)
                + 0.2 * cos(uTime * 4.1 + pos.z * 6.0 + pos.x * 1.1);
    pos.x += windX * uWindStrength * 0.57 * windFactor;
    pos.z += windZ * uWindStrength * 0.33 * windFactor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
const WIND_FRAGMENT = `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`

// ── Biome trunk colors ──────────────────────────────────────────────────
const TRUNK_COLORS = {
  broceliande: 0x6a5030, landes: 0x5a4a30, cotes: 0x7a6a50, monts: 0x4a3a2a,
  ile_sein: 0x5a5040, huelgoat: 0x5a4a28, ecosse: 0x6a5a40, iles_mystiques: 0x8a7040,
}

const PROP_CONFIGS = {
  broceliande: [
    { type: 'tree_trunk', count: 600, spread: 90, scaleMin: 2.0, scaleMax: 5.0, color: 0x6a5030 },
    { type: 'tree_canopy', count: 600, spread: 90, scaleMin: 2.0, scaleMax: 5.0, color: 0x6ab862, _pairTrunk: true },
    { type: 'tree_trunk', count: 400, spread: 60, scaleMin: 0.8, scaleMax: 2.0, color: 0x6a5030 },
    { type: 'tree_canopy', count: 400, spread: 60, scaleMin: 0.8, scaleMax: 2.0, color: 0x7aaa60, _pairTrunk: true },
    { type: 'bush', count: 600, spread: 80, scaleMin: 0.3, scaleMax: 1.0, color: 0x7aaa60 },
    { type: 'rock', count: 40, spread: 80, scaleMin: 0.2, scaleMax: 0.6, color: 0x6a6a5a },
    { type: 'rock', count: 20, spread: 60, scaleMin: 0.4, scaleMax: 1.0, color: 0x5a5a4a },
    { type: 'flower', count: 150, spread: 75, scaleMin: 0.3, scaleMax: 1.0, color: 0x9966cc },
    { type: 'flower', count: 100, spread: 70, scaleMin: 0.3, scaleMax: 0.8, color: 0xddaa44 },
    { type: 'mushroom', count: 100, spread: 65, scaleMin: 0.3, scaleMax: 1.0, color: 0xcc8844 },
    { type: 'mushroom', count: 50, spread: 50, scaleMin: 0.5, scaleMax: 1.4, color: 0xaa6633 },
    { type: 'grass_patch', count: 1200, spread: 85, scaleMin: 0.5, scaleMax: 1.5, color: 0x5aaa44 },
    { type: 'grass_patch', count: 600, spread: 75, scaleMin: 0.3, scaleMax: 0.8, color: 0x78bb55 },
    { type: 'tall_grass', count: 300, spread: 80, scaleMin: 0.6, scaleMax: 1.3, color: 0x66aa44 },
    { type: 'fern', count: 80, spread: 55, scaleMin: 0.4, scaleMax: 0.8, color: 0x4a9a44 },
    { type: 'fallen_log', count: 50, spread: 70, scaleMin: 0.6, scaleMax: 1.5, color: 0x7a6a40 },
    { type: 'stump', count: 40, spread: 60, scaleMin: 0.5, scaleMax: 1.2, color: 0x6a5a40 },
  ],
  landes: [
    { type: 'menhir', count: 90, spread: 80, scaleMin: 1.5, scaleMax: 4.5, color: 0x7a7a70 },
    { type: 'bush', count: 240, spread: 80, scaleMin: 0.2, scaleMax: 0.6, color: 0x6a7a50 },
    { type: 'rock', count: 60, spread: 70, scaleMin: 0.3, scaleMax: 1.0, color: 0x6a6a60 },
    { type: 'grass_patch', count: 400, spread: 80, scaleMin: 0.4, scaleMax: 1.0, color: 0x6a8a50 },
    { type: 'flower', count: 120, spread: 70, scaleMin: 0.2, scaleMax: 0.6, color: 0xbb88aa },
    { type: 'stump', count: 25, spread: 60, scaleMin: 0.5, scaleMax: 1.2, color: 0x6a5a40 },
  ],
  cotes: [
    { type: 'rock', count: 180, spread: 80, scaleMin: 0.8, scaleMax: 3.0, color: 0x8a8070 },
    { type: 'pillar', count: 40, spread: 60, scaleMin: 2.0, scaleMax: 6.0, color: 0x7a7570 },
    { type: 'bush', count: 90, spread: 70, scaleMin: 0.2, scaleMax: 0.5, color: 0x6a8060 },
    { type: 'grass_patch', count: 200, spread: 70, scaleMin: 0.4, scaleMax: 0.9, color: 0x5a8a5a },
    { type: 'fallen_log', count: 20, spread: 50, scaleMin: 0.6, scaleMax: 1.2, color: 0x8a7a5a },
    { type: 'flower', count: 80, spread: 60, scaleMin: 0.2, scaleMax: 0.5, color: 0xaabbcc },
  ],
  monts: [
    { type: 'peak', count: 70, spread: 80, scaleMin: 3.0, scaleMax: 10.0, color: 0x4a3a45 },
    { type: 'deadtree', count: 120, spread: 70, scaleMin: 1.0, scaleMax: 3.0, color: 0x5a4a40 },
    { type: 'rock', count: 90, spread: 60, scaleMin: 1.0, scaleMax: 3.0, color: 0x454040 },
    { type: 'stump', count: 40, spread: 50, scaleMin: 0.5, scaleMax: 1.5, color: 0x4a3a30 },
    { type: 'mushroom', count: 60, spread: 50, scaleMin: 0.3, scaleMax: 0.8, color: 0x6a4a55 },
    { type: 'grass_patch', count: 150, spread: 60, scaleMin: 0.3, scaleMax: 0.8, color: 0x3a4a3a },
  ],
  ile_sein: [
    { type: 'menhir', count: 60, spread: 50, scaleMin: 1.0, scaleMax: 3.5, color: 0x7a8085 },
    { type: 'altar', count: 12, spread: 30, scaleMin: 1.0, scaleMax: 1.5, color: 0x8a8a80 },
    { type: 'rock', count: 75, spread: 60, scaleMin: 0.5, scaleMax: 2.0, color: 0x7a7a75 },
    { type: 'grass_patch', count: 200, spread: 50, scaleMin: 0.4, scaleMax: 1.0, color: 0x5a7a5a },
    { type: 'flower', count: 100, spread: 40, scaleMin: 0.3, scaleMax: 0.7, color: 0x88aacc },
  ],
  huelgoat: [
    { type: 'boulder', count: 150, spread: 60, scaleMin: 1.5, scaleMax: 6.0, color: 0x6a6a5a },
    { type: 'tree_trunk', count: 350, spread: 70, scaleMin: 1.2, scaleMax: 3.5, color: 0x5a4a28 },
    { type: 'tree_canopy', count: 350, spread: 70, scaleMin: 1.2, scaleMax: 3.5, color: 0x5a8055, _pairTrunk: true },
    { type: 'bush', count: 120, spread: 50, scaleMin: 0.3, scaleMax: 0.8, color: 0x5a7550 },
    { type: 'mushroom', count: 100, spread: 50, scaleMin: 0.4, scaleMax: 1.2, color: 0xaa7744 },
    { type: 'fallen_log', count: 30, spread: 55, scaleMin: 0.8, scaleMax: 2.0, color: 0x6a5a35 },
    { type: 'grass_patch', count: 250, spread: 60, scaleMin: 0.5, scaleMax: 1.2, color: 0x3a6a2a },
  ],
  ecosse: [
    { type: 'cairn', count: 70, spread: 70, scaleMin: 1.0, scaleMax: 3.0, color: 0x7a7070 },
    { type: 'bush', count: 240, spread: 80, scaleMin: 0.2, scaleMax: 0.6, color: 0x7a5a70 },
    { type: 'rock', count: 60, spread: 60, scaleMin: 0.5, scaleMax: 1.5, color: 0x6a6065 },
    { type: 'grass_patch', count: 350, spread: 80, scaleMin: 0.4, scaleMax: 1.0, color: 0x5a6a5a },
    { type: 'flower', count: 100, spread: 60, scaleMin: 0.2, scaleMax: 0.5, color: 0xaa77aa },
    { type: 'stump', count: 20, spread: 50, scaleMin: 0.5, scaleMax: 1.0, color: 0x5a4a40 },
  ],
  iles_mystiques: [
    { type: 'crystal', count: 100, spread: 60, scaleMin: 1.0, scaleMax: 3.5, color: 0xaa9a60 },
    { type: 'portal', count: 20, spread: 50, scaleMin: 2.0, scaleMax: 4.0, color: 0xccaa50 },
    { type: 'tree_trunk', count: 120, spread: 70, scaleMin: 1.0, scaleMax: 2.0, color: 0x8a7040 },
    { type: 'tree_canopy', count: 120, spread: 70, scaleMin: 1.0, scaleMax: 2.0, color: 0x8a8060, _pairTrunk: true },
    { type: 'flower', count: 150, spread: 50, scaleMin: 0.3, scaleMax: 1.0, color: 0xddaa66 },
    { type: 'mushroom', count: 60, spread: 40, scaleMin: 0.5, scaleMax: 1.2, color: 0xbbaa55 },
    { type: 'grass_patch', count: 200, spread: 60, scaleMin: 0.4, scaleMax: 1.0, color: 0x6a7a40 },
  ],
}

// Merge BufferGeometries into one (positions + normals + indices)
function _mergeGeometries(geos) {
  let totalVerts = 0
  let totalIndices = 0
  let hasUV = false
  for (const g of geos) {
    totalVerts += g.attributes.position.count
    totalIndices += g.index ? g.index.count : g.attributes.position.count
    if (g.attributes.uv) hasUV = true
  }
  const pos = new Float32Array(totalVerts * 3)
  const norm = new Float32Array(totalVerts * 3)
  const uvs = hasUV ? new Float32Array(totalVerts * 2) : null
  const indices = new Uint16Array(totalIndices)
  let vOff = 0, iOff = 0, baseVert = 0
  for (const g of geos) {
    const p = g.attributes.position.array
    const n = g.attributes.normal?.array
    pos.set(p, vOff * 3)
    if (n) norm.set(n, vOff * 3)
    if (uvs && g.attributes.uv) {
      uvs.set(g.attributes.uv.array, vOff * 2)
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices[iOff + i] = g.index.array[i] + baseVert
      iOff += g.index.count
    } else {
      for (let i = 0; i < p.length / 3; i++) indices[iOff + i] = baseVert + i
      iOff += p.length / 3
    }
    baseVert += g.attributes.position.count
    vOff += g.attributes.position.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3))
  if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  return merged
}

// ── Solid 3D grass/fern geometry builders ─────────────────────────────────
function _grassTuftGeometry() {
  // Flat star-shaped ground cover (not pointy cones)
  const verts = []
  const indices = []
  const points = 5 + Math.floor(Math.random() * 3) // 5-7 points
  const radius = 0.08 + Math.random() * 0.06
  const height = 0.02 + Math.random() * 0.02 // Very low — ground hugging

  // Center vertex
  verts.push(0, height, 0)
  // Outer ring
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
    const r = radius * (0.7 + Math.random() * 0.3)
    verts.push(Math.cos(angle) * r, Math.random() * 0.01, Math.sin(angle) * r)
  }
  // Fan triangles from center to ring
  for (let i = 0; i < points; i++) {
    indices.push(0, 1 + i, 1 + ((i + 1) % points))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function _tallGrassGeometry() {
  const verts = []
  const bladeCount = 2 + Math.floor(Math.random() * 2)
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const h = 0.4 + Math.random() * 0.4
    const w = 0.025 + Math.random() * 0.015
    const lean = 0.06 + Math.random() * 0.06
    const cos_a = Math.cos(angle), sin_a = Math.sin(angle)
    verts.push(
      -w * cos_a, 0, -w * sin_a,
       w * cos_a, 0,  w * sin_a,
       lean * cos_a, h, lean * sin_a
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const indices = []
  for (let b = 0; b < bladeCount; b++) {
    const base = b * 3
    indices.push(base, base + 1, base + 2)
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function _fernGeometry() {
  const verts = []
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
    const len = 0.2 + Math.random() * 0.1
    const cos_a = Math.cos(angle), sin_a = Math.sin(angle)
    const cos_b = Math.cos(angle + 0.3), sin_b = Math.sin(angle + 0.3)
    verts.push(
      0, 0.02, 0,
      len * cos_a, 0.05, len * sin_a,
      len * 0.7 * cos_b, 0.04, len * 0.7 * sin_b
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const indices = []
  for (let b = 0; b < 4; b++) {
    const base = b * 3
    indices.push(base, base + 1, base + 2)
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function _getGeometry(type) {
  switch (type) {
    case 'tree_trunk': {
      // Brown trunk cylinder — top at Y=1.5
      const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 5)
      trunk.translate(0, 0.75, 0)
      return trunk
    }
    case 'tree_canopy': {
      const s1 = new THREE.IcosahedronGeometry(1.1, 1)
      s1.translate(0, 2.3, 0)
      const s2 = new THREE.IcosahedronGeometry(0.85, 1)
      s2.translate(0.2, 3.0, 0.15)
      const s3 = new THREE.IcosahedronGeometry(0.6, 1)
      s3.translate(-0.15, 3.5, -0.1)
      return _mergeGeometries([s1, s2, s3])
    }
    case 'tree': {
      // Legacy merged tree — icosahedron canopies (no cones)
      const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 5)
      trunk.translate(0, 0.75, 0)
      const s1 = new THREE.IcosahedronGeometry(1.1, 1)
      s1.translate(0, 2.3, 0)
      const s2 = new THREE.IcosahedronGeometry(0.85, 1)
      s2.translate(0.2, 3.0, 0.15)
      const s3 = new THREE.IcosahedronGeometry(0.6, 1)
      s3.translate(-0.15, 3.5, -0.1)
      return _mergeGeometries([trunk, s1, s2, s3])
    }
    case 'menhir': {
      // Thicker tapered standing stone
      const stone = new THREE.CylinderGeometry(0.35, 0.45, 3.0, 5)
      stone.translate(0, 1.5, 0)
      return stone
    }
    case 'rock':
    case 'boulder':
      return new THREE.DodecahedronGeometry(1, 1)
    case 'bush': {
      const s1 = new THREE.SphereGeometry(0.4, 6, 5)
      const s2 = new THREE.SphereGeometry(0.35, 6, 5)
      s2.translate(0.25, 0.1, 0.15)
      const s3 = new THREE.SphereGeometry(0.3, 6, 5)
      s3.translate(-0.2, 0.05, -0.15)
      return _mergeGeometries([s1, s2, s3])
    }
    case 'crystal':
      return new THREE.OctahedronGeometry(1, 0)
    case 'pillar':
      return new THREE.CylinderGeometry(0.3, 0.4, 3.0, 6)
    case 'peak':
      return new THREE.DodecahedronGeometry(2.0, 0)
    case 'deadtree': {
      const dt = new THREE.CylinderGeometry(0.08, 0.2, 2.5, 5)
      dt.translate(0, 1.25, 0)
      const branch = new THREE.CylinderGeometry(0.03, 0.06, 0.8, 4)
      branch.rotateZ(0.7)
      branch.translate(0.3, 2.0, 0)
      return _mergeGeometries([dt, branch])
    }
    case 'cairn':
      return new THREE.DodecahedronGeometry(0.8, 1)
    case 'portal':
      return new THREE.TorusGeometry(1.5, 0.2, 8, 12)
    case 'altar':
      return new THREE.BoxGeometry(2.0, 0.5, 1.5)
    case 'flower': {
      const stem = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 3)
      stem.translate(0, 0.1, 0)
      const petal = new THREE.SphereGeometry(0.1, 5, 3)
      petal.translate(0, 0.25, 0)
      return _mergeGeometries([stem, petal])
    }
    case 'mushroom': {
      // Thicker stem + flattened cap
      const mStem = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 5)
      mStem.translate(0, 0.075, 0)
      const cap = new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55)
      cap.scale(1, 0.5, 1)
      cap.translate(0, 0.2, 0)
      return _mergeGeometries([mStem, cap])
    }
    case 'grass_patch':
      return _grassTuftGeometry()
    case 'tall_grass':
      return _tallGrassGeometry()
    case 'fern':
      return _fernGeometry()
    case 'fallen_log':
      return new THREE.CylinderGeometry(0.12, 0.15, 2.0, 6)
    case 'stump': {
      const st = new THREE.CylinderGeometry(0.22, 0.3, 0.35, 7)
      st.translate(0, 0.175, 0)
      return st
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

function _distToPath(x, z, curve) {
  let minDist = Infinity
  for (let i = 0; i <= 50; i++) {
    const p = curve.getPointAt(i / 50)
    const dx = x - p.x, dz = z - p.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < minDist) minDist = d
  }
  return minDist
}

export class BiomeProps {
  constructor(biomeKey, heightFn, pathCurve) {
    this._meshes = []
    this._windMaterials = [] // grass/fern ShaderMaterials for time update
    const configs = PROP_CONFIGS[biomeKey] ?? PROP_CONFIGS.broceliande

    // Track previous trunk InstancedMesh matrices for pairing canopy
    let lastTrunkMatrices = null
    const collisionGrid = new _CollisionGrid(4)

    for (let ci = 0; ci < configs.length; ci++) {
      const config = configs[ci]
      const geo = _getGeometry(config.type)
      const isVegetation = ['tree_canopy', 'tree', 'bush', 'grass_patch', 'flower', 'fern'].includes(config.type)
      const isTrunk = config.type === 'tree_trunk'
      const isWind = config.type === 'grass_patch' || config.type === 'fern' || config.type === 'tall_grass'

      let mat
      if (isWind) {
        // Opaque wind shader material for solid 3D grass/fern tufts
        const c = new THREE.Color(config.color)
        mat = new THREE.ShaderMaterial({
          vertexShader: WIND_VERTEX,
          fragmentShader: WIND_FRAGMENT,
          uniforms: {
            uTime: { value: 0 },
            uWindStrength: { value: 0.06 },
            uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
          },
          side: THREE.DoubleSide,
        })
        this._windMaterials.push(mat)
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: config.color,
          roughness: isTrunk ? 0.9 : (isVegetation ? 0.6 : 0.8),
          metalness: 0.1,
          flatShading: true,
        })

        if (config.type === 'crystal' || config.type === 'portal') {
          mat.emissive = new THREE.Color(config.color)
          mat.emissiveIntensity = 0.4
          mat.transparent = true
          mat.opacity = 0.8
        }
      }

      const instanced = new THREE.InstancedMesh(geo, mat, config.count)
      const rng = _seededRandom(biomeKey.length * 1000 + config.count + ci)
      const dummy = new THREE.Object3D()
      let placed = 0

      // If this is a canopy paired with trunk, reuse trunk matrices
      const usePairedMatrices = config._pairTrunk && lastTrunkMatrices

      if (usePairedMatrices) {
        // Copy exact same transforms from paired trunk
        const count = Math.min(config.count, lastTrunkMatrices.length)
        for (let i = 0; i < count; i++) {
          instanced.setMatrixAt(i, lastTrunkMatrices[i])
          placed++
        }
      } else {
        const matrices = []
        const collisionR = isTrunk ? 1.5 : (config.type === 'rock' || config.type === 'menhir' ? 1.2 : 0.8)
        for (let i = 0; i < config.count * 4 && placed < config.count; i++) {
          const x = (rng() - 0.5) * config.spread * 2
          const z = (rng() - 0.5) * config.spread * 2

          if (pathCurve) {
            const dist = _distToPath(x, z, pathCurve)
            if (dist < 3.0) continue
          }

          // Collision check — prevent prop overlap
          if (collisionGrid.occupied(x, z, collisionR)) continue

          const y = heightFn(x, z)
          const scale = config.scaleMin + rng() * (config.scaleMax - config.scaleMin)

          dummy.position.set(x, y, z)
          dummy.rotation.y = rng() * Math.PI * 2
          if (config.type === 'portal') dummy.rotation.x = Math.PI / 2
          if (config.type === 'fallen_log') dummy.rotation.z = Math.PI / 2
          dummy.scale.setScalar(scale)
          dummy.updateMatrix()
          instanced.setMatrixAt(placed, dummy.matrix)
          matrices.push(dummy.matrix.clone())
          collisionGrid.add(x, z, collisionR * scale)
          placed++
        }

        // Store matrices if this is a trunk for pairing
        if (isTrunk) lastTrunkMatrices = matrices
      }

      instanced.count = placed
      instanced.instanceMatrix.needsUpdate = true
      this._meshes.push(instanced)
    }
  }

  getMeshes() { return this._meshes }

  /** Update wind time for grass/fern shader materials */
  updateWind(elapsed) {
    for (const mat of this._windMaterials) {
      mat.uniforms.uTime.value = elapsed
    }
  }

  dispose() {
    for (const m of this._meshes) {
      m.geometry.dispose()
      m.material.dispose()
    }
  }
}

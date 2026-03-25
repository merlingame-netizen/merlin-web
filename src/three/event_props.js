// M.E.R.L.I.N. — Event Context Props
// Maps card tags/text to 3D props spawned at encounter locations
// Fork, bridge, merchant, sacred circle, ancient tree, mystic glow

import * as THREE from 'three'

// ── Event type detection from card content ──
export function getEventType(card) {
  const text = ((card.text || '') + ' ' + (card.title || '')).toLowerCase()
  const tags = card.tags || []

  if (text.match(/chemin|crois[eé]e|sentier|bifurc|direction|embranchement/) || tags.includes('exploration'))
    return 'fork'
  if (text.match(/pont|gouffre|pr[eé]cipice|enjamb|ravin/) || (tags.includes('danger') && text.match(/travers/)))
    return 'bridge'
  if (text.match(/marchand|barde|ermite|vendeur|[eé]tal|commerce/) || tags.includes('npc'))
    return 'merchant'
  if (text.match(/autel|rituel|cercle.*pierre|sacr[eé]|nemeton|m[eé]galith/) || tags.includes('sacred'))
    return 'sacred'
  if (text.match(/arbre.*ancien|ch[eê]ne|if.*centenaire|source|fontaine/) || tags.includes('nature'))
    return 'ancient_tree'
  if (tags.includes('creature') || tags.includes('danger'))
    return 'creature'
  return 'glow'
}

// ── Prop builders ──

function _buildFork(pos, heightFn) {
  const g = new THREE.Group()
  const pathMat = new THREE.MeshLambertMaterial({ color: 0x8a6a28, flatShading: true })
  // Left path
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.8), pathMat)
    p.position.set(-1.5 - i * 0.5, 0.02, -i * 1.2)
    p.rotation.y = 0.3
    g.add(p)
  }
  // Right path
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.8), pathMat)
    p.position.set(1.5 + i * 0.5, 0.02, -i * 1.2)
    p.rotation.y = -0.3
    g.add(p)
  }
  // Signpost
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4), new THREE.MeshLambertMaterial({ color: 0x6a5030, flatShading: true }))
  post.position.y = 0.75
  g.add(post)
  const sign1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.04), new THREE.MeshLambertMaterial({ color: 0x8a7040, flatShading: true }))
  sign1.position.set(-0.2, 1.3, 0); sign1.rotation.z = 0.15; g.add(sign1)
  const sign2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.04), new THREE.MeshLambertMaterial({ color: 0x8a7040, flatShading: true }))
  sign2.position.set(0.2, 1.1, 0); sign2.rotation.z = -0.15; g.add(sign2)

  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z) + 0.01
  return g
}

function _buildBridge(pos, heightFn) {
  const g = new THREE.Group()
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a30, flatShading: true })
  const ropeMat = new THREE.MeshLambertMaterial({ color: 0x554422, flatShading: true })
  // Planks
  for (let i = 0; i < 8; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.25), plankMat)
    plank.position.set(0, 0, -i * 0.35)
    plank.rotation.z = (Math.random() - 0.5) * 0.05
    g.add(plank)
  }
  // Ropes
  for (const x of [-0.75, 0.75]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.2, 3), ropeMat)
    rope.position.set(x, 0.4, -1.2); rope.rotation.x = Math.PI / 2
    g.add(rope)
    // Posts
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), ropeMat)
    p.position.set(x, 0.35, 0.2); g.add(p)
    const p2 = p.clone(); p2.position.z = -2.8; g.add(p2)
  }
  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z) - 0.3
  return g
}

function _buildMerchant(pos, heightFn) {
  const g = new THREE.Group()
  // Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.7), new THREE.MeshLambertMaterial({ color: 0x7a5a30, flatShading: true }))
  table.position.y = 0.7; g.add(table)
  // Legs
  for (const [x, z] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x5a4020, flatShading: true }))
    leg.position.set(x, 0.35, z); g.add(leg)
  }
  // Cloth
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), new THREE.MeshLambertMaterial({ color: 0x883355, flatShading: true, side: THREE.DoubleSide }))
  cloth.position.set(0, 0.76, 0); cloth.rotation.x = -Math.PI / 2; g.add(cloth)
  // Wares (small colored boxes)
  for (let i = 0; i < 4; i++) {
    const ware = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: [0xcc8844, 0x44aa66, 0x8866cc, 0xccaa33][i], flatShading: true }))
    ware.position.set(-0.4 + i * 0.28, 0.82, (Math.random() - 0.5) * 0.3); g.add(ware)
  }
  // Lantern
  const lantern = new THREE.PointLight(0xffaa44, 0.6, 4)
  lantern.position.set(0, 1.3, 0); g.add(lantern)

  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z)
  return g
}

function _buildSacredCircle(pos, heightFn) {
  const g = new THREE.Group()
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x667766, flatShading: true })
  const count = 7
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const r = 2.5
    const h = 0.8 + Math.random() * 1.2
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.25 + Math.random() * 0.1, h, 0.18), stoneMat)
    stone.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r)
    stone.rotation.z = (Math.random() - 0.5) * 0.06
    g.add(stone)
  }
  // Center glow
  const glow = new THREE.PointLight(0x88aaff, 0.8, 5)
  glow.position.y = 0.5; g.add(glow)

  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z)
  return g
}

function _buildAncientTree(pos, heightFn) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 6), new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true }))
  trunk.position.y = 2; g.add(trunk)
  for (let i = 0; i < 5; i++) {
    const r = 0.8 + Math.random() * 0.5
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color: new THREE.Color(0.1 + Math.random() * 0.2, 0.3 + Math.random() * 0.3, 0.05), flatShading: true }))
    canopy.position.set((Math.random() - 0.5) * 0.8, 3.5 + i * 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.8)
    g.add(canopy)
  }
  // Glow
  const light = new THREE.PointLight(0x55ff88, 0.5, 6)
  light.position.y = 2; g.add(light)

  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z)
  return g
}

function _buildGlow(pos, heightFn) {
  const g = new THREE.Group()
  const light = new THREE.PointLight(0xffcc66, 0.8, 5)
  light.position.y = 1.2; g.add(light)
  // Small orb
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.6 }))
  orb.position.y = 1.2; g.add(orb)

  g.position.copy(pos); g.position.y = heightFn(pos.x, pos.z)
  return g
}

// ── Public API ──

const BUILDERS = {
  fork: _buildFork,
  bridge: _buildBridge,
  merchant: _buildMerchant,
  sacred: _buildSacredCircle,
  ancient_tree: _buildAncientTree,
  creature: _buildGlow, // creature uses EncounterSpawner separately
  glow: _buildGlow,
}

export function spawnEventProps(card, position, scene, heightFn) {
  const type = getEventType(card)
  const builder = BUILDERS[type] || BUILDERS.glow
  const group = builder(position, heightFn)

  // Emerge animation: scale from 0
  group.scale.set(0.01, 0.01, 0.01)
  scene.add(group)

  const start = performance.now()
  const animIn = () => {
    const t = Math.min((performance.now() - start) / 800, 1)
    const ease = 1 - Math.pow(1 - t, 3) // easeOutCubic
    group.scale.setScalar(ease)
    if (t < 1) requestAnimationFrame(animIn)
  }
  requestAnimationFrame(animIn)

  return { group, type }
}

export function dismissEventProps(props, scene) {
  if (!props?.group) return Promise.resolve()
  return new Promise(resolve => {
    const start = performance.now()
    const animOut = () => {
      const t = Math.min((performance.now() - start) / 500, 1)
      props.group.scale.setScalar(1 - t)
      if (t < 1) {
        requestAnimationFrame(animOut)
      } else {
        scene.remove(props.group)
        props.group.traverse(c => {
          if (c.geometry) c.geometry.dispose()
          if (c.material) c.material.dispose()
        })
        resolve()
      }
    }
    requestAnimationFrame(animOut)
  })
}

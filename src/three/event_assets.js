// M.E.R.L.I.N. — Event Asset Catalogue
// Procedural 3D assets matched to card text keywords
import * as THREE from 'three'

// ── Keyword matching rules ──
const RULES = [
  { re: /ruisseau|rivi[eè]re|cours.*eau|torrent/, type: 'stream' },
  { re: /pont|passerelle|gouffre|ravin|pr[eé]cipice/, type: 'bridge' },
  { re: /marchand|barde|ermite|vendeur|[eé]tal/, type: 'merchant' },
  { re: /autel|rituel|cercle.*pierre|nemeton|sacr[eé]/, type: 'stone_circle' },
  { re: /feu|camp|foyer|flamme|braise/, type: 'campfire' },
  { re: /ch[eê]ne|if.*centenaire|arbre.*ancien|grand.*arbre/, type: 'ancient_tree' },
  { re: /grotte|caverne|antre|souterrain/, type: 'cave' },
  { re: /tombe|cairn|ossement|s[eé]pulture|mort/, type: 'cairn' },
  { re: /fontaine|source|bassin/, type: 'fountain' },
  { re: /loup|cerf|biche|sanglier|animal|renard/, type: 'animal' },
  { re: /korrigan|f[eé]e|lutin|esprit|fant[oô]me|feu.*follet/, type: 'fairy' },
  { re: /menhir|pierre.*dress[eé]e/, type: 'menhir' },
  { re: /dolmen/, type: 'dolmen' },
  { re: /brume|brouillard|vapeur|voile/, type: 'mist' },
  { re: /fleur|plante|jardin|buisson|gui/, type: 'flower_bush' },
  { re: /chemin|crois[eé]e|sentier|bifurc|embranchement/, type: 'fork' },
  { re: /barque|bateau|embarcation/, type: 'boat' },
  { re: /champignon|toxique|v[eé]n[eé]neux/, type: 'mushrooms' },
  { re: /[eé]p[eé]e|combat|duel|guerrier|lame/, type: 'weapons' },
  { re: /tour|ruine|rempart|donjon/, type: 'ruins' },
  { re: /corbeau|hibou|oiseau|aigle/, type: 'bird' },
  { re: /masque|statue|totem/, type: 'totem' },
]

export function matchAsset(card) {
  const txt = ((card?.text || '') + ' ' + (card?.title || '')).toLowerCase()
  for (const r of RULES) { if (r.re.test(txt)) return r.type }
  const tags = card?.tags || []
  if (tags.some(t => /sacred|ritual/.test(t))) return 'stone_circle'
  if (tags.some(t => /creature|beast/.test(t))) return 'animal'
  if (tags.some(t => /danger|combat/.test(t))) return 'weapons'
  if (tags.some(t => /nature|forest/.test(t))) return 'ancient_tree'
  if (tags.some(t => /npc|merchant/.test(t))) return 'merchant'
  return 'glow'
}

// ── Asset builders ──

function _stream(pos, hFn) {
  const g = new THREE.Group()
  const waterGeo = new THREE.PlaneGeometry(8, 1.5, 12, 2)
  waterGeo.rotateX(-Math.PI / 2)
  const p = waterGeo.attributes.position
  for (let i = 0; i < p.count; i++) {
    p.array[i * 3 + 1] = Math.sin(p.array[i * 3] * 0.8) * 0.05
  }
  waterGeo.computeVertexNormals()
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({
    color: 0x3388aa, transparent: true, opacity: 0.6, roughness: 0.2, metalness: 0.3, flatShading: true
  }))
  water.position.y = 0.02
  g.add(water)
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1, 0),
      new THREE.MeshLambertMaterial({ color: 0x556655, flatShading: true })
    )
    r.position.set(-3 + i * 0.9, 0.08, (i % 2 === 0 ? 0.8 : -0.8) + (Math.random() - 0.5) * 0.2)
    g.add(r)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z) - 0.15
  return g
}

function _bridge(pos, hFn) {
  const g = new THREE.Group()
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a30, flatShading: true })
  for (let i = 0; i < 10; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.22), plankMat)
    plank.position.set(0, 0, -i * 0.3)
    plank.rotation.z = (Math.random() - 0.5) * 0.03
    g.add(plank)
  }
  const ropeMat = new THREE.MeshLambertMaterial({ color: 0x554422, flatShading: true })
  for (const x of [-0.9, 0.9]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.5, 3), ropeMat)
    rope.position.set(x, 0.4, -1.3)
    rope.rotation.x = Math.PI / 2
    g.add(rope)
    for (const z of [0.2, -2.8]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 4), ropeMat)
      pillar.position.set(x, 0.4, z)
      g.add(pillar)
    }
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z) - 0.2
  return g
}

function _merchant(pos, hFn) {
  const g = new THREE.Group()
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x7a5a30, flatShading: true })
  )
  table.position.y = 0.65
  g.add(table)
  for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.65, 4),
      new THREE.MeshLambertMaterial({ color: 0x5a4020, flatShading: true })
    )
    leg.position.set(x, 0.325, z)
    g.add(leg)
  }
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x883355, flatShading: true, side: THREE.DoubleSide })
  )
  cloth.position.set(0, 0.72, 0)
  cloth.rotation.x = -Math.PI / 2
  g.add(cloth)
  const wareColors = [0xcc8844, 0x44aa66, 0x8866cc, 0xccaa33, 0xaa4444]
  for (let i = 0; i < 5; i++) {
    const ware = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 + Math.random() * 0.06, 0.08 + Math.random() * 0.06, 0.08),
      new THREE.MeshLambertMaterial({ color: wareColors[i], flatShading: true })
    )
    ware.position.set(-0.5 + i * 0.25, 0.76, (Math.random() - 0.5) * 0.3)
    g.add(ware)
  }
  const light = new THREE.PointLight(0xffaa44, 0.5, 4)
  light.position.y = 1.2
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _stoneCircle(pos, hFn) {
  const g = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0x667766, flatShading: true })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const h = 0.8 + Math.random() * 1.5
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.22 + Math.random() * 0.1, h, 0.16), mat)
    stone.position.set(Math.cos(a) * 2.8, h / 2, Math.sin(a) * 2.8)
    stone.rotation.z = (Math.random() - 0.5) * 0.06
    g.add(stone)
  }
  const light = new THREE.PointLight(0x7799ff, 0.7, 5)
  light.position.y = 0.5
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _campfire(pos, hFn) {
  const g = new THREE.Group()
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true })
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5), logMat)
    log.position.set(Math.cos(i * 1.5) * 0.15, 0.08, Math.sin(i * 1.5) * 0.15)
    log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3
    log.rotation.y = i * 0.8
    g.add(log)
  }
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x555555, flatShading: true })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), stoneMat)
    s.position.set(Math.cos(a) * 0.35, 0.04, Math.sin(a) * 0.35)
    g.add(s)
  }
  const light = new THREE.PointLight(0xff6622, 1.0, 5)
  light.position.y = 0.4
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _ancientTree(pos, hFn) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 5, 7),
    new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true })
  )
  trunk.position.y = 2.5
  g.add(trunk)
  for (let i = 0; i < 6; i++) {
    const r = 1.0 + Math.random() * 0.6
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.08 + Math.random() * 0.15, 0.25 + Math.random() * 0.25, 0.04),
        flatShading: true
      })
    )
    canopy.position.set(
      (Math.random() - 0.5) * 1.0,
      4.0 + i * 0.5 + Math.random() * 0.4,
      (Math.random() - 0.5) * 1.0
    )
    g.add(canopy)
  }
  const light = new THREE.PointLight(0x55ff88, 0.4, 6)
  light.position.y = 2
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _cave(pos, hFn) {
  const g = new THREE.Group()
  const entrance = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 6, 4, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a, flatShading: true, side: THREE.DoubleSide })
  )
  entrance.rotation.x = Math.PI / 2
  entrance.position.y = 0.8
  g.add(entrance)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2, 0),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a, flatShading: true })
    )
    rock.position.set(Math.cos(a) * 1.6, 0.2, Math.sin(a) * 0.5 - 0.5)
    g.add(rock)
  }
  const light = new THREE.PointLight(0xff8844, 0.3, 4)
  light.position.set(0, 0.6, -0.5)
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _cairn(pos, hFn) {
  const g = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0x777766, flatShading: true })
  for (let i = 0; i < 8; i++) {
    const w = 0.5 - i * 0.04
    const h = 0.08
    const stone = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), mat)
    stone.position.set(
      (Math.random() - 0.5) * 0.05,
      i * h + h / 2,
      (Math.random() - 0.5) * 0.05
    )
    stone.rotation.y = Math.random() * 0.3
    g.add(stone)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _fountain(pos, hFn) {
  const g = new THREE.Group()
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 0.3, 8),
    new THREE.MeshLambertMaterial({ color: 0x667766, flatShading: true })
  )
  basin.position.y = 0.15
  g.add(basin)
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5, roughness: 0.1 })
  )
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.28
  g.add(water)
  const light = new THREE.PointLight(0x88ccff, 0.4, 3)
  light.position.y = 0.5
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _animal(pos, hFn) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.6, 3, 5),
    new THREE.MeshLambertMaterial({ color: 0x6a5a4a, flatShading: true })
  )
  body.position.y = 0.5
  body.rotation.z = Math.PI / 2
  g.add(body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 4, 3),
    new THREE.MeshLambertMaterial({ color: 0x7a6a5a, flatShading: true })
  )
  head.position.set(0.5, 0.55, 0)
  g.add(head)
  for (const [x, z] of [[0.2, 0.1], [0.2, -0.1], [-0.2, 0.1], [-0.2, -0.1]]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 3),
      new THREE.MeshLambertMaterial({ color: 0x5a4a3a, flatShading: true })
    )
    leg.position.set(x, 0.175, z)
    g.add(leg)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _fairy(pos, hFn) {
  const g = new THREE.Group()
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xaaffcc })
  )
  orb.position.y = 1.0
  g.add(orb)
  for (const s of [-1, 1]) {
    const wingGeo = new THREE.BufferGeometry()
    const verts = new Float32Array([0, 1.0, 0, s * 0.3, 1.2, -0.1, s * 0.15, 0.8, 0.1])
    wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    wingGeo.computeVertexNormals()
    const wing = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial({
      color: 0xccffee, transparent: true, opacity: 0.4, side: THREE.DoubleSide
    }))
    g.add(wing)
  }
  const light = new THREE.PointLight(0x88ffaa, 0.6, 4)
  light.position.y = 1.0
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _menhir(pos, hFn) {
  const h = 2.0 + Math.random() * 1.5
  const g = new THREE.Group()
  const stone = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, h, 0.25),
    new THREE.MeshLambertMaterial({ color: 0x667766, flatShading: true })
  )
  stone.position.y = h / 2
  stone.rotation.z = (Math.random() - 0.5) * 0.05
  g.add(stone)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _dolmen(pos, hFn) {
  const g = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0x667766, flatShading: true })
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.25), mat)
    pillar.position.set(Math.cos(a) * 0.8, 0.75, Math.sin(a) * 0.8)
    g.add(pillar)
  }
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.8), mat)
  cap.position.y = 1.55
  cap.rotation.y = 0.2
  g.add(cap)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _mist(pos, hFn) {
  const g = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5 + Math.random() * 3, 1.5),
      new THREE.MeshBasicMaterial({
        color: 0xcccccc, transparent: true, opacity: 0.08 + i * 0.02,
        side: THREE.DoubleSide, depthWrite: false
      })
    )
    plane.position.set((Math.random() - 0.5) * 2, 0.3 + i * 0.5, (Math.random() - 0.5) * 2)
    plane.rotation.y = Math.random() * Math.PI
    g.add(plane)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _flowerBush(pos, hFn) {
  const g = new THREE.Group()
  const bush = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.4, 1),
    new THREE.MeshLambertMaterial({ color: 0x3a7a2a, flatShading: true })
  )
  bush.position.y = 0.35
  g.add(bush)
  const flowerColors = [0xff6688, 0xffaa44, 0xaa66ff, 0xff4466, 0xffcc33]
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.25 + Math.random() * 0.15
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 3),
      new THREE.MeshLambertMaterial({ color: flowerColors[i % 5], flatShading: true })
    )
    flower.position.set(Math.cos(a) * r, 0.3 + Math.random() * 0.2, Math.sin(a) * r)
    g.add(flower)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _fork(pos, hFn) {
  const g = new THREE.Group()
  const pathMat = new THREE.MeshLambertMaterial({ color: 0x8a6a28, flatShading: true })
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.7), pathMat)
      seg.position.set(side * (1.2 + i * 0.4), 0.02, -i * 1.0)
      seg.rotation.y = side * 0.25
      g.add(seg)
    }
  }
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.4, 4),
    new THREE.MeshLambertMaterial({ color: 0x6a5030, flatShading: true })
  )
  post.position.y = 0.7
  g.add(post)
  const signMat = new THREE.MeshLambertMaterial({ color: 0x8a7040, flatShading: true })
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), signMat)
  s1.position.set(-0.15, 1.25, 0)
  s1.rotation.z = 0.12
  g.add(s1)
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), signMat)
  s2.position.set(0.15, 1.05, 0)
  s2.rotation.z = -0.12
  g.add(s2)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _boat(pos, hFn) {
  const g = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.25, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x6a5030, flatShading: true })
  )
  hull.position.y = 0.1
  g.add(hull)
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.04, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x7a6040, flatShading: true })
  )
  seat.position.y = 0.25
  g.add(seat)
  const oar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 1.0, 3),
    new THREE.MeshLambertMaterial({ color: 0x5a4020, flatShading: true })
  )
  oar.position.set(0.3, 0.2, 0)
  oar.rotation.z = 0.4
  g.add(oar)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z) - 0.05
  return g
}

function _mushrooms(pos, hFn) {
  const g = new THREE.Group()
  const colors = [0xcc4444, 0xcc8844, 0xaa66aa, 0xcccc44, 0xcc6644]
  for (let i = 0; i < 5; i++) {
    const stemH = 0.2 + Math.random() * 0.3
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, stemH, 5),
      new THREE.MeshLambertMaterial({ color: 0xddddcc, flatShading: true })
    )
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: colors[i % 5], flatShading: true })
    )
    const xp = (Math.random() - 0.5) * 0.6
    const zp = (Math.random() - 0.5) * 0.6
    stem.position.set(xp, stemH / 2, zp)
    cap.position.set(xp, stemH + 0.02, zp)
    g.add(stem)
    g.add(cap)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _weapons(pos, hFn) {
  const g = new THREE.Group()
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x8899aa, flatShading: true })
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true })
  for (let i = 0; i < 2; i++) {
    const xOff = i * 0.4 - 0.2
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.01), bladeMat)
    blade.position.set(xOff, 0.5, 0)
    blade.rotation.z = i === 0 ? 0.1 : -0.15
    g.add(blade)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), handleMat)
    handle.position.set(xOff, 0.08, 0)
    g.add(handle)
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), handleMat)
    guard.position.set(xOff, 0.18, 0)
    g.add(guard)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _ruins(pos, hFn) {
  const g = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({ color: 0x6a6a60, flatShading: true })
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.2, 2.5, 7, 1, true, 0, Math.PI * 1.5),
    mat
  )
  tower.position.y = 1.25
  g.add(tower)
  for (let i = 0; i < 6; i++) {
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 + Math.random() * 0.3, 0.2, 0.2 + Math.random() * 0.2),
      mat
    )
    stone.position.set(1.5 + Math.random(), 0.1, (Math.random() - 0.5) * 2)
    stone.rotation.set(Math.random(), Math.random(), Math.random())
    g.add(stone)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _bird(pos, hFn) {
  const g = new THREE.Group()
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a, flatShading: true })
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), bodyMat)
  body.position.y = 2.0
  body.rotation.z = Math.PI / 2
  g.add(body)
  for (const s of [-1, 1]) {
    const wingGeo = new THREE.BufferGeometry()
    const verts = new Float32Array([
      0, 2.0, 0,
      s * 0.5, 2.1, -0.1,
      s * 0.2, 1.95, 0.15
    ])
    wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    wingGeo.computeVertexNormals()
    const wing = new THREE.Mesh(wingGeo, new THREE.MeshLambertMaterial({
      color: 0x3a3a3a, flatShading: true, side: THREE.DoubleSide
    }))
    g.add(wing)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _totem(pos, hFn) {
  const g = new THREE.Group()
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.0, 6), poleMat)
  pole.position.y = 1.5
  g.add(pole)
  const faceColors = [0xcc4444, 0x44aa66, 0x4466cc]
  for (let i = 0; i < 3; i++) {
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.3),
      new THREE.MeshLambertMaterial({ color: faceColors[i], flatShading: true })
    )
    face.position.y = 0.8 + i * 0.8
    g.add(face)
  }
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

function _glow(pos, hFn) {
  const g = new THREE.Group()
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.6 })
  )
  orb.position.y = 1.0
  g.add(orb)
  const light = new THREE.PointLight(0xffcc66, 0.7, 4)
  light.position.y = 1.0
  g.add(light)
  g.position.copy(pos)
  g.position.y = hFn(pos.x, pos.z)
  return g
}

// ── NEW ASSETS (Phase 6) ──

function _well(pos, hFn) {
  const g = new THREE.Group()
  // Stone circle base
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x6a6a60 }))
    stone.position.set(Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4)
    stone.rotation.y = a; g.add(stone)
  }
  // Water surface
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), new THREE.MeshStandardMaterial({ color: 0x2244aa, transparent: true, opacity: 0.5 }))
  water.rotation.x = -Math.PI / 2; water.position.y = 0.15; g.add(water)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _altar(pos, hFn) {
  const g = new THREE.Group()
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x888880 }))
  slab.position.y = 0.7; g.add(slab)
  // Legs
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 5), new THREE.MeshStandardMaterial({ color: 0x777770 }))
    leg.position.set(x, 0.35, z); g.add(leg)
  }
  // Offering bowl
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x664422 }))
  bowl.position.set(0, 0.85, 0); g.add(bowl)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _rune_stone(pos, hFn) {
  const g = new THREE.Group()
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x7a7a70 }))
  stone.position.y = 0.6; g.add(stone)
  // Glowing rune line
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.4 }))
  glow.position.set(0, 0.8, 0.08); g.add(glow)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _torch(pos, hFn) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a30 }))
  pole.position.y = 0.75; g.add(pole)
  // Flame
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), new THREE.MeshBasicMaterial({ color: 0xff8833 }))
  flame.position.y = 1.6; g.add(flame)
  const light = new THREE.PointLight(0xff8833, 0.8, 6)
  light.position.y = 1.6; g.add(light)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _sacred_tree(pos, hFn) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 7), new THREE.MeshStandardMaterial({ color: 0x5a4a30 }))
  trunk.position.y = 1.5; g.add(trunk)
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), new THREE.MeshStandardMaterial({ color: 0x2a6a2a }))
  canopy.position.y = 3.5; g.add(canopy)
  // Glowing moss
  const moss = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 3), new THREE.MeshBasicMaterial({ color: 0x44cc66, transparent: true, opacity: 0.3 }))
  moss.position.set(0.2, 0.8, 0.2); g.add(moss)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _wolf(pos, hFn) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: 0x555555 }))
  body.position.y = 0.5; g.add(body)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x555555 }))
  head.position.set(0.45, 0.65, 0); g.add(head)
  // Eyes
  for (const z of [-0.08, 0.08]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffaa00 }))
    eye.position.set(0.58, 0.7, z); g.add(eye)
  }
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _deer(pos, hFn) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x8a6a40 }))
  body.position.y = 0.7; g.add(body)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x8a6a40 }))
  head.position.set(0.4, 0.95, 0); g.add(head)
  // Antlers
  for (const z of [-0.1, 0.1]) {
    const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.4, 3), new THREE.MeshStandardMaterial({ color: 0x6a5a30 }))
    antler.position.set(0.4, 1.2, z); antler.rotation.z = z > 0 ? -0.4 : 0.4; g.add(antler)
  }
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _portal(pos, hFn) {
  const g = new THREE.Group()
  // Stone arch
  for (const x of [-0.5, 0.5]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0x6a6a60 }))
    pillar.position.set(x, 1, 0); g.add(pillar)
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x6a6a60 }))
  lintel.position.y = 2; g.add(lintel)
  // Portal glow
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.8), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide }))
  glow.position.y = 1; g.add(glow)
  const light = new THREE.PointLight(0x4488ff, 0.5, 5)
  light.position.y = 1; g.add(light)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _waterfall(pos, hFn) {
  const g = new THREE.Group()
  // Rock wall
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a5a50 }))
  wall.position.y = 1.25; g.add(wall)
  // Water stream (vertical plane)
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2), new THREE.MeshBasicMaterial({ color: 0x5588cc, transparent: true, opacity: 0.4 }))
  stream.position.set(0, 1.2, 0.26); g.add(stream)
  // Pool
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.8, 8), new THREE.MeshBasicMaterial({ color: 0x3366aa, transparent: true, opacity: 0.3 }))
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.05, 0.5); g.add(pool)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _cauldron(pos, hFn) {
  const g = new THREE.Group()
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0x333333 }))
  pot.position.y = 0.3; g.add(pot)
  // Green liquid
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.22, 6), new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.5 }))
  liquid.rotation.x = -Math.PI / 2; liquid.position.y = 0.45; g.add(liquid)
  // Steam glow
  const steam = new THREE.PointLight(0x44cc44, 0.3, 3)
  steam.position.y = 0.6; g.add(steam)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _lantern(pos, hFn) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x444444 }))
  pole.position.y = 0.9; g.add(pole)
  // Lantern box
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.6 }))
  box.position.y = 1.8; g.add(box)
  const light = new THREE.PointLight(0xffcc44, 0.6, 5)
  light.position.y = 1.8; g.add(light)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _grave(pos, hFn) {
  const g = new THREE.Group()
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x5a5a55 }))
  stone.position.y = 0.3; stone.rotation.x = -0.1; g.add(stone)
  // Cross
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), new THREE.MeshStandardMaterial({ color: 0x888880 }))
  cross.position.y = 0.65; g.add(cross)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _wagon(pos, hFn) {
  const g = new THREE.Group()
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x6a5a30 }))
  bed.position.y = 0.4; g.add(bed)
  // Wheels
  for (const [x, z] of [[-0.45, -0.35], [-0.45, 0.35], [0.45, -0.35], [0.45, 0.35]]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }))
    wheel.position.set(x, 0.15, z); wheel.rotation.y = Math.PI / 2; g.add(wheel)
  }
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _spirit(pos, hFn) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.25 }))
  body.position.y = 0.8; g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.3 }))
  head.position.y = 1.5; g.add(head)
  const light = new THREE.PointLight(0x88aaff, 0.4, 4)
  light.position.y = 1; g.add(light)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

function _throne(pos, hFn) {
  const g = new THREE.Group()
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a4a30 }))
  seat.position.y = 0.5; g.add(seat)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x5a4a30 }))
  back.position.set(0, 0.9, -0.21); g.add(back)
  g.position.copy(pos); g.position.y = hFn(pos.x, pos.z); return g
}

// ── Builder registry ──

const BUILDERS = {
  stream: _stream,
  bridge: _bridge,
  merchant: _merchant,
  stone_circle: _stoneCircle,
  campfire: _campfire,
  ancient_tree: _ancientTree,
  cave: _cave,
  cairn: _cairn,
  fountain: _fountain,
  animal: _animal,
  fairy: _fairy,
  menhir: _menhir,
  dolmen: _dolmen,
  mist: _mist,
  flower_bush: _flowerBush,
  fork: _fork,
  boat: _boat,
  mushrooms: _mushrooms,
  weapons: _weapons,
  ruins: _ruins,
  bird: _bird,
  totem: _totem,
  glow: _glow,
  // Phase 6 new assets
  well: _well,
  altar: _altar,
  rune_stone: _rune_stone,
  torch: _torch,
  sacred_tree: _sacred_tree,
  wolf: _wolf,
  deer: _deer,
  portal: _portal,
  waterfall: _waterfall,
  cauldron: _cauldron,
  lantern: _lantern,
  grave: _grave,
  wagon: _wagon,
  spirit: _spirit,
  throne: _throne,
}

export function spawnEventAsset(card, position, scene, heightFn) {
  const type = matchAsset(card)
  const builder = BUILDERS[type] || BUILDERS.glow
  const group = builder(position, heightFn)
  group.scale.set(0.01, 0.01, 0.01)
  scene.add(group)
  // Scale-up animation
  const start = performance.now()
  const animIn = () => {
    const t = Math.min((performance.now() - start) / 800, 1)
    group.scale.setScalar(1 - Math.pow(1 - t, 3))
    if (t < 1) requestAnimationFrame(animIn)
  }
  requestAnimationFrame(animIn)
  return { group, type }
}

export function dismissEventAsset(asset, scene) {
  if (!asset?.group) return Promise.resolve()
  return new Promise(resolve => {
    const start = performance.now()
    const out = () => {
      const t = Math.min((performance.now() - start) / 500, 1)
      asset.group.scale.setScalar(1 - t)
      if (t < 1) requestAnimationFrame(out)
      else { scene.remove(asset.group); resolve() }
    }
    requestAnimationFrame(out)
  })
}

// M.E.R.L.I.N. — Interactive World Objects
// Spawns collectible/interactive objects along the path
// Types: mushroom (+heal), crystal (+faction), chest (minigame), rune (bonus card)

import * as THREE from 'three'

const TYPES = {
  mushroom: { color: 0x55ff88, emissive: 0x33aa55, scale: 0.12, yOff: 0.08, label: 'heal' },
  crystal:  { color: 0x88ccff, emissive: 0x4488cc, scale: 0.10, yOff: 0.12, label: 'faction' },
  chest:    { color: 0xffaa33, emissive: 0xcc8822, scale: 0.15, yOff: 0.10, label: 'minigame' },
  rune:     { color: 0xcc88ff, emissive: 0x8855aa, scale: 0.08, yOff: 0.03, label: 'card' },
}

const GEOMETRIES = {}
function _getGeo(type) {
  if (!GEOMETRIES[type]) {
    switch (type) {
      case 'mushroom':
        GEOMETRIES[type] = new THREE.SphereGeometry(1, 6, 4)
        break
      case 'crystal':
        GEOMETRIES[type] = new THREE.OctahedronGeometry(1, 0)
        break
      case 'chest':
        GEOMETRIES[type] = new THREE.BoxGeometry(1.2, 0.8, 0.8)
        break
      case 'rune':
        GEOMETRIES[type] = new THREE.RingGeometry(0.6, 1, 6)
        break
    }
  }
  return GEOMETRIES[type]
}

export class WorldInteractables {
  constructor(scene, heightFn) {
    this._scene = scene
    this._heightFn = heightFn
    this._objects = [] // { mesh, light, type, collected, baseY, phase }
    this._raycaster = new THREE.Raycaster()
    this._pointer = new THREE.Vector2()
    this._onInteract = null // callback(type, position)
  }

  /**
   * Set callback for when an object is interacted with
   * @param {Function} fn - (type: string, position: THREE.Vector3) => void
   */
  setOnInteract(fn) {
    this._onInteract = fn
  }

  /**
   * Spawn objects along a path curve
   * @param {THREE.CatmullRomCurve3} pathCurve
   * @param {number} count - total objects to spawn
   */
  spawnAlongPath(pathCurve, count = 40) {
    this.clear()

    const points = pathCurve.getSpacedPoints(count * 3)
    const typeKeys = Object.keys(TYPES)
    // Distribution: 40% mushroom, 25% crystal, 20% chest, 15% rune
    const weights = [0.4, 0.65, 0.85, 1.0]

    let spawned = 0
    for (let i = 2; i < points.length - 2 && spawned < count; i += 3) {
      if (Math.random() > 0.7) continue // skip some for organic feel

      const p = points[i]
      const side = (Math.random() > 0.5 ? 1 : -1)
      const offset = 1.2 + Math.random() * 2.5
      const x = p.x + side * offset
      const z = p.z + (Math.random() - 0.5) * 2
      const y = this._heightFn(x, z)

      // Pick type by weighted random
      const r = Math.random()
      let typeIdx = 0
      for (let w = 0; w < weights.length; w++) {
        if (r <= weights[w]) { typeIdx = w; break }
      }
      const typeKey = typeKeys[typeIdx]
      const conf = TYPES[typeKey]

      // Create mesh
      const geo = _getGeo(typeKey)
      const mat = new THREE.MeshStandardMaterial({
        color: conf.color,
        emissive: conf.emissive,
        emissiveIntensity: 0.3,
        flatShading: true,
        roughness: 0.6,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.setScalar(conf.scale)
      mesh.position.set(x, y + conf.yOff, z)
      if (typeKey === 'rune') mesh.rotation.x = -Math.PI / 2 // flat on ground

      // Glow light
      const light = new THREE.PointLight(conf.color, 0.4, 3)
      light.position.copy(mesh.position)
      light.position.y += 0.15

      this._scene.add(mesh)
      this._scene.add(light)

      this._objects.push({
        mesh,
        light,
        type: typeKey,
        collected: false,
        baseY: mesh.position.y,
        phase: Math.random() * Math.PI * 2,
      })

      spawned++
    }
  }

  /**
   * Handle pointer/tap interaction
   */
  handlePointer(event, camera, canvasRect) {
    this._pointer.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1
    this._pointer.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1

    this._raycaster.setFromCamera(this._pointer, camera)

    const meshes = this._objects
      .filter(o => !o.collected)
      .map(o => o.mesh)

    const hits = this._raycaster.intersectObjects(meshes)
    if (hits.length === 0) return false

    const hitMesh = hits[0].object
    const obj = this._objects.find(o => o.mesh === hitMesh)
    if (!obj || obj.collected) return false

    obj.collected = true

    // Animate out: float up + fade
    const startY = obj.mesh.position.y
    const startTime = performance.now()
    const animateOut = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const t = Math.min(elapsed / 0.6, 1)
      obj.mesh.position.y = startY + t * 0.8
      obj.mesh.material.opacity = 1 - t
      obj.mesh.material.transparent = true
      obj.light.intensity = 0.4 * (1 - t)
      if (t < 1) {
        requestAnimationFrame(animateOut)
      } else {
        this._scene.remove(obj.mesh)
        this._scene.remove(obj.light)
        obj.mesh.geometry.dispose()
        obj.mesh.material.dispose()
      }
    }
    requestAnimationFrame(animateOut)

    // Trigger callback
    if (this._onInteract) {
      this._onInteract(obj.type, hitMesh.position.clone())
    }

    return true
  }

  /**
   * Update animations (call each frame)
   */
  update(elapsed, cameraPosition) {
    for (const obj of this._objects) {
      if (obj.collected) continue

      // Bob animation
      obj.mesh.position.y = obj.baseY + Math.sin(elapsed * 2.5 + obj.phase) * 0.04

      // Pulse glow
      obj.light.intensity = 0.25 + Math.sin(elapsed * 3 + obj.phase) * 0.15

      // Rotate crystals and runes
      if (obj.type === 'crystal') obj.mesh.rotation.y += 0.01
      if (obj.type === 'rune') obj.mesh.rotation.z += 0.005

      // Brightness boost when camera is near
      if (cameraPosition) {
        const dist = obj.mesh.position.distanceTo(cameraPosition)
        if (dist < 6) {
          const proximity = 1 - (dist / 6)
          obj.light.intensity += proximity * 0.3
          obj.mesh.material.emissiveIntensity = 0.3 + proximity * 0.4
        } else {
          obj.mesh.material.emissiveIntensity = 0.3
        }
      }
    }
  }

  /**
   * Get nearby uncollected objects (for UI hints)
   */
  getNearby(position, radius = 5) {
    return this._objects
      .filter(o => !o.collected && o.mesh.position.distanceTo(position) < radius)
      .map(o => ({ type: o.type, position: o.mesh.position.clone() }))
  }

  /**
   * Cleanup all objects
   */
  clear() {
    for (const obj of this._objects) {
      this._scene.remove(obj.mesh)
      this._scene.remove(obj.light)
      if (!obj.collected) {
        obj.mesh.geometry?.dispose()
        obj.mesh.material?.dispose()
      }
    }
    this._objects = []
  }
}

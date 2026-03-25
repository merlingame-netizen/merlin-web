// M.E.R.L.I.N. — Encounter Spawner
// Spawns 3D entities in front of the player for card encounters

import * as THREE from 'three'
import { tween, tweenVec3 } from './tween_engine.js'

// Creature geometries by biome affinity
const CREATURE_TYPES = {
  korrigan:  { scale: 0.6, bodyColor: 0x4a6a3a, headColor: 0x6a8a5a },
  loup:      { scale: 1.2, bodyColor: 0x3a3a3a, headColor: 0x5a4a4a },
  corbeau:   { scale: 0.8, bodyColor: 0x1a1a2a, headColor: 0x2a2a3a },
  esprit:    { scale: 1.0, bodyColor: 0x88aacc, headColor: 0xaaccee, emissive: true },
  sirene:    { scale: 1.0, bodyColor: 0x3a6a8a, headColor: 0x5a8aaa },
  geant:     { scale: 2.5, bodyColor: 0x5a4a3a, headColor: 0x7a6a5a },
  tuatha:    { scale: 1.3, bodyColor: 0xaa8a40, headColor: 0xccaa60, emissive: true },
  generic:   { scale: 1.0, bodyColor: 0x6a5a4a, headColor: 0x8a7a6a },
}

const BIOME_CREATURES = {
  broceliande:    ['korrigan', 'loup', 'generic'],
  landes:         ['corbeau', 'esprit', 'generic'],
  cotes:          ['sirene', 'corbeau', 'generic'],
  monts:          ['esprit', 'corbeau', 'generic'],
  ile_sein:       ['esprit', 'generic'],
  huelgoat:       ['geant', 'korrigan', 'generic'],
  ecosse:         ['loup', 'esprit', 'generic'],
  iles_mystiques: ['tuatha', 'esprit', 'generic'],
}

export class EncounterSpawner {
  constructor(scene) {
    this._scene = scene
    this._group = null
  }

  async spawn(camera, biomeKey, focalPoint = null, creatureHint = null) {
    this.dismiss()

    // Pick creature type (hint from card text, or random from biome pool)
    const pool = BIOME_CREATURES[biomeKey] ?? BIOME_CREATURES.broceliande
    const creatureKey = (creatureHint && CREATURE_TYPES[creatureHint]) ? creatureHint : pool[Math.floor(Math.random() * pool.length)]
    const config = CREATURE_TYPES[creatureKey] ?? CREATURE_TYPES.generic

    // Spawn position: near focal point (diorama center) or 12 units in front of camera
    let spawnPos
    if (focalPoint) {
      // Offset slightly from focal point with random lateral shift
      const offsetX = (Math.random() - 0.5) * 4
      const offsetZ = (Math.random() - 0.5) * 4
      spawnPos = new THREE.Vector3(focalPoint.x + offsetX, focalPoint.y, focalPoint.z + offsetZ)
    } else {
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      spawnPos = camera.position.clone().addScaledVector(forward, 12)
    }

    // Build NPC group
    this._group = new THREE.Group()
    this._group.position.copy(spawnPos)

    // Body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 6)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    })
    if (config.emissive) {
      bodyMat.emissive = new THREE.Color(config.bodyColor)
      bodyMat.emissiveIntensity = 0.5
      bodyMat.transparent = true
      bodyMat.opacity = 0.7
    }
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.6 * config.scale
    this._group.add(body)

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.25, 8, 6)
    const headMat = new THREE.MeshStandardMaterial({
      color: config.headColor,
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
    })
    if (config.emissive) {
      headMat.emissive = new THREE.Color(config.headColor)
      headMat.emissiveIntensity = 0.5
      headMat.transparent = true
      headMat.opacity = 0.7
    }
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1.4 * config.scale
    this._group.add(head)

    // Scale
    this._group.scale.set(config.scale, 0.01, config.scale)
    this._group.lookAt(camera.position.x, spawnPos.y, camera.position.z)

    // Point light for atmosphere
    const glow = new THREE.PointLight(config.emissive ? 0x88aacc : 0xffbe33, 0.8, 8)
    glow.position.y = 1.5 * config.scale
    this._group.add(glow)

    this._scene.add(this._group)

    // Animate: emerge from ground (scale Y 0.01 -> scale)
    await tween(this._group.scale, 'y', 0.01, config.scale, 0.8, 'easeOutElastic')
  }

  async dismiss() {
    if (!this._group) return

    const group = this._group
    this._group = null

    // Fade out: scale Y -> 0
    await tween(group.scale, 'y', group.scale.y, 0.01, 0.5, 'easeInOut')

    // Remove from scene
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
    this._scene.remove(group)
  }

  getGroup() { return this._group }
}

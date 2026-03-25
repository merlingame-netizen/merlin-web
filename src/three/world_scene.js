// M.E.R.L.I.N. — World Scene
// Orchestrates terrain + sky + props + lighting + ambient + cottage + billboards + volumetrics
// Phase 2: Wind update for grass/fern
// Phase 3: Day/night cycle, stars, time-based lighting

import * as THREE from 'three'
import { TerrainGenerator } from './terrain_generator.js'
import { SkySystem } from './sky_system.js'
import { BiomeProps } from './biome_props.js'
import { LightingSystem } from './lighting_system.js'
import { AmbientEntities } from './ambient_entities.js'
import { BillboardSpriteSystem } from './billboard_sprites.js'
import { VolumetricEffects } from './volumetric_effects.js'

// ── Cottage Builder ────────────────────────────────────────────────────

function _buildCottage(heightFn) {
  const group = new THREE.Group()

  // Walls
  const wallGeo = new THREE.BoxGeometry(4, 3, 5)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9, flatShading: true })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.5
  group.add(walls)

  // Roof
  const roofGeo = new THREE.ConeGeometry(3.5, 2, 4)
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85, flatShading: true })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.0
  roof.rotation.y = Math.PI / 4
  group.add(roof)

  // Door
  const doorGeo = new THREE.BoxGeometry(1, 2, 0.15)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, flatShading: true })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 1.0, 2.55)
  group.add(door)

  // Chimney
  const chimGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5)
  const chimMat = new THREE.MeshStandardMaterial({ color: 0x6a6a60, roughness: 0.9, flatShading: true })
  const chimney = new THREE.Mesh(chimGeo, chimMat)
  chimney.position.set(1.2, 4.5, -0.5)
  group.add(chimney)

  // Smoke particles
  const smokeCount = 20
  const smokePos = new Float32Array(smokeCount * 3)
  for (let i = 0; i < smokeCount; i++) {
    smokePos[i * 3] = 1.2 + (Math.random() - 0.5) * 0.5
    smokePos[i * 3 + 1] = 5.0 + Math.random() * 3
    smokePos[i * 3 + 2] = -0.5 + (Math.random() - 0.5) * 0.5
  }
  const smokeGeo = new THREE.BufferGeometry()
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3))
  const smokeMat = new THREE.PointsMaterial({ size: 0.3, color: 0x888888, transparent: true, opacity: 0.3, depthWrite: false })
  const smoke = new THREE.Points(smokeGeo, smokeMat)
  group.add(smoke)

  // Place at path start
  const y = heightFn(0, -3)
  group.position.set(0, y, -3)

  return { group, smoke }
}

export class WorldScene {
  constructor() {
    this._scene = new THREE.Scene()
    this._camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120)
    this._camera.position.set(0, 5, 0)

    this._terrain = null
    this._sky = null
    this._props = null
    this._lighting = null
    this._ambient = null
    this._billboards = null
    this._volumetric = null
    this._cottage = null
    this._cottageSmoke = null
    this._biomeKey = null
    this._pathCurve = null
  }

  getScene() { return this._scene }
  getCamera() { return this._camera }
  getSky() { return this._sky }
  getLighting() { return this._lighting }

  create(biomeKey, pathCurve) {
    this.dispose()
    this._biomeKey = biomeKey
    this._pathCurve = pathCurve

    // Terrain
    this._terrain = new TerrainGenerator(biomeKey)
    this._scene.add(this._terrain.getMesh())

    // Apply path trail to terrain
    if (pathCurve) {
      this._terrain.setPathCurve(pathCurve)
    }

    // Sky
    this._sky = new SkySystem(biomeKey)
    this._scene.add(this._sky.getMesh())

    // Stars (added to scene, visibility controlled by sky)
    const starsMesh = this._sky.getStarsMesh()
    if (starsMesh) this._scene.add(starsMesh)

    // Fog
    this._scene.background = new THREE.Color(this._sky.getFogColor())
    this._scene.fog = new THREE.FogExp2(this._sky.getFogColor(), this._sky.getFogDensity())
    this._scene.fog.density *= 1.6

    // Props (with path avoidance)
    const heightFn = (x, z) => this.heightAt(x, z)
    this._props = new BiomeProps(biomeKey, heightFn, pathCurve)
    for (const mesh of this._props.getMeshes()) {
      this._scene.add(mesh)
    }

    // Lighting (with fog reference for seasonal modulation)
    this._lighting = new LightingSystem(biomeKey)
    if (this._scene.fog) {
      this._lighting.setFog(this._scene.fog)
    }
    for (const light of this._lighting.getLights()) {
      this._scene.add(light)
    }

    // Ambient entities
    this._ambient = new AmbientEntities(biomeKey)
    for (const mesh of this._ambient.getMeshes()) {
      this._scene.add(mesh)
    }

    // Billboard sprites (2D-HD trees)
    this._billboards = new BillboardSpriteSystem(biomeKey, heightFn, pathCurve)
    for (const mesh of this._billboards.getMeshes()) {
      this._scene.add(mesh)
    }

    // Volumetric effects (ground fog + light shafts)
    this._volumetric = new VolumetricEffects(biomeKey, heightFn, pathCurve)
    for (const mesh of this._volumetric.getMeshes()) {
      this._scene.add(mesh)
    }

    // Shadow blobs under billboard trees
    if (this._billboards && this._lighting) {
      const treePositions = []
      for (const mesh of this._billboards.getMeshes()) {
        const mat = new THREE.Matrix4()
        for (let i = 0; i < Math.min(mesh.count, 100); i++) {
          mesh.getMatrixAt(i, mat)
          const pos = new THREE.Vector3()
          pos.setFromMatrixPosition(mat)
          treePositions.push(pos)
        }
      }
      const shadowMesh = this._lighting.createShadowBlobs(treePositions, heightFn)
      if (shadowMesh) this._scene.add(shadowMesh)
    }

    // Cottage at path start
    const cottage = _buildCottage(heightFn)
    this._cottage = cottage.group
    this._cottageSmoke = cottage.smoke
    this._scene.add(this._cottage)

    // Set camera at spawn point
    const spawnY = this.heightAt(0, 0) + 1.8
    this._camera.position.set(0, spawnY, 0)

    // Apply initial time of day
    this.setTimeOfDay()
  }

  heightAt(x, z) {
    return this._terrain ? this._terrain.heightAt(x, z) : 0
  }

  setMood(mood) {
    this._lighting?.setMood(mood)
  }

  /** Set time of day based on real local time (or override) */
  setTimeOfDay(hour, seasonIndex) {
    if (hour === undefined) {
      const now = new Date()
      hour = now.getHours() + now.getMinutes() / 60
    }
    if (seasonIndex === undefined) seasonIndex = 0

    this._sky?.setTimeOfDay(hour, seasonIndex)
    this._lighting?.setTimeOfDay(hour)
  }

  update(dt, elapsed) {
    this._ambient?.update(dt, this._camera.position)
    this._billboards?.update(dt, this._camera)
    this._volumetric?.update(dt, elapsed, this._camera.position)

    // Wind animation for grass/fern
    this._props?.updateWind(elapsed)

    // Animate smoke
    if (this._cottageSmoke) {
      const pos = this._cottageSmoke.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 1] += dt * 0.3
        if (pos.array[i * 3 + 1] > 9) pos.array[i * 3 + 1] = 5.0
      }
      pos.needsUpdate = true
    }
  }

  dispose() {
    this._terrain?.dispose()
    this._sky?.dispose()
    this._props?.dispose()
    this._lighting?.dispose()
    this._ambient?.dispose()
    this._billboards?.dispose()
    this._volumetric?.dispose()

    while (this._scene.children.length > 0) {
      this._scene.remove(this._scene.children[0])
    }

    this._terrain = null
    this._sky = null
    this._props = null
    this._lighting = null
    this._ambient = null
    this._billboards = null
    this._volumetric = null
    this._cottage = null
    this._cottageSmoke = null
    this._biomeKey = null
    this._pathCurve = null
  }
}

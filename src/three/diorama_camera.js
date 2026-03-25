// M.E.R.L.I.N. — Diorama Camera
// Fixed camera with slow orbit around a focal point per biome
// Replaces AutoWalk for a cinematic, composed viewing experience

import * as THREE from 'three'
import { tween } from './tween_engine.js'

const DIORAMA_PROFILES = {
  broceliande:    { height: 6,  orbitSpeed: 0.02,  orbitRadius: 14, breathAmount: 0.05, breathSpeed: 0.3, fov: 55, lookAtY: 1 },
  landes:         { height: 4,  orbitSpeed: 0.015, orbitRadius: 12, breathAmount: 0.04, breathSpeed: 0.25, fov: 60, lookAtY: 0.5 },
  cotes:          { height: 8,  orbitSpeed: 0.02,  orbitRadius: 15, breathAmount: 0.06, breathSpeed: 0.3, fov: 50, lookAtY: 2 },
  monts:          { height: 12, orbitSpeed: 0.01,  orbitRadius: 16, breathAmount: 0.03, breathSpeed: 0.2, fov: 55, lookAtY: 3 },
  ile_sein:       { height: 5,  orbitSpeed: 0.02,  orbitRadius: 12, breathAmount: 0.05, breathSpeed: 0.3, fov: 55, lookAtY: 1 },
  huelgoat:       { height: 5,  orbitSpeed: 0.015, orbitRadius: 11, breathAmount: 0.05, breathSpeed: 0.3, fov: 55, lookAtY: 2 },
  ecosse:         { height: 6,  orbitSpeed: 0.02,  orbitRadius: 14, breathAmount: 0.04, breathSpeed: 0.25, fov: 58, lookAtY: 1 },
  iles_mystiques: { height: 3,  orbitSpeed: 0.025, orbitRadius: 10, breathAmount: 0.06, breathSpeed: 0.35, fov: 50, lookAtY: 2 },
}

export class DioramaCamera {
  constructor(camera) {
    this._camera = camera
    this._active = false
    this._profile = null
    this._angle = 0
    this._elapsed = 0
    this._heightFn = null
    this._lookAt = new THREE.Vector3(0, 1, 0)
    this._focusing = false
  }

  setHeightFunction(fn) { this._heightFn = fn }

  configure(biomeKey) {
    this._profile = DIORAMA_PROFILES[biomeKey] ?? DIORAMA_PROFILES.broceliande
    this._angle = Math.random() * Math.PI * 2
    this._elapsed = 0
    this._focusing = false

    // Set initial look target
    const groundY = this._heightFn ? this._heightFn(0, 0) : 0
    this._lookAt.set(0, groundY + this._profile.lookAtY, 0)

    // Set camera FOV
    this._camera.fov = this._profile.fov
    this._camera.updateProjectionMatrix()

    // Position camera on orbit
    this._updatePosition(0)
  }

  start() { this._active = true }
  stop() { this._active = false }
  isActive() { return this._active }

  getLookAt() { return this._lookAt.clone() }

  update(dt) {
    if (!this._active || !this._profile || dt <= 0) return

    this._elapsed += dt

    // Advance orbit angle (slow rotation)
    if (!this._focusing) {
      this._angle += this._profile.orbitSpeed * dt
    }

    this._updatePosition(dt)
  }

  _updatePosition() {
    const p = this._profile
    const x = Math.sin(this._angle) * p.orbitRadius
    const z = Math.cos(this._angle) * p.orbitRadius

    // Ground-following height
    const groundY = this._heightFn ? this._heightFn(x, z) : 0
    const baseY = groundY + p.height

    // Breathing animation (subtle vertical oscillation)
    const breath = Math.sin(this._elapsed * p.breathSpeed * Math.PI * 2) * p.breathAmount

    this._camera.position.set(x, baseY + breath, z)
    this._camera.lookAt(this._lookAt)
  }

  focusOnEncounter(targetPosition) {
    if (!targetPosition || !this._profile) return
    this._focusing = true

    // Compute angle toward the encounter position
    const targetAngle = Math.atan2(targetPosition.x - this._lookAt.x, targetPosition.z - this._lookAt.z)

    // Smoothly rotate toward encounter (over ~1 second via manual lerp)
    const startAngle = this._angle
    const diff = targetAngle - startAngle
    // Normalize to [-PI, PI]
    const normalized = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
    // Move 30% toward encounter for a subtle focus
    this._angle = startAngle + normalized * 0.3
  }

  returnToOrbit() {
    this._focusing = false
  }
}

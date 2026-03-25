// M.E.R.L.I.N. — Auto-Walk Camera
// Cinematic rail camera: walks forward automatically, gentle sway, terrain-following
// No player input — purely automated movement between encounters

import * as THREE from 'three'

export class AutoWalk {
  constructor(camera) {
    this._camera = camera
    this._active = false
    this._speed = 3.0      // units/sec
    this._bobAmount = 0.08  // head bob
    this._swayAmount = 0.3  // path curve
    this._elapsed = 0

    // Walk direction (slowly curves)
    this._angle = 0          // current heading (radians)
    this._targetAngle = 0
    this._angleChangeTimer = 0

    // Height following
    this._heightFn = null
    this._playerHeight = 1.8

    // Look target (slightly ahead of walk direction)
    this._lookAhead = new THREE.Vector3()
  }

  setHeightFunction(fn) { this._heightFn = fn }

  start() { this._active = true }

  stop() { this._active = false }

  isActive() { return this._active }

  update(dt) {
    if (!this._active || dt <= 0) return

    this._elapsed += dt

    // Slowly change direction for variety
    this._angleChangeTimer -= dt
    if (this._angleChangeTimer <= 0) {
      this._targetAngle = this._angle + (Math.random() - 0.5) * 0.6
      this._angleChangeTimer = 3 + Math.random() * 4
    }
    this._angle += (this._targetAngle - this._angle) * dt * 0.5

    // Move forward
    const dx = Math.sin(this._angle) * this._speed * dt
    const dz = Math.cos(this._angle) * this._speed * dt

    this._camera.position.x += dx
    this._camera.position.z += dz

    // Terrain following
    if (this._heightFn) {
      const groundY = this._heightFn(this._camera.position.x, this._camera.position.z)
      this._camera.position.y = groundY + this._playerHeight
    }

    // Head bob
    const bob = Math.sin(this._elapsed * 4) * this._bobAmount
    this._camera.position.y += bob

    // Gentle sway
    const sway = Math.sin(this._elapsed * 0.7) * this._swayAmount * 0.01
    this._camera.position.x += sway

    // Look direction: slightly ahead
    this._lookAhead.set(
      this._camera.position.x + Math.sin(this._angle) * 10,
      this._camera.position.y - 0.3,
      this._camera.position.z + Math.cos(this._angle) * 10,
    )
    this._camera.lookAt(this._lookAhead)
  }

  getPosition() { return this._camera.position }

  // Keep camera within bounds
  clampToBounds(maxDist) {
    const dist = Math.sqrt(
      this._camera.position.x ** 2 + this._camera.position.z ** 2
    )
    if (dist > maxDist) {
      // Turn back toward center
      this._targetAngle = Math.atan2(-this._camera.position.x, -this._camera.position.z)
      this._angle = this._targetAngle
    }
  }
}

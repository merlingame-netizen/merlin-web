// M.E.R.L.I.N. — FPS Controls
// PointerLockControls wrapper + WASD velocity + terrain-following raycast

import * as THREE from 'three'

export class FPSControls {
  constructor(camera, domElement) {
    this._camera = camera
    this._domElement = domElement
    this._enabled = false
    this._locked = false

    // Movement
    this._velocity = new THREE.Vector3()
    this._direction = new THREE.Vector3()
    this._moveForward = false
    this._moveBackward = false
    this._moveLeft = false
    this._moveRight = false

    // Physics
    this._speed = 8.0
    this._damping = 8.0
    this._playerHeight = 1.8
    this._heightFn = null // (x, z) => y

    // Euler for mouse look
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ')
    this._mouseSensitivity = 0.002
    this._minPolarAngle = Math.PI * 0.1   // ~18 deg up
    this._maxPolarAngle = Math.PI * 0.85  // ~153 deg down

    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onPointerLockChange = this._onPointerLockChange.bind(this)
    this._onClick = this._onClick.bind(this)
  }

  setHeightFunction(fn) { this._heightFn = fn }

  enable() {
    if (this._enabled) return
    this._enabled = true
    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('keyup', this._onKeyUp)
    document.addEventListener('mousemove', this._onMouseMove)
    document.addEventListener('pointerlockchange', this._onPointerLockChange)
    // Listen on document since DOM overlays sit above the canvas
    document.addEventListener('click', this._onClick)
  }

  disable() {
    this._enabled = false
    this._locked = false
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('keyup', this._onKeyUp)
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('pointerlockchange', this._onPointerLockChange)
    document.removeEventListener('click', this._onClick)
    if (document.pointerLockElement) document.exitPointerLock()
    this._moveForward = this._moveBackward = this._moveLeft = this._moveRight = false
    this._velocity.set(0, 0, 0)
  }

  isLocked() { return this._locked }

  update(dt) {
    if (!this._enabled || !this._locked) return

    // Direction from keys
    this._direction.z = Number(this._moveForward) - Number(this._moveBackward)
    this._direction.x = Number(this._moveRight) - Number(this._moveLeft)
    this._direction.normalize()

    // Apply acceleration
    const accel = this._speed * 2
    if (this._moveForward || this._moveBackward) {
      this._velocity.z -= this._direction.z * accel * dt
    }
    if (this._moveLeft || this._moveRight) {
      this._velocity.x -= this._direction.x * accel * dt
    }

    // Damping
    this._velocity.x -= this._velocity.x * this._damping * dt
    this._velocity.z -= this._velocity.z * this._damping * dt

    // Move camera in look direction (XZ plane only)
    const forward = new THREE.Vector3()
    this._camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    this._camera.position.addScaledVector(forward, -this._velocity.z * dt)
    this._camera.position.addScaledVector(right, -this._velocity.x * dt)

    // Terrain following
    if (this._heightFn) {
      const groundY = this._heightFn(this._camera.position.x, this._camera.position.z)
      this._camera.position.y = groundY + this._playerHeight
    }
  }

  getPosition() { return this._camera.position }

  getDistanceWalked() {
    return Math.sqrt(
      this._camera.position.x ** 2 + this._camera.position.z ** 2
    )
  }

  _onClick(e) {
    // Don't lock if clicking a button or interactive element
    if (e.target.closest('button, a, input, select, .g3d-choice-btn')) return
    if (!this._locked) {
      this._domElement.requestPointerLock()
    }
  }

  _onPointerLockChange() {
    this._locked = document.pointerLockElement === this._domElement
  }

  _onMouseMove(e) {
    if (!this._locked) return
    this._euler.setFromQuaternion(this._camera.quaternion)
    this._euler.y -= e.movementX * this._mouseSensitivity
    this._euler.x -= e.movementY * this._mouseSensitivity
    this._euler.x = Math.max(
      Math.PI / 2 - this._maxPolarAngle,
      Math.min(Math.PI / 2 - this._minPolarAngle, this._euler.x)
    )
    this._camera.quaternion.setFromEuler(this._euler)
  }

  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this._moveForward = true; break
      case 'KeyS': case 'ArrowDown':  this._moveBackward = true; break
      case 'KeyA': case 'ArrowLeft':  this._moveLeft = true; break
      case 'KeyD': case 'ArrowRight': this._moveRight = true; break
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this._moveForward = false; break
      case 'KeyS': case 'ArrowDown':  this._moveBackward = false; break
      case 'KeyA': case 'ArrowLeft':  this._moveLeft = false; break
      case 'KeyD': case 'ArrowRight': this._moveRight = false; break
    }
  }
}

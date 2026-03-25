// M.E.R.L.I.N. — Path Camera System
// Human-height camera following a CatmullRomCurve3 through the forest
// Stops at encounter points, resumes after player choice

import * as THREE from 'three'

// Path shapes per biome (waypoint generation parameters)
const PATH_PROFILES = {
  broceliande:    { spread: 0.5, length: 70, curviness: 1.2, points: 25 },
  landes:         { spread: 0.3, length: 80, curviness: 0.8, points: 25 },
  cotes:          { spread: 0.6, length: 65, curviness: 1.5, points: 25 },
  monts:          { spread: 0.4, length: 60, curviness: 1.0, points: 25 },
  ile_sein:       { spread: 0.3, length: 50, curviness: 0.7, points: 20 },
  huelgoat:       { spread: 0.5, length: 65, curviness: 1.3, points: 25 },
  ecosse:         { spread: 0.4, length: 75, curviness: 1.0, points: 25 },
  iles_mystiques: { spread: 0.5, length: 55, curviness: 1.4, points: 22 },
}

// 25 encounter stops along the path (t values 0-1) — ~3.5s walk between each
const ENCOUNTER_POINTS = Array.from({ length: 25 }, (_, i) => 0.03 + i * 0.035)

const EYE_HEIGHT = 1.7
const WALK_SPEED = 0.035 // Fast walk — ~30s full path — ~4s between encounters
const DECEL_DURATION = 0.6
const ACCEL_DURATION = 0.5
const BOB_VERTICAL = 0.05
const BOB_LATERAL = 0.022
const BOB_FREQ_V = 6.0
const BOB_FREQ_H = 3.0
const LOOK_AHEAD = 0.025 // how far ahead on the curve to look

export class PathCamera {
  constructor(camera, onEncounterReached) {
    this._camera = camera
    this._onEncounterReached = onEncounterReached
    this._onApproaching = null
    this._path = null
    this._heightFn = null
    this._progress = 0
    this._speed = 0
    this._targetSpeed = WALK_SPEED
    this._state = 'idle' // idle | walking | approaching | stopping | stopped | resuming
    this._bobPhase = 0
    this._encounterIndex = 0
    this._elapsed = 0
    this._lookOffset = new THREE.Vector3()
    this._approachTriggered = false

    this._camera.fov = 65
    this._camera.updateProjectionMatrix()
  }

  setHeightFunction(fn) {
    this._heightFn = fn
  }

  configure(biomeKey) {
    const profile = PATH_PROFILES[biomeKey] ?? PATH_PROFILES.broceliande
    const waypoints = []

    for (let i = 0; i < profile.points; i++) {
      const t = i / (profile.points - 1)
      const angle = t * Math.PI * profile.curviness + Math.sin(t * 3.5) * 0.4
      const radius = 5 + t * profile.length * 0.8
      const x = Math.sin(angle) * radius * profile.spread
      const z = -3 + t * profile.length - profile.length * 0.5
      const y = this._heightFn ? this._heightFn(x, z) + EYE_HEIGHT : EYE_HEIGHT
      waypoints.push(new THREE.Vector3(x, y, z))
    }

    this._path = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.5)
    this._progress = 0
    this._encounterIndex = 0
    this._state = 'idle'
    this._speed = 0

    // Position camera at start (cottage door)
    const startPos = this._path.getPointAt(0)
    this._camera.position.copy(startPos)
    const lookTarget = this._path.getPointAt(0.01)
    this._camera.lookAt(lookTarget)
  }

  /** Get the spline path for terrain/props to reference */
  getPath() {
    return this._path
  }

  /** Get current world position on path */
  getPosition() {
    if (!this._path) return new THREE.Vector3(0, EYE_HEIGHT, 0)
    return this._path.getPointAt(Math.min(this._progress, 0.999))
  }

  /** Get forward direction for spawning creatures ahead */
  getForward() {
    if (!this._path) return new THREE.Vector3(0, 0, -1)
    const t = Math.min(this._progress, 0.995)
    return this._path.getTangentAt(t).normalize()
  }

  /** Override walk speed (for cinematic intro slow pan) */
  setSpeedOverride(speed) {
    this._speedOverride = speed
  }

  clearSpeedOverride() {
    this._speedOverride = null
  }

  setOnApproaching(fn) {
    this._onApproaching = fn
  }

  /** Get point ahead on path for card spawning */
  getPointAhead(distance = 0.04) {
    if (!this._path) return new THREE.Vector3(0, 1.7, 0)
    const t = Math.min(this._progress + distance, 0.999)
    const p = this._path.getPointAt(t)
    if (this._heightFn) p.y = this._heightFn(p.x, p.z)
    return p
  }

  getCamera() { return this._camera }

  startWalking() {
    if (this._state === 'idle' || this._state === 'stopped') {
      this._state = 'resuming'
      this._targetSpeed = WALK_SPEED
      this._approachTriggered = false
      console.log('[PathCamera] Starting walk')
    }
  }

  stopAtEncounter() {
    this._state = 'stopping'
    this._targetSpeed = 0
  }

  resumeAfterChoice() {
    if (this._state === 'stopped') {
      this._state = 'resuming'
      this._targetSpeed = WALK_SPEED
      console.log('[PathCamera] Resuming after choice')
    }
  }

  isAtEncounter() {
    return this._state === 'stopped'
  }

  update(dt) {
    if (!this._path || this._state === 'idle') return

    this._elapsed += dt

    // Speed interpolation (acceleration / deceleration)
    if (this._state === 'stopping') {
      this._speed = Math.max(0, this._speed - (WALK_SPEED / DECEL_DURATION) * dt)
      if (this._speed <= 0.0001) {
        this._speed = 0
        this._state = 'stopped'
        console.log(`[PathCamera] Stopped at encounter ${this._encounterIndex}`)
        this._onEncounterReached?.(this._encounterIndex)
      }
    } else if (this._state === 'resuming') {
      this._speed = Math.min(WALK_SPEED, this._speed + (WALK_SPEED / ACCEL_DURATION) * dt)
      if (this._speed >= WALK_SPEED * 0.99) {
        this._speed = WALK_SPEED
        this._state = 'walking'
      }
    } else if (this._state === 'approaching') {
      // Slow down gradually to 40% speed
      const approachSpeed = WALK_SPEED * 0.4
      this._speed = Math.max(approachSpeed, this._speed - (WALK_SPEED / DECEL_DURATION) * dt * 0.5)
    } else if (this._state === 'walking') {
      this._speed = this._speedOverride ?? WALK_SPEED
    }

    // Advance progress
    this._progress += this._speed * dt
    if (this._progress >= 0.999) {
      this._progress = 0.999
      this._state = 'stopped'
      return
    }

    // Check for encounter points (approaching → stopping → stopped)
    if ((this._state === 'walking' || this._state === 'resuming' || this._state === 'approaching') && this._encounterIndex < ENCOUNTER_POINTS.length) {
      const nextStop = ENCOUNTER_POINTS[this._encounterIndex]
      // Approaching: trigger card spawn ahead (0.05 before stop)
      if (!this._approachTriggered && this._progress >= nextStop - 0.05) {
        this._approachTriggered = true
        this._state = 'approaching'
        this._targetSpeed = WALK_SPEED * 0.4 // slow down
        this._onApproaching?.(this._encounterIndex, this.getPointAhead(0.04))
      }
      // Stop: close enough
      if (this._progress >= nextStop - 0.02) {
        this._encounterIndex++
        this._approachTriggered = false
        this.stopAtEncounter()
      }
    }

    // Position on path
    const pos = this._path.getPointAt(this._progress)

    // Terrain following (update Y to match terrain + eye height)
    if (this._heightFn) {
      pos.y = this._heightFn(pos.x, pos.z) + EYE_HEIGHT
    }

    // Head bob (only when moving)
    const bobScale = this._speed / WALK_SPEED
    this._bobPhase += dt * BOB_FREQ_V * bobScale
    const bobY = Math.sin(this._bobPhase) * BOB_VERTICAL * bobScale
    const bobX = Math.sin(this._bobPhase * BOB_FREQ_H / BOB_FREQ_V) * BOB_LATERAL * bobScale

    pos.y += bobY

    this._camera.position.copy(pos)

    // Look ahead on path
    const lookT = Math.min(this._progress + LOOK_AHEAD, 0.999)
    const lookTarget = this._path.getPointAt(lookT)
    if (this._heightFn) {
      lookTarget.y = this._heightFn(lookTarget.x, lookTarget.z) + EYE_HEIGHT * 0.9
    }

    // Apply lateral bob to look offset
    const right = new THREE.Vector3()
    right.crossVectors(this._camera.up, lookTarget.clone().sub(pos)).normalize()
    lookTarget.add(right.multiplyScalar(bobX))

    this._camera.lookAt(lookTarget)
  }

  dispose() {
    this._path = null
    this._heightFn = null
  }
}

// M.E.R.L.I.N. — Render Manager
// Singleton WebGLRenderer shared between menu 3D, FPS world, and CRT ambient
// Phase 4: Post-processing pipeline support

import * as THREE from 'three'
import { PostProcessing } from './post_processing.js'

let _instance = null

export class RenderManager {
  constructor(canvas) {
    if (_instance) return _instance
    _instance = this

    this._canvas = canvas
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.outputColorSpace = THREE.SRGBColorSpace
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure = 1.4

    this._activeScene = null
    this._activeCamera = null
    this._updateFn = null
    this._clock = new THREE.Clock()
    this._animId = null
    this._paused = false
    this._postProcessing = new PostProcessing(this._renderer)
    this._postEnabled = false // off by default (menu doesn't need it)

    this._resizeHandler = () => this._onResize()
    window.addEventListener('resize', this._resizeHandler)
    this._animate()
  }

  getRenderer() { return this._renderer }
  getCanvas() { return this._canvas }

  setPostProcessing(enabled) {
    this._postEnabled = enabled
    this._postProcessing.setEnabled(enabled)
  }

  setActiveScene(scene, camera, updateFn = null) {
    this._activeScene = scene
    this._activeCamera = camera
    this._updateFn = updateFn
    this._paused = false

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
  }

  pause() {
    this._paused = true
  }

  resume() {
    this._paused = false
  }

  isPaused() { return this._paused }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate())
    if (this._paused || !this._activeScene || !this._activeCamera) return

    const dt = this._clock.getDelta()
    const elapsed = this._clock.getElapsedTime()

    if (this._updateFn) this._updateFn(dt, elapsed)

    if (this._postEnabled) {
      this._postProcessing.render(this._activeScene, this._activeCamera, elapsed)
    } else {
      this._renderer.render(this._activeScene, this._activeCamera)
    }
  }

  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this._renderer.setSize(w, h)
    this._postProcessing.resize(w, h)

    if (this._activeCamera instanceof THREE.PerspectiveCamera) {
      this._activeCamera.aspect = w / h
      this._activeCamera.updateProjectionMatrix()
    }
  }

  dispose() {
    if (this._animId) cancelAnimationFrame(this._animId)
    this._postProcessing.dispose()
    this._renderer.dispose()
    window.removeEventListener('resize', this._resizeHandler)
    _instance = null
  }
}

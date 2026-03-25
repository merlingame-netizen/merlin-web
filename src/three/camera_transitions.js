// M.E.R.L.I.N. — Camera Transitions
// Smooth camera moves between states: walk -> encounter, encounter -> walk

import { tween } from './tween_engine.js'

export class CameraTransitions {
  constructor(camera) {
    this._camera = camera
    this._baseFov = 70
    this._transitioning = false
  }

  isTransitioning() { return this._transitioning }

  // Zoom in slightly when encounter starts (dramatic effect)
  async toEncounter() {
    this._transitioning = true
    await tween(this._camera, 'fov', this._camera.fov, 55, 0.6, 'easeInOut')
    this._camera.updateProjectionMatrix()
    this._transitioning = false
  }

  // Zoom back out when encounter ends
  async toWalk() {
    this._transitioning = true
    await tween(this._camera, 'fov', this._camera.fov, this._baseFov, 0.4, 'easeOutExpo')
    this._camera.updateProjectionMatrix()
    this._transitioning = false
  }

  // Update projection matrix during tween (call in render loop)
  update() {
    if (this._transitioning) {
      this._camera.updateProjectionMatrix()
    }
  }
}

// M.E.R.L.I.N. — Scene Router
// Lightweight phase-based router. Each scene: mount(container) / unmount() / render(state)

export class SceneRouter {
  constructor(container) {
    this._container = container
    this._scenes = {}
    this._activeScene = null
    this._activePhase = null
  }

  register(phase, scene) {
    this._scenes[phase] = scene
  }

  async navigate(phase, state) {
    if (this._activePhase === phase) {
      this._activeScene?.render(state)
      return
    }

    // Unmount current
    if (this._activeScene) {
      this._activeScene.unmount()
      this._container.innerHTML = ''
    }

    const scene = this._scenes[phase]
    if (!scene) {
      console.warn(`[Router] No scene for phase: ${phase}`)
      return
    }

    this._activePhase = phase
    this._activeScene = scene

    // Mount new scene
    scene.mount(this._container)
    if (scene.onEnter) await scene.onEnter(state)
    scene.render(state)
  }

  render(state) {
    if (state.phase !== this._activePhase) {
      this.navigate(state.phase, state)
    } else {
      this._activeScene?.render(state)
    }
  }
}

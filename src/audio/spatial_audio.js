// M.E.R.L.I.N. — Spatial Audio
// Positional audio via Web Audio API PannerNode + biome ambient drones

let _ctx = null
let _activeDrone = null

function _getContext() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _ctx
}

// Play a sound at a 3D position relative to the listener
export function playAt(soundFn, position, listenerPos) {
  const ctx = _getContext()
  if (ctx.state === 'suspended') ctx.resume()

  const panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = 1
  panner.maxDistance = 50
  panner.rolloffFactor = 2

  // Set position relative to listener
  const dx = position.x - (listenerPos?.x ?? 0)
  const dz = position.z - (listenerPos?.z ?? 0)
  panner.positionX.setValueAtTime(dx, ctx.currentTime)
  panner.positionY.setValueAtTime(position.y ?? 0, ctx.currentTime)
  panner.positionZ.setValueAtTime(dz, ctx.currentTime)

  panner.connect(ctx.destination)

  // Generate sound
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  soundFn(osc, gain, ctx)
  osc.connect(gain)
  gain.connect(panner)
  osc.start()
}

// Biome ambient drone configurations
const DRONE_CONFIGS = {
  broceliande:    { freq: 80, type: 'sine', volume: 0.04, lfoFreq: 0.3 },
  landes:         { freq: 120, type: 'sawtooth', volume: 0.02, lfoFreq: 0.5 },
  cotes:          { freq: 60, type: 'sine', volume: 0.05, lfoFreq: 0.2 },
  monts:          { freq: 55, type: 'sine', volume: 0.03, lfoFreq: 0.15 },
  ile_sein:       { freq: 90, type: 'sine', volume: 0.04, lfoFreq: 0.25 },
  huelgoat:       { freq: 70, type: 'triangle', volume: 0.03, lfoFreq: 0.4 },
  ecosse:         { freq: 110, type: 'sawtooth', volume: 0.02, lfoFreq: 0.35 },
  iles_mystiques: { freq: 100, type: 'sine', volume: 0.05, lfoFreq: 0.2 },
}

// Start a continuous ambient drone for a biome
export function startBiomeDrone(biomeKey) {
  stopBiomeDrone()

  const ctx = _getContext()
  if (ctx.state === 'suspended') ctx.resume()

  const config = DRONE_CONFIGS[biomeKey] ?? DRONE_CONFIGS.broceliande

  // Main oscillator
  const osc = ctx.createOscillator()
  osc.type = config.type
  osc.frequency.setValueAtTime(config.freq, ctx.currentTime)

  // LFO for subtle modulation
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(config.lfoFreq, ctx.currentTime)

  const lfoGain = ctx.createGain()
  lfoGain.gain.setValueAtTime(config.freq * 0.05, ctx.currentTime)

  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)

  // Master gain
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 2)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  lfo.start()

  _activeDrone = { osc, lfo, gain, ctx }
}

export function stopBiomeDrone() {
  if (!_activeDrone) return

  const { osc, lfo, gain, ctx } = _activeDrone
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1)
  setTimeout(() => {
    try { osc.stop(); lfo.stop() } catch { /* already stopped */ }
  }, 1200)

  _activeDrone = null
}

// Encounter sound effect (spatial)
export function playEncounterSpawn(position, listenerPos) {
  playAt((osc, gain, ctx) => {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.stop(ctx.currentTime + 0.8)
  }, position, listenerPos)
}

export function playEncounterDismiss(position, listenerPos) {
  playAt((osc, gain, ctx) => {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.stop(ctx.currentTime + 0.5)
  }, position, listenerPos)
}

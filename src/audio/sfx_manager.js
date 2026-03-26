// M.E.R.L.I.N. — SFX Manager (Web Audio API)
// 30+ procedural sounds: UI, gameplay, ambiance, aspect shifts

let _ctx = null
let _masterGain = null
let _muted = false

function _getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
    _masterGain = _ctx.createGain()
    _masterGain.gain.value = 0.3
    _masterGain.connect(_ctx.destination)
  }
  // Resume if suspended (autoplay policy)
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function _gain(volume = 1) {
  const ctx = _getCtx()
  const g = ctx.createGain()
  g.gain.value = volume
  g.connect(_masterGain)
  return g
}

// ── Core synthesis helpers ──────────────────────────────────────────────

function _tone(freq, duration, type = 'sine', volume = 0.5) {
  const ctx = _getCtx()
  const osc = ctx.createOscillator()
  const g = _gain(volume)
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(volume, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(g)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function _noise(duration, volume = 0.15) {
  const ctx = _getCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const g = _gain(volume)
  g.gain.setValueAtTime(volume, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  src.connect(g)
  src.start(ctx.currentTime)
}

function _sweep(startFreq, endFreq, duration, type = 'sine', volume = 0.3) {
  const ctx = _getCtx()
  const osc = ctx.createOscillator()
  const g = _gain(volume)
  osc.type = type
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)
  g.gain.setValueAtTime(volume, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(g)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

// ── Public SFX Library ──────────────────────────────────────────────────

export const SFX = {
  // UI
  click() { _tone(800, 0.05, 'square', 0.15) },
  hover() { _tone(1200, 0.03, 'sine', 0.08) },
  confirm() { _tone(523, 0.08, 'sine', 0.3); setTimeout(() => _tone(659, 0.08, 'sine', 0.3), 80) },
  cancel() { _tone(330, 0.12, 'sawtooth', 0.2) },
  save() {
    _tone(440, 0.1, 'sine', 0.25)
    setTimeout(() => _tone(554, 0.1, 'sine', 0.25), 100)
    setTimeout(() => _tone(659, 0.15, 'sine', 0.25), 200)
  },

  // Card & Gameplay
  cardDraw() { _sweep(200, 600, 0.15, 'sine', 0.2); _noise(0.08, 0.05) },
  cardReveal() { _sweep(400, 800, 0.2, 'triangle', 0.25) },
  choiceSelect() { _tone(660, 0.06, 'square', 0.2); _tone(880, 0.06, 'square', 0.15) },
  choiceHover() { _tone(440, 0.04, 'sine', 0.1) },

  // Scene-specific encounter sounds
  encounterNature() { _sweep(300, 500, 0.3, 'sine', 0.15); _noise(0.15, 0.03) }, // gentle wind
  encounterCreature() { _sweep(150, 80, 0.2, 'sawtooth', 0.2); _tone(120, 0.3, 'triangle', 0.15) }, // growl
  encounterSacred() { _tone(528, 0.4, 'sine', 0.2); _tone(396, 0.4, 'sine', 0.15); _sweep(600, 900, 0.3, 'sine', 0.1) }, // chime
  encounterDanger() { _sweep(200, 100, 0.15, 'sawtooth', 0.25); _noise(0.2, 0.08) }, // tension
  encounterMystic() { _sweep(400, 700, 0.4, 'sine', 0.12); _sweep(500, 800, 0.4, 'sine', 0.1) }, // ethereal

  // Aspect shifts
  aspectUp() { _sweep(300, 600, 0.25, 'sine', 0.3) },
  aspectDown() { _sweep(600, 200, 0.25, 'sawtooth', 0.25) },
  aspectBalance() {
    _tone(440, 0.15, 'sine', 0.2)
    setTimeout(() => _tone(440, 0.15, 'sine', 0.2), 150)
  },

  // Souffle
  souffleGain() { _sweep(500, 900, 0.2, 'triangle', 0.25); _noise(0.1, 0.03) },
  souffleLose() { _sweep(700, 300, 0.2, 'triangle', 0.2) },

  // Life
  lifeGain() {
    _tone(523, 0.1, 'sine', 0.3)
    setTimeout(() => _tone(659, 0.1, 'sine', 0.3), 100)
    setTimeout(() => _tone(784, 0.15, 'sine', 0.3), 200)
  },
  lifeLose() {
    _tone(300, 0.2, 'sawtooth', 0.3)
    setTimeout(() => _tone(200, 0.3, 'sawtooth', 0.25), 150)
  },

  // Ogham
  oghamActivate() {
    _sweep(300, 1200, 0.3, 'sine', 0.3)
    _noise(0.15, 0.08)
    setTimeout(() => _tone(880, 0.2, 'triangle', 0.2), 200)
  },
  oghamCooldown() { _tone(200, 0.15, 'square', 0.1) },
  oghamReady() { _tone(660, 0.1, 'triangle', 0.15); _tone(880, 0.08, 'triangle', 0.12) },

  // Minigame
  minigameStart() { _sweep(200, 800, 0.3, 'triangle', 0.25) },
  minigameSuccess() {
    _tone(523, 0.1, 'sine', 0.3)
    setTimeout(() => _tone(659, 0.1, 'sine', 0.3), 100)
    setTimeout(() => _tone(784, 0.1, 'sine', 0.3), 200)
    setTimeout(() => _tone(1047, 0.2, 'sine', 0.3), 300)
  },
  minigameFail() {
    _tone(400, 0.15, 'sawtooth', 0.25)
    setTimeout(() => _tone(300, 0.2, 'sawtooth', 0.2), 150)
  },
  minigameCritical() {
    _sweep(400, 1600, 0.4, 'sine', 0.3)
    setTimeout(() => _noise(0.15, 0.1), 300)
  },
  minigameFumble() {
    _sweep(800, 100, 0.5, 'sawtooth', 0.3)
    _noise(0.3, 0.15)
  },

  // Transition / ambiance
  transitionWhoosh() { _sweep(100, 2000, 0.4, 'sine', 0.15); _noise(0.3, 0.1) },
  biomeReveal() {
    _sweep(200, 400, 0.3, 'sine', 0.2)
    setTimeout(() => _sweep(400, 800, 0.3, 'sine', 0.2), 200)
  },
  endingVictory() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => _tone(f, 0.3, 'sine', 0.3), i * 200)
    )
  },
  endingDefeat() {
    [400, 350, 300, 200].forEach((f, i) =>
      setTimeout(() => _tone(f, 0.4, 'sawtooth', 0.2), i * 300)
    )
  },

  // Bestiole
  bestioleHappy() { _tone(800, 0.08, 'sine', 0.2); setTimeout(() => _tone(1000, 0.08, 'sine', 0.2), 80) },
  bestioleSad() { _sweep(600, 300, 0.2, 'triangle', 0.15) },

  // Boot
  bootBeep() { _tone(440, 0.05, 'square', 0.15) },
  bootComplete() {
    _tone(440, 0.1, 'sine', 0.2)
    setTimeout(() => _tone(660, 0.1, 'sine', 0.2), 100)
    setTimeout(() => _tone(880, 0.15, 'sine', 0.2), 200)
  },
}

// ── Volume control ──────────────────────────────────────────────────────

export function setVolume(v) {
  if (_masterGain) _masterGain.gain.value = Math.max(0, Math.min(1, v))
}

export function toggleMute() {
  _muted = !_muted
  if (_masterGain) _masterGain.gain.value = _muted ? 0 : 0.3
  return _muted
}

export function isMuted() { return _muted }

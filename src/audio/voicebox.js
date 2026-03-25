// M.E.R.L.I.N. — Voicebox (ACVoicebox port)
// Letter-by-letter oscillator sync with typewriter text
// Merlin preset: robotic, low pitch (2.5), pitch_variation 0.12

let _ctx = null
let _masterGain = null

function _getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
    _masterGain = _ctx.createGain()
    _masterGain.gain.value = 0.12
    _masterGain.connect(_ctx.destination)
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

const PRESETS = {
  merlin: {
    basePitch: 2.5,
    pitchVariation: 0.12,
    letterDuration: 0.04,
    type: 'square',
    volume: 0.12,
  },
  npc: {
    basePitch: 3.5,
    pitchVariation: 0.15,
    letterDuration: 0.035,
    type: 'triangle',
    volume: 0.1,
  },
  bestiole: {
    basePitch: 5.0,
    pitchVariation: 0.3,
    letterDuration: 0.03,
    type: 'sine',
    volume: 0.08,
  },
}

// Frequency map: character → base frequency multiplier
const CHAR_FREQ = {}
'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => {
  CHAR_FREQ[c] = 80 + (i * 8)
})
// Accented chars mapped to base
'àâäéèêëîïôùûüçœæ'.split('').forEach((c, i) => {
  CHAR_FREQ[c] = 100 + (i * 7)
})

export class Voicebox {
  constructor(preset = 'merlin') {
    this._preset = PRESETS[preset] ?? PRESETS.merlin
    this._timer = null
    this._active = false
  }

  setPreset(name) {
    this._preset = PRESETS[name] ?? PRESETS.merlin
  }

  // Speak a character (called per-letter during typewriter)
  speakChar(char) {
    if (!char || char === ' ' || char === '\n') return

    const ctx = _getCtx()
    const p = this._preset
    const baseFreq = CHAR_FREQ[char.toLowerCase()] ?? 120

    const freq = baseFreq * p.basePitch * (1 + (Math.random() - 0.5) * p.pitchVariation * 2)

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = p.type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(p.volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p.letterDuration)

    osc.connect(gain)
    gain.connect(_masterGain)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + p.letterDuration)
  }

  // Auto-speak text with typewriter sync
  // Returns { stop, promise } — stop() cancels early, promise resolves when done
  speakText(text, speed = 25, onChar = null) {
    this.stop()
    this._active = true

    let i = 0
    let resolve
    const promise = new Promise(r => { resolve = r })

    this._timer = setInterval(() => {
      if (i >= text.length || !this._active) {
        this.stop()
        resolve()
        return
      }
      const char = text[i]
      this.speakChar(char)
      if (onChar) onChar(char, i)
      i++
    }, speed)

    return {
      stop: () => this.stop(),
      promise,
    }
  }

  stop() {
    this._active = false
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  isActive() { return this._active }
}

export function setVoiceVolume(v) {
  if (_masterGain) _masterGain.gain.value = Math.max(0, Math.min(0.3, v))
}

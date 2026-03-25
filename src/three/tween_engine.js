// M.E.R.L.I.N. — Lightweight Tween Engine
// Simple property tweening with easings, returns Promises

const _activeTweens = []

// Easings
const EASINGS = {
  linear: t => t,
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
  },
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1
  },
}

export function tween(target, prop, from, to, duration, easing = 'easeInOut') {
  return new Promise(resolve => {
    const easeFn = EASINGS[easing] ?? EASINGS.linear
    const start = performance.now()

    const entry = { target, prop, from, to, duration, easeFn, start, resolve }
    _activeTweens.push(entry)
  })
}

// Call every frame from the render loop
export function updateTweens() {
  const now = performance.now()
  let i = _activeTweens.length

  while (i--) {
    const tw = _activeTweens[i]
    const elapsed = (now - tw.start) / 1000
    const t = Math.min(1, elapsed / tw.duration)
    const v = tw.from + (tw.to - tw.from) * tw.easeFn(t)

    if (typeof tw.prop === 'function') {
      tw.prop(v)
    } else {
      tw.target[tw.prop] = v
    }

    if (t >= 1) {
      _activeTweens.splice(i, 1)
      tw.resolve()
    }
  }
}

// Tween a Vector3 property
export function tweenVec3(target, from, to, duration, easing = 'easeInOut') {
  return Promise.all([
    tween(target, 'x', from.x, to.x, duration, easing),
    tween(target, 'y', from.y, to.y, duration, easing),
    tween(target, 'z', from.z, to.z, duration, easing),
  ])
}

// Tween opacity (material)
export function tweenOpacity(material, from, to, duration, easing = 'easeInOut') {
  material.transparent = true
  return tween(material, 'opacity', from, to, duration, easing)
}

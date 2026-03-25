// M.E.R.L.I.N. — Iris Opening Effect (circular reveal)
export function playEyelidOpen(duration = 2000) {
  return new Promise(resolve => {
    // Black overlay with expanding circular hole
    const el = document.createElement('div')
    el.id = 'iris-overlay'
    el.style.cssText = `
      position:fixed;inset:0;z-index:200;pointer-events:none;
      background:radial-gradient(circle at 50% 50%, transparent 0%, transparent 0%, #000 0%, #000 100%);
    `
    document.body.appendChild(el)

    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      const pct = ease * 75 // max 75% radius = full screen covered
      el.style.background = `radial-gradient(circle at 50% 50%, transparent ${pct}%, #000 ${pct + 2}%)`
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        el.style.opacity = '0'
        el.style.transition = 'opacity 0.4s'
        setTimeout(() => { el.remove(); resolve() }, 400)
      }
    }
    requestAnimationFrame(animate)
  })
}

export function playEyelidClose(duration = 800) {
  return new Promise(resolve => {
    const el = document.createElement('div')
    el.id = 'iris-close'
    el.style.cssText = `
      position:fixed;inset:0;z-index:200;pointer-events:none;
      background:radial-gradient(circle at 50% 50%, transparent 75%, #000 77%);
    `
    document.body.appendChild(el)

    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const ease = t * t * t // ease in
      const pct = 75 * (1 - ease)
      el.style.background = `radial-gradient(circle at 50% 50%, transparent ${pct}%, #000 ${pct + 2}%)`
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        el.remove()
        resolve()
      }
    }
    requestAnimationFrame(animate)
  })
}

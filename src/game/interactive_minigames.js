// M.E.R.L.I.N. — 6 Interactive Canvas Minigames
// Replace d20 roll with actual touch/click gameplay
// Each returns a Promise<{score:0-100, success:boolean}>

const PALETTE = {
  bg: '#060d06', green: '#33FF66', greenDim: '#1F9A3D',
  amber: '#FFBF33', cyan: '#4DD9CC', red: '#FF3328',
  white: 'rgba(255,255,255,.7)',
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function distToSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

// ── Canvas setup helper ──
function createOverlay() {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.92)'
  const head = document.createElement('div')
  head.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;width:100%;max-width:380px'
  const name = document.createElement('span')
  name.style.cssText = "font:18px/1 'VT323',monospace;color:#4DD9CC"
  const barWrap = document.createElement('div')
  barWrap.style.cssText = 'flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden'
  const barFill = document.createElement('div')
  barFill.style.cssText = 'height:100%;background:#FFBF33;transition:width .1s linear;border-radius:2px;width:100%'
  barWrap.appendChild(barFill)
  head.appendChild(name)
  head.appendChild(barWrap)
  wrap.appendChild(head)

  const cWrap = document.createElement('div')
  cWrap.style.cssText = 'width:100%;max-width:380px;aspect-ratio:1;position:relative'
  const cv = document.createElement('canvas')
  cv.width = 400; cv.height = 400
  cv.style.cssText = 'width:100%;height:100%;border-radius:10px;touch-action:none'
  cWrap.appendChild(cv)
  wrap.appendChild(cWrap)

  const instruct = document.createElement('div')
  instruct.style.cssText = "font:13px/1.3 'VT323',monospace;color:rgba(255,255,255,0.5);margin-bottom:6px;text-align:center;max-width:380px;min-height:18px"
  wrap.insertBefore(instruct, cWrap)

  const result = document.createElement('div')
  result.style.cssText = "font:24px/1 'VT323',monospace;color:#FFBF33;margin-top:10px;opacity:0;transition:opacity .3s"
  wrap.appendChild(result)

  document.body.appendChild(wrap)
  const cx = cv.getContext('2d')
  return { wrap, cv, cx, name, barFill, result, instruct }
}

function bg(cx) { cx.fillStyle = PALETTE.bg; cx.fillRect(0, 0, 400, 400) }

// ══════════════════════════════════════════════════════════════
// TRACES — Follow path with finger
// ══════════════════════════════════════════════════════════════
function playTraces() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Traces'
    instruct.textContent = 'Glissez le doigt le long du sentier lumineux'
    const dur = 10, pts = []
    for (let i = 0; i < 10; i++) pts.push({ x: 30 + Math.random() * 340, y: 15 + i * 38 })
    let trail = [], total = 0, onPath = 0, sparks = [], timer = 0, done = false

    cv.addEventListener('pointermove', e => {
      if (done) return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 400
      trail.push({ x, y })
      let mn = 999
      for (let i = 0; i < pts.length - 1; i++) mn = Math.min(mn, distToSeg(x, y, pts[i], pts[i + 1]))
      total++
      if (mn < 20) { onPath++; sparks.push({ x, y, l: 1, vx: (Math.random() - .5) * 2, vy: -Math.random() * 2 }) }
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      sparks = sparks.filter(p => { p.l -= .03; p.x += p.vx; p.y += p.vy; return p.l > 0 })
      bg(cx)
      sparks.forEach(p => { cx.beginPath(); cx.arc(p.x, p.y, 2 * p.l, 0, 6.28); cx.fillStyle = `rgba(255,191,51,${p.l})`; cx.fill() })
      cx.shadowBlur = 8; cx.shadowColor = 'rgba(31,154,61,.3)'
      cx.strokeStyle = PALETTE.greenDim; cx.lineWidth = 2; cx.setLineDash([8, 5])
      cx.beginPath(); cx.moveTo(pts[0].x, pts[0].y); for (const p of pts) cx.lineTo(p.x, p.y); cx.stroke()
      cx.setLineDash([]); cx.shadowBlur = 0
      if (trail.length > 1) { cx.strokeStyle = 'rgba(255,191,51,.6)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(trail[0].x, trail[0].y); for (const p of trail) cx.lineTo(p.x, p.y); cx.stroke() }
      cx.fillStyle = PALETTE.white; cx.font = '13px Inter,sans-serif'; cx.fillText('Glissez le long du sentier', 115, 14)
      if (timer >= dur) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = total > 0 ? Math.round(onPath / total * 100) : 50
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// RUNES — Memorize and tap Ogham sequence
// ══════════════════════════════════════════════════════════════
function playRunes() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Runes'
    instruct.textContent = 'Trouvez la plante ou rune indiquée parmi les symboles'
    const dur = 13
    const symbols = ['\u1681', '\u1682', '\u168A', '\u1688', '\u1687', '\u1684']
    const seq = []; for (let i = 0; i < 5; i++) seq.push(symbols[Math.floor(Math.random() * symbols.length)])
    let phase = 'show', showIdx = 0, showTimer = 0, input = [], ok = 0, flashes = [], timer = 0, done = false

    cv.addEventListener('pointerdown', e => {
      if (done || phase !== 'input') return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 400
      for (let i = 0; i < symbols.length; i++) {
        const sx = 20 + (i % 3) * 130, sy = 200 + Math.floor(i / 3) * 90
        if (x > sx && x < sx + 110 && y > sy && y < sy + 75) {
          input.push(symbols[i])
          const idx = input.length - 1
          const correct = idx < seq.length && input[idx] === seq[idx]
          if (correct) ok++
          flashes.push({ i, t: 1, ok: correct })
          if (input.length >= seq.length) done = true
        }
      }
    })

    const loop = () => {
      if (done) { finish(); return }
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      flashes = flashes.filter(f => { f.t -= .04; return f.t > 0 })
      bg(cx)
      if (phase === 'show') {
        cx.fillStyle = PALETTE.cyan; cx.font = '15px Inter,sans-serif'; cx.fillText('Memorisez...', 150, 26)
        cx.font = "64px 'VT323',monospace"; cx.fillStyle = '#80FFFB'
        cx.shadowBlur = 20; cx.shadowColor = 'rgba(128,255,251,.3)'
        if (showIdx < seq.length) cx.fillText(seq[showIdx], 168, 125)
        cx.shadowBlur = 0
        for (let i = 0; i < seq.length; i++) { cx.beginPath(); cx.arc(160 + i * 18, 155, 3, 0, 6.28); cx.fillStyle = i <= showIdx ? PALETTE.cyan : 'rgba(255,255,255,.12)'; cx.fill() }
        showTimer += .016; if (showTimer > .85) { showTimer = 0; showIdx++; if (showIdx >= seq.length) phase = 'input' }
      } else {
        cx.fillStyle = 'rgba(51,255,102,.4)'; cx.font = '13px Inter,sans-serif'; cx.fillText("Tapez dans l'ordre", 140, 24)
        cx.font = "40px 'VT323',monospace"
        for (let i = 0; i < symbols.length; i++) {
          const sx = 20 + (i % 3) * 130, sy = 200 + Math.floor(i / 3) * 90
          const fl = flashes.find(f => f.i === i)
          cx.fillStyle = fl ? (fl.ok ? 'rgba(51,255,102,.15)' : 'rgba(255,51,40,.15)') : '#0a140a'
          cx.fillRect(sx, sy, 110, 75)
          cx.strokeStyle = fl ? (fl.ok ? PALETTE.green : PALETTE.red) : 'rgba(255,255,255,.04)'
          cx.lineWidth = fl ? 2 : 1; cx.strokeRect(sx, sy, 110, 75)
          cx.fillStyle = PALETTE.cyan; cx.fillText(symbols[i], sx + 35, sy + 50)
        }
        cx.font = "44px 'VT323',monospace"; cx.fillStyle = PALETTE.amber
        cx.fillText(input.map((s, i) => i < seq.length && s === seq[i] ? s : '\u2717').join(' '), 45, 148)
      }
      if (timer >= dur) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = Math.round(ok / seq.length * 100)
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// EQUILIBRE — Balance ball on beam
// ══════════════════════════════════════════════════════════════
function playEquilibre() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Equilibre'
    instruct.textContent = 'Maintenez le curseur au centre de la barre'
    const dur = 11
    let bx = 200, sp = 0, touch = null, inC = 0, tot = 0, sparks = [], timer = 0, done = false

    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); touch = (e.clientX - r.left) / r.width < .5 ? 'L' : 'R' })
    cv.addEventListener('pointerup', () => touch = null)
    cv.addEventListener('pointerleave', () => touch = null)

    const loop = () => {
      if (done) return
      timer += .016; tot += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      sp += (Math.random() - .5) * (3 + tot * .25)
      if (touch === 'L') sp -= 5; if (touch === 'R') sp += 5
      sp *= .93; bx += sp * .016 * 60; bx = clamp(bx, 25, 375)
      const on = Math.abs(bx - 200) < 42; if (on) inC += .016
      if (on && Math.random() < .08) sparks.push({ x: bx, y: 218, l: 1, vx: (Math.random() - .5) * 2.5, vy: -1 - Math.random() * 2 })
      bg(cx)
      sparks = sparks.filter(s => { s.l -= .04; s.x += s.vx; s.y += s.vy; if (s.l > 0) { cx.beginPath(); cx.arc(s.x, s.y, 1.5 * s.l, 0, 6.28); cx.fillStyle = `rgba(51,255,102,${s.l})`; cx.fill() } return s.l > 0 })
      const gr = cx.createLinearGradient(25, 0, 375, 0)
      gr.addColorStop(0, PALETTE.red); gr.addColorStop(.15, '#a63'); gr.addColorStop(.35, PALETTE.greenDim); gr.addColorStop(.5, PALETTE.green); gr.addColorStop(.65, PALETTE.greenDim); gr.addColorStop(.85, '#a63'); gr.addColorStop(1, PALETTE.red)
      cx.fillStyle = gr; cx.fillRect(25, 218, 350, 3)
      cx.beginPath(); cx.arc(bx, 216, 8, 0, 6.28)
      cx.fillStyle = on ? PALETTE.green : PALETTE.amber; cx.shadowBlur = on ? 12 : 3; cx.shadowColor = on ? 'rgba(51,255,102,.4)' : 'rgba(255,191,51,.2)'; cx.fill(); cx.shadowBlur = 0
      cx.fillStyle = PALETTE.white; cx.font = '12px Inter,sans-serif'; cx.fillText('\u25C0 GAUCHE', 40, 340); cx.fillText('DROITE \u25B6', 290, 340)
      if (timer >= dur) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = tot > 0 ? Math.round(inC / tot * 100) : 50
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// HERBORISTERIE — Pick the safe plant
// ══════════════════════════════════════════════════════════════
function playHerbo() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Herboristerie'
    instruct.textContent = 'Identifiez la bonne plante parmi les specimens'
    const dur = 14
    const plants = [{ n: 'Sauge', c: '#3a5', ok: 1 }, { n: 'Belladone', c: '#933', ok: 0 }, { n: 'Thym', c: '#6a3', ok: 1 }, { n: 'Aconit', c: '#639', ok: 0 }, { n: 'Millepertuis', c: '#ca3', ok: 1 }, { n: 'Datura', c: '#963', ok: 0 }]
    let rd = 0, mx = 3, correct = 0, choices = [], picked = false, fb = '', timer = 0, done = false

    function genRound() {
      const safe = plants.filter(p => p.ok), tox = plants.filter(p => !p.ok)
      const picks = [safe[Math.floor(Math.random() * safe.length)]]
      while (picks.length < 4) { const pool = Math.random() < .55 ? tox : safe; const p = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(p)) picks.push(p) }
      for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]] }
      choices = picks
    }
    genRound()

    cv.addEventListener('pointerdown', e => {
      if (done || picked) return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 400
      for (let i = 0; i < 4; i++) {
        const px = 10 + (i % 2) * 200, py = 85 + Math.floor(i / 2) * 150
        if (x > px && x < px + 180 && y > py && y < py + 120) {
          picked = true; fb = choices[i].ok ? 'Correct!' : 'Toxique!'
          if (choices[i].ok) correct++
          setTimeout(() => { rd++; picked = false; fb = ''; if (rd < mx) genRound() }, 750)
        }
      }
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bg(cx)
      cx.fillStyle = 'rgba(51,255,102,.35)'; cx.font = '13px Inter,sans-serif'
      cx.fillText(`Trouvez la plante saine (${rd + 1}/${mx})`, 100, 26)
      for (let i = 0; i < 4 && i < choices.length; i++) {
        const p = choices[i], px = 10 + (i % 2) * 200, py = 85 + Math.floor(i / 2) * 150
        cx.fillStyle = '#0a140a'; cx.fillRect(px, py, 180, 120)
        cx.strokeStyle = 'rgba(255,255,255,.04)'; cx.strokeRect(px, py, 180, 120)
        cx.fillStyle = p.c; cx.beginPath(); cx.arc(px + 90, py + 40, 22, 0, 6.28); cx.fill()
        cx.fillRect(px + 87, py + 58, 6, 30)
        cx.beginPath(); cx.ellipse(px + 78, py + 55, 10, 4, -.3, 0, 6.28); cx.fill()
        cx.beginPath(); cx.ellipse(px + 103, py + 60, 10, 4, .3, 0, 6.28); cx.fill()
        cx.fillStyle = PALETTE.white; cx.font = '11px Inter,sans-serif'; cx.fillText(p.n, px + 64, py + 105)
      }
      if (fb) { cx.fillStyle = fb === 'Correct!' ? PALETTE.green : PALETTE.red; cx.font = "22px 'VT323',monospace"; cx.fillText(fb, 160, 68) }
      if (timer >= dur || (rd >= mx && !picked)) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = Math.round(correct / mx * 80 + Math.random() * 20)
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// COMBAT — Dodge on 3x3 grid
// ══════════════════════════════════════════════════════════════
function playCombat() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Combat Rituel'
    instruct.textContent = 'Cliquez au bon moment quand le curseur est dans la zone verte'
    const dur = 13
    let atk = -1, at = 0, dodges = 0, attacks = 0, mx = 9, phase = 'wait', wt = 0, flashes = [], timer = 0, done = false

    cv.addEventListener('pointerdown', e => {
      if (done || phase !== 'dodge') return
      const r = cv.getBoundingClientRect()
      const x = Math.floor((e.clientX - r.left) / r.width * 3), y = Math.floor((e.clientY - r.top) / r.height * 3)
      const idx = y * 3 + x
      if (idx >= 0 && idx < 9 && idx !== atk) { dodges++; phase = 'wait'; wt = 0; flashes.push({ i: idx, t: 1, ok: true }) }
      else if (idx === atk) flashes.push({ i: idx, t: 1, ok: false })
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      const dt = .016
      if (phase === 'wait') { wt += dt; const spd = Math.max(.35, .65 - attacks * .03); if (wt > spd && attacks < mx) { atk = Math.floor(Math.random() * 9); phase = 'tell'; at = 0; attacks++ } }
      else if (phase === 'tell') { at += dt; if (at > .55) phase = 'dodge'; if (at > 1.2) { phase = 'wait'; wt = 0 } }
      else if (phase === 'dodge') { at += dt; if (at > 1.2) { phase = 'wait'; wt = 0 } }
      bg(cx)
      flashes = flashes.filter(h => { h.t -= .04; return h.t > 0 })
      for (let i = 0; i < 9; i++) {
        const gx = (i % 3) * 133 + 2, gy = Math.floor(i / 3) * 133 + 2
        const isA = i === atk && (phase === 'tell' || phase === 'dodge')
        const hi = flashes.find(h => h.i === i)
        cx.fillStyle = isA ? (phase === 'tell' ? 'rgba(255,51,40,.12)' : 'rgba(255,51,40,.35)') : (hi ? (hi.ok ? 'rgba(51,255,102,.1)' : 'rgba(255,51,40,.1)') : 'rgba(10,18,10,.45)')
        cx.fillRect(gx, gy, 129, 129)
        cx.strokeStyle = 'rgba(255,255,255,.025)'; cx.strokeRect(gx, gy, 129, 129)
        if (isA) { cx.fillStyle = phase === 'tell' ? 'rgba(255,51,40,.35)' : PALETTE.red; cx.font = "34px 'VT323',monospace"; cx.fillText('\u2694', gx + 50, gy + 78) }
      }
      cx.fillStyle = PALETTE.white; cx.font = '11px Inter,sans-serif'; cx.fillText(`Esquives: ${dodges}/${attacks}`, 155, 396)
      if (timer >= dur) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = attacks > 0 ? Math.round(dodges / attacks * 100) : 50
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// SANG-FROID — Hold steady on drifting target
// ══════════════════════════════════════════════════════════════
function playSangFroid() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Sang-froid'
    instruct.textContent = 'Restez immobile — ne bougez pas la souris'
    const dur = 9
    let tx = 200, ty = 200, hold = false, hx = 0, hy = 0, inT = 0, tot = 0, pp = 0, ripples = [], timer = 0, done = false

    cv.addEventListener('pointerdown', e => { hold = true; const r = cv.getBoundingClientRect(); hx = (e.clientX - r.left) / r.width * 400; hy = (e.clientY - r.top) / r.height * 400 })
    cv.addEventListener('pointermove', e => { if (!hold) return; const r = cv.getBoundingClientRect(); hx = (e.clientX - r.left) / r.width * 400; hy = (e.clientY - r.top) / r.height * 400 })
    cv.addEventListener('pointerup', () => hold = false)

    const loop = () => {
      if (done) return
      timer += .016; tot += .016; pp += .016 * 3.5; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      tx += Math.sin(tot * 1.8) * .6; ty += Math.cos(tot * 1.4) * .6
      tx = clamp(tx, 65, 335); ty = clamp(ty, 65, 335)
      const on = hold && Math.hypot(hx - tx, hy - ty) < 24
      if (on) { inT += .016; if (Math.random() < .06) ripples.push({ x: tx, y: ty, r: 0, l: 1 }) }
      bg(cx)
      ripples = ripples.filter(r => { r.l -= .018; r.r += 1.2; if (r.l > 0) { cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, 6.28); cx.strokeStyle = `rgba(77,217,204,${r.l * .25})`; cx.lineWidth = 1; cx.stroke() } return r.l > 0 })
      for (let i = 0; i < 5; i++) { const r = 18 + ((pp * 28 + i * 30) % 160); cx.beginPath(); cx.arc(tx, ty, r, 0, 6.28); cx.strokeStyle = `rgba(77,217,204,${.1 - r / 1600})`; cx.lineWidth = 1; cx.stroke() }
      cx.beginPath(); cx.arc(tx, ty, 18, 0, 6.28); cx.fillStyle = 'rgba(255,191,51,.1)'; cx.fill()
      cx.beginPath(); cx.arc(tx, ty, 5, 0, 6.28); cx.fillStyle = PALETTE.amber; cx.shadowBlur = 8; cx.shadowColor = 'rgba(255,191,51,.3)'; cx.fill(); cx.shadowBlur = 0
      if (hold) { cx.beginPath(); cx.arc(hx, hy, 3.5, 0, 6.28); cx.fillStyle = on ? PALETTE.green : PALETTE.red; cx.fill() }
      cx.fillStyle = PALETTE.white; cx.font = '12px Inter,sans-serif'; cx.fillText('Maintenez sur la cible', 140, 22)
      if (timer >= dur) { finish() } else requestAnimationFrame(loop)
    }
    const finish = () => {
      done = true
      const score = tot > 0 ? Math.round(inT / tot * 100) : 30
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// ARCHERY — Aim at moving target
// ══════════════════════════════════════════════════════════════
function playArchery() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Tir à l\'arc'
    instruct.textContent = 'Cliquez sur la cible mouvante — 5 flèches'
    const dur = 8
    let timer = 0, done = false, arrows = [], targetX = 200, targetY = 100, targetVx = 2, score = 0

    cv.addEventListener('click', e => {
      if (done || arrows.length >= 5) return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 400
      const dist = Math.hypot(x - targetX, y - targetY)
      const pts = dist < 15 ? 100 : dist < 35 ? 70 : dist < 60 ? 40 : 10
      score += pts
      arrows.push({ x, y, pts, t: 1 })
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      targetX += targetVx
      if (targetX > 370 || targetX < 30) targetVx *= -1
      targetY = 100 + Math.sin(timer * 2) * 40

      bg(cx)
      // Target
      cx.beginPath(); cx.arc(targetX, targetY, 25, 0, 6.28); cx.strokeStyle = PALETTE.red; cx.lineWidth = 2; cx.stroke()
      cx.beginPath(); cx.arc(targetX, targetY, 12, 0, 6.28); cx.strokeStyle = PALETTE.amber; cx.lineWidth = 2; cx.stroke()
      cx.beginPath(); cx.arc(targetX, targetY, 4, 0, 6.28); cx.fillStyle = PALETTE.green; cx.fill()
      // Arrows
      arrows.forEach(a => {
        cx.fillStyle = a.pts >= 70 ? PALETTE.green : PALETTE.amber
        cx.fillRect(a.x - 1, a.y - 6, 2, 12)
        cx.fillStyle = PALETTE.white; cx.font = '11px Inter'; cx.fillText('+' + a.pts, a.x + 5, a.y)
      })
      cx.fillStyle = PALETTE.white; cx.font = '13px Inter'; cx.fillText(`Cliquez pour tirer (${5 - arrows.length} flèches)`, 100, 390)

      if (timer >= dur || arrows.length >= 5) {
        done = true
        const finalScore = clamp(Math.round(score / 5), 0, 100)
        result.textContent = 'Score: ' + finalScore; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score: finalScore, success: finalScore >= 50 }) }, 900)
      } else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// PUZZLE — Arrange rune stones in order
// ══════════════════════════════════════════════════════════════
function playPuzzle() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Puzzle Runique'
    instruct.textContent = 'Échangez les runes pour les remettre dans l\'ordre'
    const dur = 12
    const runes = ['ᚁ', 'ᚂ', 'ᚃ', 'ᚄ', 'ᚅ', 'ᚆ']
    const target = [...runes]
    const shuffled = [...runes].sort(() => Math.random() - 0.5)
    let grid = shuffled.map((r, i) => ({ rune: r, x: 50 + (i % 3) * 110, y: 140 + Math.floor(i / 3) * 110, correct: false }))
    let selected = -1, moves = 0, timer = 0, done = false

    cv.addEventListener('click', e => {
      if (done) return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 400
      const idx = grid.findIndex(g => Math.hypot(x - g.x - 35, y - g.y - 35) < 40)
      if (idx < 0) return
      if (selected < 0) { selected = idx }
      else {
        // Swap
        const tmp = grid[selected].rune; grid[selected].rune = grid[idx].rune; grid[idx].rune = tmp
        selected = -1; moves++
        // Check completion
        grid.forEach((g, i) => { g.correct = g.rune === target[i] })
        if (grid.every(g => g.correct)) { finish() }
      }
    })

    const finish = () => {
      done = true
      const score = clamp(100 - moves * 8, 10, 100)
      result.textContent = 'Score: ' + score; result.style.opacity = '1'
      setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
    }

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bg(cx)
      // Target order
      cx.fillStyle = PALETTE.white; cx.font = '12px Inter'; cx.fillText('Ordre: ' + target.join(' '), 120, 30)
      // Grid
      grid.forEach((g, i) => {
        cx.fillStyle = i === selected ? PALETTE.amber : (g.correct ? PALETTE.green : 'rgba(255,255,255,0.08)')
        cx.fillRect(g.x, g.y, 70, 70); cx.strokeStyle = 'rgba(255,255,255,0.2)'; cx.strokeRect(g.x, g.y, 70, 70)
        cx.fillStyle = PALETTE.white; cx.font = '28px serif'; cx.textAlign = 'center'; cx.fillText(g.rune, g.x + 35, g.y + 48); cx.textAlign = 'left'
      })
      cx.fillStyle = PALETTE.white; cx.font = '12px Inter'; cx.fillText(`Échangez les runes (${moves} coups)`, 110, 390)
      if (timer >= dur) finish()
      else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// FISHING — Timing catch
// ══════════════════════════════════════════════════════════════
function playFishing() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Pêche'
    instruct.textContent = 'Cliquez quand un poisson passe sous le flotteur'
    const dur = 10
    let timer = 0, done = false, fish = [], caught = 0, bobY = 200, bobPhase = Math.random() * 6.28

    cv.addEventListener('click', () => {
      if (done) return
      // Check if any fish near the bobber
      const nearFish = fish.find(f => Math.hypot(f.x - 200, f.y - bobY) < 30 && !f.caught)
      if (nearFish) { nearFish.caught = true; caught++ }
    })

    // Spawn fish
    for (let i = 0; i < 6; i++) {
      fish.push({ x: -20 - Math.random() * 200, y: 150 + Math.random() * 200, speed: 0.8 + Math.random() * 1.5, caught: false, size: 8 + Math.random() * 12 })
    }

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bobY = 200 + Math.sin(bobPhase + timer * 1.5) * 60

      bg(cx)
      // Water
      cx.fillStyle = 'rgba(40,80,120,0.3)'; cx.fillRect(0, 130, 400, 270)
      // Bobber
      cx.fillStyle = PALETTE.red; cx.beginPath(); cx.arc(200, bobY, 6, 0, 6.28); cx.fill()
      cx.strokeStyle = PALETTE.white; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(200, 20); cx.lineTo(200, bobY); cx.stroke()
      // Fish
      fish.forEach(f => {
        if (f.caught) return
        f.x += f.speed
        if (f.x > 420) f.x = -20
        cx.fillStyle = PALETTE.cyan; cx.beginPath()
        cx.ellipse(f.x, f.y, f.size, f.size * 0.5, 0, 0, 6.28); cx.fill()
        // Tail
        cx.beginPath(); cx.moveTo(f.x - f.size, f.y); cx.lineTo(f.x - f.size - 6, f.y - 5); cx.lineTo(f.x - f.size - 6, f.y + 5); cx.fill()
      })
      cx.fillStyle = PALETTE.white; cx.font = '13px Inter'; cx.fillText(`Attrapé: ${caught}/6 — Cliquez quand un poisson passe!`, 60, 390)

      if (timer >= dur) {
        done = true
        const score = clamp(Math.round(caught / 6 * 100), 0, 100)
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
      } else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// NEGOTIATE — Slider matching
// ══════════════════════════════════════════════════════════════
function playNegotiate() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Négociation'
    instruct.textContent = 'Cliquez sur la barre pour trouver la valeur cachée (chaud/froid)'
    const dur = 8
    const targetVal = 30 + Math.floor(Math.random() * 40) // hidden target
    let sliderVal = 50, timer = 0, done = false, guesses = 0, bestDist = 100

    cv.addEventListener('click', e => {
      if (done) return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400
      sliderVal = clamp(Math.round(x / 400 * 100), 0, 100)
      guesses++
      bestDist = Math.min(bestDist, Math.abs(sliderVal - targetVal))
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bg(cx)
      // Slider track
      cx.fillStyle = 'rgba(255,255,255,0.06)'; cx.fillRect(20, 190, 360, 20)
      // Slider value
      const slX = 20 + (sliderVal / 100) * 360
      cx.fillStyle = PALETTE.amber; cx.fillRect(slX - 4, 182, 8, 36)
      // Hint (warm/cold)
      const dist = Math.abs(sliderVal - targetVal)
      const hint = dist < 5 ? '🔥 Brûlant!' : dist < 15 ? '♨️ Chaud' : dist < 30 ? '🌡️ Tiède' : '❄️ Froid'
      cx.fillStyle = PALETTE.white; cx.font = '20px Inter'; cx.textAlign = 'center'; cx.fillText(hint, 200, 160); cx.textAlign = 'left'
      cx.fillStyle = PALETTE.white; cx.font = '13px Inter'; cx.fillText(`Offre: ${sliderVal} — Cliquez pour ajuster (${guesses} essais)`, 60, 300)

      if (timer >= dur || bestDist < 3) {
        done = true
        const score = clamp(100 - bestDist * 2, 0, 100)
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
      } else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// STEALTH — Avoid detection zones
// ══════════════════════════════════════════════════════════════
function playStealth() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Furtivité'
    instruct.textContent = 'Atteignez la sortie en évitant les cônes de vision des gardes'
    const dur = 8
    let playerX = 200, playerY = 350, timer = 0, done = false, detected = 0
    const guards = Array.from({ length: 4 }, () => ({
      x: 50 + Math.random() * 300, y: 50 + Math.random() * 200,
      angle: Math.random() * 6.28, rotSpeed: 0.5 + Math.random() * 1.5
    }))

    cv.addEventListener('pointermove', e => {
      if (done) return
      const r = cv.getBoundingClientRect()
      playerX = (e.clientX - r.left) / r.width * 400
      playerY = (e.clientY - r.top) / r.height * 400
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bg(cx)
      // Goal
      cx.fillStyle = PALETTE.green; cx.beginPath(); cx.arc(200, 30, 15, 0, 6.28); cx.fill()
      cx.fillStyle = PALETTE.white; cx.font = '10px Inter'; cx.textAlign = 'center'; cx.fillText('SORTIE', 200, 34); cx.textAlign = 'left'
      // Guards + detection cones
      guards.forEach(g => {
        g.angle += g.rotSpeed * 0.016
        const coneLen = 80, coneAngle = 0.5
        cx.fillStyle = 'rgba(255,51,40,0.12)'
        cx.beginPath(); cx.moveTo(g.x, g.y)
        cx.lineTo(g.x + Math.cos(g.angle - coneAngle) * coneLen, g.y + Math.sin(g.angle - coneAngle) * coneLen)
        cx.lineTo(g.x + Math.cos(g.angle + coneAngle) * coneLen, g.y + Math.sin(g.angle + coneAngle) * coneLen)
        cx.fill()
        cx.fillStyle = PALETTE.red; cx.beginPath(); cx.arc(g.x, g.y, 6, 0, 6.28); cx.fill()
        // Detection check
        const dx = playerX - g.x, dy = playerY - g.y, dist = Math.hypot(dx, dy)
        const angleTo = Math.atan2(dy, dx)
        const angleDiff = Math.abs(((angleTo - g.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        if (dist < coneLen && angleDiff < coneAngle) detected++
      })
      // Player
      cx.fillStyle = PALETTE.cyan; cx.beginPath(); cx.arc(playerX, playerY, 5, 0, 6.28); cx.fill()
      cx.fillStyle = PALETTE.white; cx.font = '12px Inter'; cx.fillText('Atteignez la sortie sans être vu!', 100, 390)

      // Reached goal?
      if (Math.hypot(playerX - 200, playerY - 30) < 20) {
        done = true
        const score = clamp(100 - detected, 0, 100)
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
      } else if (timer >= dur) {
        done = true
        const score = clamp(30 - detected, 0, 100)
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
      } else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// DIVINATION — Pattern memory
// ══════════════════════════════════════════════════════════════
function playDivination() {
  return new Promise(resolve => {
    const { wrap, cv, cx, name, barFill, result, instruct } = createOverlay()
    name.textContent = 'Divination'
    instruct.textContent = 'Mémorisez la séquence de symboles, puis reproduisez-la'
    const dur = 15, seqLen = 4
    const symbols = ['☽', '☀', '★', '⚡', '♦', '⬟']
    const sequence = Array.from({ length: seqLen }, () => Math.floor(Math.random() * 6))
    let phase = 'show', showIdx = 0, playerSeq = [], timer = 0, showTimer = 0, done = false

    cv.addEventListener('click', e => {
      if (done || phase !== 'input') return
      const r = cv.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width * 400
      const idx = clamp(Math.floor(x / 67), 0, 5)
      playerSeq.push(idx)
      if (playerSeq.length >= seqLen) {
        let correct = 0
        for (let i = 0; i < seqLen; i++) if (playerSeq[i] === sequence[i]) correct++
        done = true
        const score = clamp(Math.round(correct / seqLen * 100), 0, 100)
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: score >= 50 }) }, 900)
      }
    })

    const loop = () => {
      if (done) return
      timer += .016; barFill.style.width = ((1 - timer / dur) * 100) + '%'
      bg(cx)

      if (phase === 'show') {
        showTimer += .016
        showIdx = Math.floor(showTimer / 1.2)
        if (showIdx >= seqLen) { phase = 'input'; showTimer = 0 }
        else {
          cx.fillStyle = PALETTE.amber; cx.font = '60px serif'; cx.textAlign = 'center'
          cx.fillText(symbols[sequence[showIdx]], 200, 200)
          cx.fillStyle = PALETTE.white; cx.font = '14px Inter'
          cx.fillText(`Mémorisez: ${showIdx + 1}/${seqLen}`, 200, 280); cx.textAlign = 'left'
        }
      } else {
        // Input phase — show symbol grid
        symbols.forEach((s, i) => {
          const sx = 10 + i * 67
          cx.fillStyle = playerSeq.includes(i) ? 'rgba(51,255,102,0.15)' : 'rgba(255,255,255,0.05)'
          cx.fillRect(sx, 150, 60, 60); cx.strokeStyle = 'rgba(255,255,255,0.2)'; cx.strokeRect(sx, 150, 60, 60)
          cx.fillStyle = PALETTE.white; cx.font = '28px serif'; cx.textAlign = 'center'; cx.fillText(s, sx + 30, 192); cx.textAlign = 'left'
        })
        cx.fillStyle = PALETTE.white; cx.font = '13px Inter'; cx.fillText(`Reproduisez la séquence (${playerSeq.length}/${seqLen})`, 90, 300)
      }

      if (timer >= dur && !done) {
        done = true; const score = 20
        result.textContent = 'Score: ' + score; result.style.opacity = '1'
        setTimeout(() => { wrap.remove(); resolve({ score, success: false }) }, 900)
      } else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

// ══════════════════════════════════════════════════════════════
// REGISTRY — map minigame type to play function
// ══════════════════════════════════════════════════════════════
const GAMES = {
  chance: playHerbo,
  bluff: playNegotiate,
  observation: playRunes,
  logique: playPuzzle,
  finesse: playEquilibre,
  vigueur: playCombat,
  esprit: playSangFroid,
  perception: playTraces,
  archery: playArchery,
  fishing: playFishing,
  stealth: playStealth,
  divination: playDivination,
  negotiate: playNegotiate,
  puzzle: playPuzzle,
}

/**
 * Play an interactive minigame based on type.
 * @param {string} type - One of: chance, bluff, observation, logique, finesse, vigueur, esprit, perception
 * @param {object} context - Game context (factions, difficulty, etc.) — used for threshold adjustment
 * @returns {Promise<{score: number, success: boolean, critical: boolean, fumble: boolean}>}
 */
export async function playInteractiveMinigame(type, context = {}) {
  const playFn = GAMES[type] || playSangFroid

  // Safety timeout: auto-resolve after 10s if player doesn't interact
  const autoResolve = new Promise(resolve =>
    setTimeout(() => {
      // Clean up any lingering minigame overlay
      document.querySelectorAll('[style*="z-index:60"], [style*="z-index: 60"]').forEach(el => el.remove())
      resolve({ score: 50, success: true })
    }, 10000)
  )
  const result = await Promise.race([playFn(), autoResolve])

  // Map score to d20-like result for compatibility
  const critical = result.score >= 95
  const fumble = result.score <= 5

  return {
    score: result.score,
    success: result.success,
    critical,
    fumble,
    roll: Math.round(result.score / 5), // pseudo d20
    threshold: 10, // fixed for display
    type,
    config: { label: type, icon: '🎮' },
  }
}

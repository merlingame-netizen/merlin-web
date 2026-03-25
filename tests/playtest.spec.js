// M.E.R.L.I.N. — Full Playtest: play a real game, screenshot every step, log bugs
import { test, expect } from '@playwright/test'
import fs from 'fs'

const BASE = 'https://merlin-game.vercel.app'
const SHOTS = 'tests/playtest-shots'

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true })
})

let consoleErrors = []
let consoleWarnings = []
let consoleLogs = []

test.beforeEach(async ({ page }) => {
  consoleErrors = []
  consoleWarnings = []
  consoleLogs = []
  page.on('pageerror', err => consoleErrors.push(err.message))
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text())
    else consoleLogs.push(msg.text())
  })
})

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test('PLAYTEST: Full game run with screenshots', async ({ page }) => {
  test.setTimeout(300000) // 5 min max for full run

  // ═══════════════════════════════════════════
  // STEP 1: Boot + Menu
  // ═══════════════════════════════════════════
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(3000)
  await shot(page, '01_menu')

  // Check menu elements
  const menuVisible = await page.evaluate(() => {
    return !!(document.querySelector('.scene-menu') || document.querySelector('#mv2-play'))
  })
  console.log(`[PLAYTEST] Menu visible: ${menuVisible}`)

  // ═══════════════════════════════════════════
  // STEP 2: Click "Nouvelle Partie" / "Continuer"
  // ═══════════════════════════════════════════
  const clickResult = await page.evaluate(() => {
    const el = document.querySelector('#mv2-play') || document.querySelector('#mv2-new') || document.querySelector('.mv2-btn-primary')
    if (el) { el.click(); return el.textContent.trim() }
    const btns = document.querySelectorAll('.mv2-btn, button')
    for (const b of btns) {
      if (b.textContent.includes('Nouvelle') || b.textContent.includes('Continuer')) {
        b.click(); return b.textContent.trim()
      }
    }
    return null
  })
  console.log(`[PLAYTEST] Clicked: "${clickResult}"`)
  await page.waitForTimeout(4000)
  await shot(page, '02_after_menu_click')

  // ═══════════════════════════════════════════
  // STEP 3: Wait for scene transition (intro/quiz/game)
  // ═══════════════════════════════════════════
  await page.waitForTimeout(5000)
  await shot(page, '03_scene_loaded')

  // Check what scene we're in
  const sceneInfo = await page.evaluate(() => {
    const sceneEl = document.querySelector('[class*="scene-"]')
    const canvas = document.querySelector('#canvas-3d')
    const hud = document.querySelector('#hud-overlay')
    return {
      sceneClass: sceneEl?.className || 'none',
      hasCanvas: !!canvas,
      hasHud: !!hud,
      bodyText: document.body.innerText.substring(0, 500),
    }
  })
  console.log(`[PLAYTEST] Scene: ${sceneInfo.sceneClass}`)
  console.log(`[PLAYTEST] Canvas: ${sceneInfo.hasCanvas}, HUD: ${sceneInfo.hasHud}`)

  // ═══════════════════════════════════════════
  // STEP 4: Wait for intro typewriter to finish + click "Entrer" button
  // ═══════════════════════════════════════════
  // Wait up to 30s for the "Entrer" / page-turn button to appear
  let introButtonFound = false
  for (let waitSec = 0; waitSec < 30; waitSec++) {
    const btn = await page.$('.g3d-intro-btn, .g3d-intro-go, .g3d-intro-flip')
    if (btn) {
      await shot(page, '04_intro_button_found')
      console.log(`[PLAYTEST] Intro button found after ${waitSec}s`)
      introButtonFound = true
      break
    }
    await page.waitForTimeout(1000)
  }
  if (!introButtonFound) {
    console.log('[PLAYTEST] WARNING: No intro button found after 30s — game may be stuck')
    await shot(page, '04_intro_button_NOT_found')
  }

  // Click through all intro pages until we enter the game
  for (let attempt = 0; attempt < 5; attempt++) {
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('.g3d-intro-btn')
      if (btn) { btn.click(); return btn.textContent.trim() }
      // Also try slim bar choices or any action button
      const keywords = ['entrer', 'continu', 'suivant', 'commencer', 'explorer']
      const all = document.querySelectorAll('button, .btn, .g3d-slim-choice')
      for (const el of all) {
        if (keywords.some(k => el.textContent.toLowerCase().includes(k))) {
          el.click(); return el.textContent.trim()
        }
      }
      return null
    })
    if (clicked) {
      console.log(`[PLAYTEST] Intro action ${attempt}: "${clicked}"`)
      await page.waitForTimeout(2000)
      await shot(page, `04_progress_${attempt}`)
    } else {
      console.log(`[PLAYTEST] No intro button at attempt ${attempt}`)
      await page.waitForTimeout(2000)
    }
  }

  // ═══════════════════════════════════════════
  // STEP 5: Check if we're in the 3D game
  // ═══════════════════════════════════════════
  await page.waitForTimeout(3000)
  await shot(page, '05_game_state')

  const gameState = await page.evaluate(() => {
    // Try to read game store state
    const storeEl = document.querySelector('#hud-overlay')
    const cardZone = document.querySelector('.card-zone, .card-3d, [class*="card"]')
    const factionBars = document.querySelectorAll('[class*="faction"]')
    const choiceZones = document.querySelectorAll('[class*="choice"], .choice-btn')

    return {
      hasHud: !!storeEl,
      hasCard: !!cardZone,
      factionCount: factionBars.length,
      choiceCount: choiceZones.length,
      visibleText: document.body.innerText.substring(0, 1000),
    }
  })
  console.log(`[PLAYTEST] Game state: HUD=${gameState.hasHud} Card=${gameState.hasCard} Factions=${gameState.factionCount} Choices=${gameState.choiceCount}`)

  // ═══════════════════════════════════════════
  // STEP 6: Play through encounters (if in game)
  // ═══════════════════════════════════════════
  for (let encounter = 0; encounter < 5; encounter++) {
    // Handle minigame overlay if present — click through it
    for (let wait = 0; wait < 15; wait++) {
      const dismissed = await page.evaluate(() => {
        // Click minigame elements (interactive items, canvas, grid items)
        const mgItems = document.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]')
        if (mgItems.length > 0) {
          mgItems[Math.floor(Math.random() * mgItems.length)].click()
          return 'minigame-click'
        }
        // Click minigame overlay to dismiss result screen
        const overlay = document.querySelector('.minigame-overlay, .mg-overlay, [style*="z-index: 60"], [style*="z-index:60"]')
        if (overlay) { overlay.click(); return 'overlay-click' }
        // Click any visible canvas (minigame canvas)
        const canvases = document.querySelectorAll('canvas')
        for (const c of canvases) {
          if (c.id !== 'canvas-3d' && c.offsetHeight > 0) {
            c.click(); return 'minigame-canvas-click'
          }
        }
        return null
      })
      if (!dismissed) break
      await page.waitForTimeout(500)
    }

    // Wait for choice bar or card to appear (up to 15s)
    let foundChoices = false
    for (let wait = 0; wait < 15; wait++) {
      const hasChoices = await page.evaluate(() => {
        const slim = document.querySelectorAll('.g3d-slim-choice')
        const choice = document.querySelectorAll('.choice-btn, [class*="choice"]')
        return slim.length > 0 || choice.length > 0
      })
      if (hasChoices) { foundChoices = true; break }
      await page.waitForTimeout(1000)
    }
    await shot(page, `06_encounter_${encounter}`)

    // Click choice via canvas raycast (simulate click on choice zones of 3D card)
    const choice = await page.evaluate(() => {
      // Try DOM choices first (slim bar if present)
      const slimChoices = document.querySelectorAll('.g3d-slim-choice')
      if (slimChoices.length > 0) {
        const idx = Math.floor(Math.random() * slimChoices.length)
        slimChoices[idx].click()
        return `slim-${idx} of ${slimChoices.length}: "${slimChoices[idx].textContent.trim()}"`
      }
      // Raycast on canvas: click choice zone (bottom-left of screen = choice area)
      const canvas = document.querySelector('#canvas-3d')
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        // Choice zones are on the left side of screen (where card is), bottom third
        const choiceIdx = Math.floor(Math.random() * 3)
        const yOffsets = [0.55, 0.67, 0.80] // top/mid/bottom choice on card
        const x = rect.left + rect.width * 0.22 // card is left-side
        const y = rect.top + rect.height * yOffsets[choiceIdx]
        canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }))
        return `raycast-choice-${choiceIdx}`
      }
      return null
    })
    console.log(`[PLAYTEST] Encounter ${encounter}: ${choice || 'no-choice-found (waiting)'}`)

    await page.waitForTimeout(2000)
    await shot(page, `06_encounter_${encounter}_after_choice`)
  }

  // ═══════════════════════════════════════════
  // STEP 7: Final state
  // ═══════════════════════════════════════════
  await shot(page, '07_final_state')

  // ═══════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════
  const report = {
    consoleErrors,
    consoleWarnings: consoleWarnings.slice(0, 20),
    screenshotCount: fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).length,
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('[PLAYTEST REPORT]')
  console.log(`  Screenshots: ${report.screenshotCount}`)
  console.log(`  Console errors: ${consoleErrors.length}`)
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => console.log(`    ERROR ${i}: ${e.substring(0, 200)}`))
  }
  console.log(`  Console warnings: ${consoleWarnings.length}`)
  console.log('═══════════════════════════════════════════\n')

  // Save report as JSON
  fs.writeFileSync(`${SHOTS}/report.json`, JSON.stringify(report, null, 2))
})

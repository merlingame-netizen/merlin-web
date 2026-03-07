// M.E.R.L.I.N. — Web Entry Point
// Three.js CRT background + HTML overlay game UI

import './ui/styles.css'
import { CRTScene } from './three/crt_scene.js'
import { GameUI, buildHTML } from './ui/game_ui.js'
import { getState, dispatch, subscribe } from './game/store.js'
import { generateCard, generateEffects } from './llm/groq_client.js'
import { listSlots } from './game/save_system.js'
import { SEASONS, BIOMES } from './game/constants.js'

// ── Init HTML structure ──────────────────────────────────────────────────────
buildHTML()

// ── Three.js CRT background ──────────────────────────────────────────────────
const canvas = document.getElementById('canvas-bg')
const crt = new CRTScene(canvas)

// ── Game UI controller ───────────────────────────────────────────────────────
const ui = new GameUI()

// ── State subscription ───────────────────────────────────────────────────────
subscribe((state) => ui.render(state))

// ── Event handlers ───────────────────────────────────────────────────────────

// New game
document.getElementById('btn-new-run')?.addEventListener('click', () => startNewRun())
document.getElementById('btn-new-run-after')?.addEventListener('click', () => startNewRun())

// Continue (autosave slot 0)
document.getElementById('btn-continue')?.addEventListener('click', () => {
  const slots = listSlots()
  if (slots[0]) {
    dispatch('LOAD_SLOT', { slot: 0 })
    ui.render(getState())
    if (getState().phase === 'game') _drawNextCard()
  } else {
    startNewRun()
  }
})

// Load
document.getElementById('btn-load')?.addEventListener('click', () => {
  showSaveLoadScreen()
})

// Save game
document.getElementById('btn-save-game')?.addEventListener('click', () => {
  dispatch('SAVE_SLOT', { slot: 0 })
  _flashMessage('Sauvegardé !')
})

// Quit to menu
document.getElementById('btn-quit')?.addEventListener('click', () => {
  dispatch('SAVE_SLOT', { slot: 0 })
  dispatch('SET_PHASE', { phase: 'menu' })
  ui.render(getState())
})

// Menu after ending
document.getElementById('btn-menu-after')?.addEventListener('click', () => {
  dispatch('SET_PHASE', { phase: 'menu' })
  ui.render(getState())
})

// Choice handler
ui.onChoice(async (optionIndex) => {
  const state = getState()
  const card = state.run.current_card
  if (!card || !card._effects) return

  const effects = card._effects[`effects_${optionIndex}`] ?? []
  dispatch('RESOLVE_CHOICE', { option_index: optionIndex, effects })

  const newState = getState()
  ui.render(newState)

  // Draw next card if still in game
  if (newState.phase === 'game') {
    await _drawNextCard()
  }
})

// ── Game flow ────────────────────────────────────────────────────────────────

async function startNewRun() {
  dispatch('NEW_RUN')
  ui.render(getState())
  await _drawNextCard()
}

async function _drawNextCard() {
  ui.showCardLoading(true)

  const state = getState()
  const ctx = _buildContext(state)

  // Generate card text (Narrator LLM)
  const card = await generateCard(ctx)

  // Generate effects (GM LLM)
  const effects = await generateEffects(card, ctx)
  card._effects = effects

  dispatch('SET_CARD', { card })
  ui.showCardLoading(false)
  ui.render(getState())
}

function _buildContext(state) {
  const { run } = state
  return {
    triade:  run.triade,
    souffle: run.souffle,
    day:     run.day,
    season:  SEASONS[run.season_index % SEASONS.length],
    biome:   BIOMES[run.biome_index % BIOMES.length],
    tags:    run.active_tags ?? [],
    cards_played: run.cards_played,
  }
}

function showSaveLoadScreen() {
  const slots = listSlots()
  ui.showSaveScreen(slots, (slotIndex) => {
    ui.hideSaveScreen()
    if (slots[slotIndex]) {
      dispatch('LOAD_SLOT', { slot: slotIndex })
      ui.render(getState())
      if (getState().phase === 'game') _drawNextCard()
    } else {
      startNewRun()
    }
  }, () => ui.hideSaveScreen())
}

function _flashMessage(msg) {
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:200;
    background:rgba(10,26,10,0.9);border:1px solid var(--phosphor);
    color:var(--phosphor);font-family:var(--font);font-size:1em;
    padding:10px 18px;animation:blink 0.5s step-end 3;
  `
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2000)
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  ui.showLoading(true)

  // Simulate boot sequence
  await new Promise(r => setTimeout(r, 1800))

  ui.showLoading(false)
  dispatch('SET_PHASE', { phase: 'menu' })
  ui.render(getState())
}

boot()

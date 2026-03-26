// M.E.R.L.I.N. — Web Entry Point
// SceneRouter-based flow: intro -> quiz -> rencontre -> hub -> transition -> game -> ending
// Phase 1: RenderManager + MenuScene3D + LLM Pre-warm

import './ui/styles.css'
import './ui/styles_scenes.css'
import * as THREE from 'three'
import { RenderManager } from './three/render_manager.js'
import { BookCinematic } from './three/book_cinematic.js'
import { MenuScene3D } from './three/menu_scene_3d.js'
import { checkLLMHealth, onStatusChange, prewarmCard, prewarmMultiple, getPrewarmedCardOrFallback, getPrewarmedCard, clearPrewarmedCard } from './llm/prewarm.js'
import { generateScenario, getNextScenarioCard, hasCardsRemaining, cardsRemaining, prefetchNextScenario, clearScenario, getScenarioTitle, getScenarioIntro, getPathEvents } from './llm/scenario_generator.js'
import { getState, dispatch } from './game/store.js'
import { FACTIONS, FACTION_INFO } from './game/constants.js'
import { generateCard, generateEffects } from './llm/groq_client.js'
import { getFallbackCard } from './data/fallback_cards.js'
import { listSlots } from './game/save_system.js'

import { SceneRouter } from './scenes/scene_router.js'
import { MenuScreen } from './scenes/menu_screen.js'
import { TalkMerlin } from './scenes/talk_merlin.js'
import { IntroCeltOS } from './scenes/intro_celtos.js'
import { PersonalityQuiz } from './scenes/personality_quiz.js'
import { RencontreMerlin } from './scenes/rencontre_merlin.js'
import { HubAntre } from './scenes/hub_antre.js'
import { TransitionBiome } from './scenes/transition_biome.js'
import { GameScene } from './scenes/game_scene.js'
import { GameScene3D } from './scenes/game_scene_3d.js'
import { EndingScreen } from './scenes/ending_screen.js'

import { BestioleWheel } from './ui/bestiole_wheel.js'
import { MinigameOverlay } from './ui/minigame_overlay.js'

// VFX helpers
function vfxFlash(type = 'damage') {
  const el = document.createElement('div')
  el.className = `vfx-flash ${type}`
  document.body.appendChild(el)
  el.addEventListener('animationend', () => el.remove())
}
function vfxShake() {
  const canvas = document.getElementById('canvas-3d')
  if (canvas) { canvas.classList.add('vfx-shake'); setTimeout(() => canvas.classList.remove('vfx-shake'), 300) }
}
import { detectMinigame } from './game/minigame_registry.js'
import { resolveMinigame } from './game/minigame_system.js'
import { playInteractiveMinigame } from './game/interactive_minigames.js'
import { SFX } from './audio/sfx_manager.js'
import { getBiome as getBiomeData } from './game/biome_system.js'
import { ArbreDeVie } from './scenes/arbre_de_vie.js'
import { Collection } from './scenes/collection.js'
import { loadMeta } from './game/save_system.js'
import { setLanguage } from './i18n/i18n.js'

// Phase 6 — Registries
import { createProfile, updateProfile, getProfileContextForLLM } from './registries/player_profile.js'
import { createHistory, recordDecision, getPatternForLLM } from './registries/decision_history.js'
import { createRelationship, updateRelationship, getRelationshipContextForLLM } from './registries/relationship.js'
import { createNarrative, tickNarrative, getNarrativeContextForLLM } from './registries/narrative.js'
import { createSession, recordCardPlayed, getSessionContextForLLM } from './registries/session.js'
import { createDifficultyState, updateDifficulty, getDifficultyContextForLLM } from './llm/difficulty_adapter.js'
import { setRegistries, buildNarratorContext } from './llm/context_builder.js'

// ── Phase 6: Registry State ─────────────────────────────────────────────────
let _profile = createProfile()
let _decisionHistory = createHistory()
let _relationship = createRelationship()
let _narrative = createNarrative()
let _session = createSession()
let _difficulty = createDifficultyState()
let _lastMinigameScore = 0

function _syncRegistries() {
  setRegistries({
    profile: { getProfileContextForLLM },
    profileData: _profile,
    decisions: { getPatternForLLM },
    decisionData: _decisionHistory,
    relationship: { getRelationshipContextForLLM },
    relationshipData: _relationship,
    narrative: { getNarrativeContextForLLM },
    narrativeData: _narrative,
    session: { getSessionContextForLLM },
    sessionData: _session,
    difficulty: true,
    difficultyData: _difficulty,
  })
}
_syncRegistries()

// ── Init HTML structure ──────────────────────────────────────────────────────
document.body.innerHTML = `
  <canvas id="canvas-3d"></canvas>
  <div id="hud-overlay"></div>
  <div id="loading-overlay">
    <div class="loading-logo">M.E.R.L.I.N.</div>
    <div class="loading-text">Chargement...</div>
  </div>
  <div id="scene-container"></div>
`

// ── Three.js RenderManager + Menu 3D ─────────────────────────────────────────
const canvas = document.getElementById('canvas-3d')
const renderManager = new RenderManager(canvas)
window.addEventListener('beforeunload', () => renderManager.dispose())
const menuScene3D = new MenuScene3D()

// Activate menu 3D scene immediately
renderManager.setActiveScene(
  menuScene3D.getScene(),
  menuScene3D.getCamera(),
  (dt, elapsed) => menuScene3D.update(dt, elapsed)
)

// ── LLM Status Badge (DOM overlay) ───────────────────────────────────────────
const hudOverlay = document.getElementById('hud-overlay')
const statusBadge = document.createElement('div')
statusBadge.className = 'llm-status-badge'
statusBadge.innerHTML = `<span class="llm-status-dot"></span><span class="llm-status-text">LLM: connexion...</span>`
hudOverlay.appendChild(statusBadge)

const statusDot = statusBadge.querySelector('.llm-status-dot')
const statusText = statusBadge.querySelector('.llm-status-text')

onStatusChange((status) => {
  menuScene3D.setLLMStatus(status)
  statusDot.className = `llm-status-dot ${status}`
  const labels = { connecting: 'LLM: connexion...', ok: 'LLM: prêt', slow: 'LLM: lent', error: 'LLM: erreur' }
  statusText.textContent = labels[status] ?? 'LLM: ???'
})

// ── Scene Router ───────────────────────────────────────────────────────────
const container = document.getElementById('scene-container')
const router = new SceneRouter(container)

// ── Bestiole Wheel + Minigame Overlay ────────────────────────────────────
const bestioleWheel = new BestioleWheel((oghamId) => {
  dispatch('ACTIVATE_OGHAM', { ogham_id: oghamId })
  SFX.oghamActivate()
  const s = getState()
  _flashMessage(`Ogham ${oghamId} activé!`)
  router.navigate('game', s)
})

const minigameOverlay = new MinigameOverlay()

// ── Helper: manage 3D scene vs DOM scene ──────────────────────────────────
function _show3D() {
  renderManager.resume()
  canvas.style.display = 'block'
}

function _hide3D() {
  renderManager.pause()
}

// ── Scene instances ────────────────────────────────────────────────────────

const menuScene = new MenuScreen(
  () => startFirstRun(),
  () => {
    const slots = listSlots()
    if (slots[0]) {
      dispatch('LOAD_SLOT', { slot: 0 })
      const s = getState()
      if (s.phase === 'game') {
        _hide3D()
        router.navigate('game', s)
        _drawNextCard()
      } else {
        _hide3D()
        router.navigate('hub', s)
      }
    } else {
      startFirstRun()
    }
  },
  () => showSaveLoadScreen(),
  () => {
    // Talk to Merlin
    _hide3D()
    router.navigate('talk-merlin', getState())
  }
)

const talkMerlinScene = new TalkMerlin(() => {
  _show3D()
  router.navigate('menu', getState())
})

const introScene = new IntroCeltOS(() => {
  dispatch('SET_PHASE', { phase: 'quiz' })
  router.navigate('quiz', getState())
})

const quizScene = new PersonalityQuiz((profile) => {
  dispatch('SET_PROFILE', { profile })
  dispatch('SET_PHASE', { phase: 'rencontre' })
  router.navigate('rencontre', getState())
})

const rencontreScene = new RencontreMerlin(() => {
  dispatch('SET_PHASE', { phase: 'hub' })
  router.navigate('hub', getState())
})

const hubScene = new HubAntre(
  (biomeKey) => {
    dispatch('SET_BIOME', { biome_key: biomeKey })
    dispatch('NEW_RUN', { biome_key: biomeKey, phase: 'transition', profile: getState().run.profile })
    // Reset per-run registries
    _narrative = createNarrative()
    _session = createSession()
    _difficulty = createDifficultyState()
    _syncRegistries()
    router.navigate('transition', getState())
  },
  () => {
    dispatch('SAVE_SLOT', { slot: 0 })
    _flashMessage('Sauvegardé !')
  },
  () => {
    dispatch('SET_PHASE', { phase: 'menu' })
    _show3D()
    menuScene3D.setLLMStatus('ok')
    router.navigate('menu', getState())
  },
  () => {
    dispatch('SET_PHASE', { phase: 'tree' })
    router.navigate('tree', getState())
  },
  () => {
    dispatch('SET_PHASE', { phase: 'collection' })
    router.navigate('collection', getState())
  },
  // onBiomeSelect callback — trigger pre-warm
  (biomeKey) => {
    const state = getState()
    prewarmCard({ ...state, run: { ...state.run, biome_key: biomeKey } })
  }
)

const transitionScene = new TransitionBiome(async () => {
  dispatch('SET_PHASE', { phase: 'game' })
  // Generate scenario (5 cards) + prewarm fallback cards in parallel
  clearScenario()
  generateScenario(getState()).catch(e => console.warn('[Scenario] Init failed:', e?.message))
  prewarmMultiple(getState(), 2).catch(e => console.warn('[Prewarm] Multiple failed:', e?.message))

  // Wire encounter callback: PathCamera stops -> draw next card
  gameScene3D.setOnEncounterReached((_encounterIdx) => {
    _drawNextCard().catch(e => console.error('[Encounter] _drawNextCard failed:', e))
  })

  // Wire world interactable callback: objects in forest → heal/minigame
  gameScene3D.setOnWorldInteract(async (type, position) => {
    const state = getState()
    if (!state?.run) return
    switch (type) {
      case 'mushroom':
        dispatch('APPLY_EFFECTS', { effects: ['HEAL_LIFE:1'], source: 'WORLD_PICKUP' })
        SFX.heal?.()
        break
      case 'crystal':
        dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:3'], source: 'WORLD_PICKUP' })
        SFX.chime?.()
        break
      case 'chest': {
        const types = ['chance', 'observation', 'finesse', 'vigueur', 'esprit', 'perception']
        const mgType = types[Math.floor(Math.random() * types.length)]
        SFX.minigameStart?.()
        const result = await playInteractiveMinigame(mgType, { factions: state.run.factions })
        if (result.success) {
          dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:5'], source: 'CHEST_MINIGAME' })
          SFX.minigameSuccess?.()
        } else {
          dispatch('APPLY_EFFECTS', { effects: ['ADD_TENSION:5'], source: 'CHEST_MINIGAME' })
          SFX.minigameFail?.()
        }
        break
      }
      case 'rune':
        dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:2'], source: 'WORLD_PICKUP' })
        break
    }
  })

  try {
    await router.navigate('game3d', getState())
  } catch (e) {
    console.error('[Transition] Navigate to game3d failed:', e)
  }
  // No automatic card draw here — cards are drawn when PathCamera reaches encounter points
  // (first card is drawn when user clicks to start and camera reaches first encounter)
})

const gameScene = new GameScene(
  async (optionIndex) => {
    const state = getState()
    const card = state.run.current_card
    if (!card || !card._effects) return

    SFX.choiceSelect()
    const effects = card._effects[`effects_${optionIndex}`] ?? []
    dispatch('RESOLVE_CHOICE', { option_index: optionIndex, effects })

    // Update bond based on choice
    dispatch('UPDATE_BOND', {
      option_index: optionIndex,
      card_tags: card.tags ?? [],
    })

    // Tick cooldowns each turn
    dispatch('TICK_COOLDOWNS')

    // Update Phase 6 registries
    const choiceLabel = card.choices?.[optionIndex]?.label ?? ''
    _profile = updateProfile(_profile, optionIndex, card.text ?? '', choiceLabel)
    _decisionHistory = recordDecision(_decisionHistory, { option: optionIndex, card: card.title })
    _narrative = tickNarrative(_narrative, getState().run.cards_played, card.text ?? '')
    _session = recordCardPlayed(_session)
    _difficulty = updateDifficulty(_difficulty, { type: 'choice' })
    _syncRegistries()

    // Check for minigame trigger from card text
    const mg = detectMinigame(card.text ?? '', card.choices ?? [])
    if (mg) {
      const newState = getState()
      const context = {
        factions: newState.run.factions,
        souffle: newState.run.souffle,
        bond: newState.bestiole.bond,
        difficulty: 0,
        biome_key: newState.run.biome_key,
      }
      SFX.minigameStart()
      const result = await playInteractiveMinigame(mg.type, context)

      // Apply minigame result effects
      if (result.success) {
        result.critical ? SFX.minigameCritical() : SFX.minigameSuccess()
        dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:5'], source: 'MINIGAME' })
        if (result.critical) {
          dispatch('APPLY_EFFECTS', { effects: ['ADD_SOUFFLE:1'], source: 'MINIGAME_CRIT' })
        }
        _difficulty = updateDifficulty(_difficulty, { type: 'heal' })
      } else {
        result.fumble ? SFX.minigameFumble() : SFX.minigameFail()
        dispatch('APPLY_EFFECTS', { effects: ['ADD_TENSION:10'], source: 'MINIGAME' })
        if (result.fumble) {
          dispatch('APPLY_EFFECTS', { effects: ['DAMAGE_LIFE:1'], source: 'MINIGAME_FUMBLE' })
        }
        _difficulty = updateDifficulty(_difficulty, { type: 'damage', amount: result.fumble ? 2 : 1 })
      }
      _syncRegistries()
    }

    const newState = getState()
    if (newState.phase === 'ending') {
      router.navigate('ending', newState)
    } else if (newState.phase === 'game') {
      await _drawNextCard()
    }
  },
  () => {
    dispatch('SAVE_SLOT', { slot: 0 })
    SFX.save()
    _flashMessage('Sauvegardé !')
  },
  () => {
    dispatch('SAVE_SLOT', { slot: 0 })
    dispatch('SET_PHASE', { phase: 'hub' })
    _hide3D()
    router.navigate('hub', getState())
  },
  () => {
    // Bestiole toggle callback
    bestioleWheel.toggle(getState())
  }
)

// ── 3D FPS Game Scene (Phase 2) ───────────────────────────────────────────
const gameScene3D = new GameScene3D(
  async (optionIndex, souffleBoost = false) => {
    try {
      const state = getState()
      const card = state.run.current_card
      if (!card) {
        console.error('[Game3D] GUARD: No card in state — choice ignored')
        return
      }
      if (!card._effects) {
        console.warn('[Game3D] GUARD: Card missing _effects — applying defaults:', card.id ?? card.title)
        card._effects = _defaultEffects()
      }

      console.log(`[Game3D] Processing choice ${optionIndex} for card:`, card.title)
      SFX.choiceSelect()

      // Consume souffle if player activated boost
      if (souffleBoost && state.run.souffle > 0) {
        dispatch('APPLY_EFFECTS', { effects: ['USE_SOUFFLE:1'], source: 'SOUFFLE_BOOST' })
      }

      let effects = card._effects[`effects_${optionIndex}`] ?? []

      // Modulate ALL numeric effects by minigame score (not just factions)
      if (_lastMinigameScore > 0) {
        const multiplier = Math.max(0.3, _lastMinigameScore / 50) // 0.3x-2.0x range
        effects = effects.map(e => {
          if (typeof e !== 'string') return e
          const parts = e.split(':')
          // Modulate effects with numeric last arg: SHIFT_FACTION:x:N, ADD_KARMA:N, ADD_TENSION:N, etc
          if (parts.length >= 3 && parts[0] === 'SHIFT_FACTION') {
            const val = parseInt(parts[2])
            if (!isNaN(val)) return `${parts[0]}:${parts[1]}:${Math.round(val * multiplier)}`
          } else if (parts.length >= 2) {
            const val = parseInt(parts[parts.length - 1])
            if (!isNaN(val) && ['ADD_KARMA', 'ADD_TENSION', 'ADD_ESSENCES', 'MODIFY_BOND'].includes(parts[0])) {
              parts[parts.length - 1] = String(Math.round(val * multiplier))
              return parts.join(':')
            }
          }
          return e
        })
        console.log(`[Game3D] Minigame score ${_lastMinigameScore} → multiplier ${multiplier.toFixed(2)}`)
        _lastMinigameScore = 0
      }

      console.log(`[Game3D] Effects for choice ${optionIndex}:`, effects)
      dispatch('RESOLVE_CHOICE', { option_index: optionIndex, effects })
      dispatch('UPDATE_BOND', { option_index: optionIndex, card_tags: card.tags ?? [] })
      dispatch('TICK_COOLDOWNS')

      // Play visual effects for each applied effect
      for (const eff of effects) {
        if (typeof eff === 'string') {
          if (eff.startsWith('SHIFT_FACTION:')) {
            const faction = eff.split(':')[1]?.toLowerCase()
            gameScene3D.playEffect('SHIFT_FACTION', faction)
          } else if (eff.startsWith('DAMAGE') || eff.startsWith('DAMAGE_LIFE')) {
            gameScene3D.playEffect('DAMAGE')
          } else if (eff.startsWith('HEAL') || eff.startsWith('ADD_LIFE')) {
            gameScene3D.playEffect('HEAL')
          } else if (eff.startsWith('ADD_SOUFFLE')) {
            gameScene3D.playEffect('ADD_SOUFFLE')
          } else if (eff.startsWith('ADD_TENSION')) {
            gameScene3D.playEffect('ADD_TENSION')
          }
        }
      }

      // Show effect feedback toasts to player
      _showEffectToasts(effects)

      const choiceLabel = card.choices?.[optionIndex]?.label ?? ''
      _profile = updateProfile(_profile, optionIndex, card.text ?? '', choiceLabel)
      _decisionHistory = recordDecision(_decisionHistory, { option: optionIndex, card: card.title })
      _narrative = tickNarrative(_narrative, getState().run.cards_played, card.text ?? '')
      _session = recordCardPlayed(_session)
      _difficulty = updateDifficulty(_difficulty, { type: 'choice' })
      _syncRegistries()

      // Minigame d20 detection
      const mg = detectMinigame(card.text ?? '', card.choices ?? [])
      if (mg) {
        const mgState = getState()
        const context = {
          factions: mgState.run.factions,
          souffle: mgState.run.souffle,
          bond: mgState.bestiole.bond,
          difficulty: 0,
          souffleBoost,
          biome_key: mgState.run.biome_key,
        }
        SFX.minigameStart()
        const result = await playInteractiveMinigame(mg.type, context)
        _lastMinigameScore = result.score ?? 50

        if (result.success) {
          result.critical ? SFX.minigameCritical() : SFX.minigameSuccess()
          dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:5'], source: 'MINIGAME' })
          if (result.critical) {
            dispatch('APPLY_EFFECTS', { effects: ['ADD_SOUFFLE:1'], source: 'MINIGAME_CRIT' })
            gameScene3D.playEffect('ADD_SOUFFLE')
            vfxFlash('success')
          }
          _difficulty = updateDifficulty(_difficulty, { type: 'heal' })
        } else {
          result.fumble ? SFX.minigameFumble() : SFX.minigameFail()
          dispatch('APPLY_EFFECTS', { effects: ['ADD_TENSION:10'], source: 'MINIGAME' })
          if (result.fumble) {
            // Grace period: no fumble damage for first 3 cards
            const cardsPlayed = getState().run?.cards_played ?? 0
            if (cardsPlayed >= 3) {
              dispatch('APPLY_EFFECTS', { effects: ['DAMAGE_LIFE:1'], source: 'MINIGAME_FUMBLE' })
              gameScene3D.playEffect('DAMAGE')
            } else {
              _flashMessage('Le destin te protège... pour l\'instant.')
            }
          }
          _difficulty = updateDifficulty(_difficulty, { type: 'damage', amount: result.fumble ? 2 : 1 })
        }
        _syncRegistries()
      }

      // Milestone reward every 5 cards
      const cardsNow = getState().run?.cards_played ?? 0
      if (cardsNow > 0 && cardsNow % 5 === 0) {
        _showMilestoneReward(cardsNow)
      }

      const newState = getState()
      if (newState.phase === 'ending') {
        // Dramatic death/victory transition
        const isDefeat = newState.run.ending?.type === 'defeat'
        await _playEndingTransition(isDefeat)
        router.navigate('ending', newState)
      } else if (newState.phase === 'game') {
        // 3D mode: walk resumes, PathCamera encounter callback triggers next card
        // Clear current card so render() doesn't re-show it
        dispatch('SET_CARD', { card: null })
        console.log('[Game3D] Choice resolved — walking to next encounter')
      }
    } catch (err) {
      console.error('[Game3D] _onChoice CRASH:', err)
      dispatch('SET_CARD', { card: null })
    }
  },
  () => { dispatch('SAVE_SLOT', { slot: 0 }); SFX.save(); _flashMessage('Sauvegardé !') },
  () => { dispatch('SAVE_SLOT', { slot: 0 }); dispatch('SET_PHASE', { phase: 'hub' }); router.navigate('hub', getState()) },
  () => { bestioleWheel.toggle(getState()) },
  renderManager
)

const endingScene = new EndingScreen(
  () => {
    dispatch('SET_PHASE', { phase: 'hub' })
    router.navigate('hub', getState())
  },
  () => {
    dispatch('SET_PHASE', { phase: 'menu' })
    _show3D()
    router.navigate('menu', getState())
  }
)

const treeScene = new ArbreDeVie(
  (nodeId) => {
    dispatch('UNLOCK_TREE_NODE', { node_id: nodeId })
    SFX.oghamActivate()
    router.navigate('tree', getState())
  },
  () => {
    dispatch('SET_PHASE', { phase: 'hub' })
    router.navigate('hub', getState())
  }
)

const collectionScene = new Collection(
  () => {
    dispatch('SET_PHASE', { phase: 'hub' })
    router.navigate('hub', getState())
  }
)

// ── Register scenes ────────────────────────────────────────────────────────
router.register('menu', menuScene)
router.register('talk-merlin', talkMerlinScene)
router.register('intro', introScene)
router.register('quiz', quizScene)
router.register('rencontre', rencontreScene)
router.register('hub', hubScene)
router.register('transition', transitionScene)
router.register('game', gameScene)
router.register('game3d', gameScene3D)
router.register('ending', endingScene)
router.register('tree', treeScene)
router.register('collection', collectionScene)

// ── Game flow ──────────────────────────────────────────────────────────────

function _showLoadingScreen() {
  const el = document.createElement('div')
  el.id = 'merlin-loading'
  el.style.cssText = 'position:fixed;inset:0;z-index:100;background:#d4c5a0;overflow:hidden;'

  const cv = document.createElement('canvas')
  const W = 600, H = 800
  cv.width = W; cv.height = H
  cv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:90vw;max-height:90vh;'
  el.appendChild(cv)
  document.body.appendChild(el)

  const cx = cv.getContext('2d')
  let t = 0, rafId = 0

  // Generate 12 path segments with 3 forks + 25 event positions
  const pathPts = []
  const eventDots = []
  let px = 300, py = 740
  for (let i = 0; i < 12; i++) {
    const nx = 80 + Math.random() * 440
    const ny = py - 45 - Math.random() * 30
    pathPts.push({
      x: px, y: py,
      cx1: px + (Math.random() - 0.5) * 60, cy1: py - 20,
      cx2: nx + (Math.random() - 0.5) * 60, cy2: ny + 20,
      isBranch: false,
    })
    // Forks at positions 3, 7, 10
    if (i === 3 || i === 7 || i === 10) {
      const forkX = nx + (Math.random() > 0.5 ? 70 : -70)
      eventDots.push({ x: nx, y: ny, type: 'fork', r: 0, appear: i * 0.4 })
      pathPts.push({ x: nx, y: ny, cx1: nx + 15, cy1: ny - 15, cx2: forkX, cy2: ny - 45, isBranch: true })
    }
    // Events every segment
    eventDots.push({
      x: nx + (Math.random() - 0.5) * 20, y: ny + (Math.random() - 0.5) * 10,
      type: 'event', r: 0, appear: i * 0.4 + 0.2,
    })
    px = nx; py = ny
  }

  // Biome colors for painting phase
  const biomeColors = [
    { r: 80, g: 140, b: 60 },  // forest green
    { r: 60, g: 120, b: 80 },  // deep green
    { r: 100, g: 150, b: 70 }, // light green
    { r: 70, g: 90, b: 50 },   // dark moss
  ]

  const drawFrame = () => {
    t += 0.016
    const phase1End = 2      // parchment appears
    const phase2End = 6      // paths draw
    const phase3End = 8.5    // biome painting
    const phase4End = 10     // fade to dark

    // ═══ PHASE 1: Parchment base (0-2s) ═══
    // Background
    cx.fillStyle = '#d4c5a0'
    cx.fillRect(0, 0, W, H)
    // Aged noise (less per frame for perf)
    if (Math.random() > 0.7) {
      for (let i = 0; i < 30; i++) {
        cx.fillStyle = `rgba(${110 + Math.random() * 40}, ${90 + Math.random() * 30}, ${55 + Math.random() * 25}, 0.03)`
        cx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 2 + Math.random() * 5)
      }
    }
    // Border
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 3; cx.strokeRect(12, 12, W - 24, H - 24)
    cx.strokeStyle = '#9a8050'; cx.lineWidth = 1; cx.strokeRect(20, 20, W - 40, H - 40)

    // Title (fade in)
    const titleAlpha = Math.min(1, t / 1.5)
    cx.globalAlpha = titleAlpha
    cx.fillStyle = '#3a2510'
    cx.font = 'bold 28px Georgia, serif'
    cx.textAlign = 'center'
    cx.fillText('M.E.R.L.I.N.', W / 2, 48)
    cx.font = '14px Georgia, serif'
    cx.fillStyle = '#6a5a40'
    cx.fillText('Forêt de Brocéliande', W / 2, 70)
    cx.globalAlpha = 1
    // ═══ PHASE 2: Path drawing (2-6s) ═══
    if (t > phase1End) {
      const pathT = Math.min(1, (t - phase1End) / (phase2End - phase1End))
      const segsToDraw = Math.floor(pathT * pathPts.length)
      const segFrac = (pathT * pathPts.length) % 1

      for (let i = 0; i < segsToDraw + 1 && i < pathPts.length; i++) {
        const p = pathPts[i]
        const frac = i < segsToDraw ? 1 : segFrac
        if (frac <= 0) continue

        cx.globalAlpha = p.isBranch ? 0.35 : 0.75
        cx.strokeStyle = p.isBranch ? '#8a7a55' : '#5a4a2a'
        cx.lineWidth = p.isBranch ? 1.5 : 2.5
        cx.beginPath(); cx.moveTo(p.x, p.y)
        const steps = Math.ceil(frac * 24)
        for (let s = 1; s <= steps; s++) {
          const st = s / 24, mt = 1 - st
          const nx = pathPts[i + 1]?.x ?? p.cx2, ny = pathPts[i + 1]?.y ?? p.cy2
          cx.lineTo(
            mt*mt*mt*p.x + 3*mt*mt*st*p.cx1 + 3*mt*st*st*p.cx2 + st*st*st*nx,
            mt*mt*mt*p.y + 3*mt*mt*st*p.cy1 + 3*mt*st*st*p.cy2 + st*st*st*ny
          )
        }
        cx.stroke()
      }
      cx.globalAlpha = 1

      // Event runes appear
      eventDots.forEach(d => {
        if (t > phase1End + d.appear) {
          d.r = Math.min(1, (t - phase1End - d.appear) * 1.5)
          const r = d.r * (d.type === 'fork' ? 7 : 4)
          // Glow ring
          cx.beginPath(); cx.arc(d.x, d.y, r + 4, 0, Math.PI * 2)
          cx.strokeStyle = d.type === 'fork' ? 'rgba(200,100,40,0.25)' : 'rgba(50,160,80,0.25)'
          cx.lineWidth = 2; cx.stroke()
          // Dot
          cx.beginPath(); cx.arc(d.x, d.y, r, 0, Math.PI * 2)
          cx.fillStyle = d.type === 'fork' ? '#cc6633' : '#33aa55'
          cx.fill()
        }
      })
    }

    // ═══ PHASE 3: Biome painting (6-8.5s) ═══
    if (t > phase2End) {
      const paintT = Math.min(1, (t - phase2End) / (phase3End - phase2End))
      // Watercolor sweep from bottom to top
      const paintY = H - paintT * (H - 80)
      for (let y = H - 30; y > paintY; y -= 6) {
        for (let x = 30; x < W - 30; x += 8) {
          const bc = biomeColors[Math.floor(Math.random() * biomeColors.length)]
          const dist = Math.abs(y - paintY)
          const alpha = Math.max(0, 0.06 - dist * 0.0003)
          cx.fillStyle = `rgba(${bc.r},${bc.g},${bc.b},${alpha})`
          cx.fillRect(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, 6 + Math.random() * 8, 6 + Math.random() * 8)
        }
      }
    }

    // ═══ PHASE 4: Fade to dark for 3D transition (8.5-10s) ═══
    if (t > phase3End) {
      const fadeT = Math.min(1, (t - phase3End) / (phase4End - phase3End))
      cx.fillStyle = `rgba(6,13,6,${fadeT * 0.95})`
      cx.fillRect(0, 0, W, H)

      // "Entering the forest..." text
      cx.globalAlpha = Math.min(1, fadeT * 2)
      cx.fillStyle = '#33ff66'
      cx.font = '18px Georgia, serif'
      cx.textAlign = 'center'
      cx.fillText('Entrez dans la forêt...', W / 2, H / 2)
      cx.globalAlpha = 1
    }

    // Status message (rotating)
    if (t < phase3End) {
      const msgs = [
        'Merlin trace les sentiers de votre destin...',
        'Les korrigans murmurent aux carrefours...',
        'Les runes s\'illuminent le long du chemin...',
        'La forêt se prépare à vous accueillir...',
        'Les factions observent votre arrivée...',
        'Le voile entre les mondes s\'amincit...',
      ]
      cx.fillStyle = '#6a5a40'
      cx.font = 'italic 13px Georgia, serif'
      cx.textAlign = 'center'
      cx.fillText(msgs[Math.floor(t / 1.8) % msgs.length], W / 2, H - 30)
    }

    // Progress bar
    const totalProgress = Math.min(1, t / phase4End)
    cx.fillStyle = 'rgba(90,74,48,0.15)'
    cx.fillRect(40, H - 12, W - 80, 3)
    cx.fillStyle = '#5a4a30'
    cx.fillRect(40, H - 12, (W - 80) * totalProgress, 3)

    if (t < phase4End) {
      rafId = requestAnimationFrame(drawFrame)
    }
  }

  rafId = requestAnimationFrame(drawFrame)
  el._raf = rafId
}

function _hideLoadingScreen() {
  const el = document.getElementById('merlin-loading')
  if (!el) return
  if (el._raf) cancelAnimationFrame(el._raf)
  // Fade to dark (transition to 3D)
  el.style.transition = 'opacity 1.2s ease-in-out'
  el.style.opacity = '0'
  setTimeout(() => el.remove(), 1200)
}

async function startFirstRun() {
  SFX.confirm()

  // ─── STEP 1: Fade menu to black (1.5s) ───
  const fadeOverlay = document.createElement('div')
  fadeOverlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:#000;opacity:0;transition:opacity 1.5s ease-in;'
  document.body.appendChild(fadeOverlay)
  requestAnimationFrame(() => { fadeOverlay.style.opacity = '1' })
  await new Promise(r => setTimeout(r, 1800)) // wait for fade complete

  // Now safe to switch scenes — screen is black
  _hide3D()
  // Hide menu DOM overlay completely
  document.querySelectorAll('.scene-menu, .scene-menu-3d-overlay').forEach(el => el.style.display = 'none')

  // Skip quiz/intro — go direct to game3d with Broceliande
  dispatch('NEW_RUN', { biome_key: 'broceliande', phase: 'game', profile: 'equilibre' })

  // Reset per-run registries
  _narrative = createNarrative()
  _session = createSession()
  _difficulty = createDifficultyState()
  _syncRegistries()

  // ─── STEP 2: Create book scene (while screen is black) ───
  const bookScene = new THREE.Scene()
  bookScene.background = new THREE.Color(0x0c0c10) // dark but not pure black
  const bookCam = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 20)
  bookCam.position.set(0, 1.8, 2.5)
  bookCam.lookAt(0, 0, 0)

  const bookCinematic = new BookCinematic(bookScene, bookCam, renderManager.getRenderer())

  // Activate book scene in renderer
  renderManager.setActiveScene(bookScene, bookCam, (dt) => bookCinematic.update(dt))
  renderManager.setPostProcessing(false)
  renderManager.resume()

  // ─── STEP 3: Fade FROM black to reveal book (2s) ───
  fadeOverlay.style.transition = 'opacity 2s ease-out'
  requestAnimationFrame(() => { fadeOverlay.style.opacity = '0' })
  setTimeout(() => fadeOverlay.remove(), 2200)

  // Start LLM generation in parallel
  clearScenario()
  const scenarioPromise = generateScenario(getState()).catch(e => {
    console.warn('[Scenario] Init:', e?.message)
    return false
  })

  // Feed LLM results progressively as they arrive
  scenarioPromise.then(success => {
    const title = success ? (getScenarioTitle() || 'Brocéliande') : 'Brocéliande'
    const intro = success
      ? (getScenarioIntro() || 'Les brumes de Brocéliande se lèvent lentement, dévoilant les racines noueuses des chênes millénaires.')
      : 'Les brumes de Brocéliande se lèvent lentement, dévoilant les racines noueuses des chênes millénaires. Le sentier s\'ouvre devant toi, étroit et sinueux. Merlin murmure dans le vent.'

    // Progress: title ready
    bookCinematic.onTitleReady(title)
    // Progress: intro ready (simulate progressive writing)
    bookCinematic.onIntroReady(intro)
    // Simulate streaming: increment scenario progress over 3s
    let streamProgress = 0
    const streamInterval = setInterval(() => {
      streamProgress += 0.05
      bookCinematic.onIntroProgress(Math.min(1, streamProgress))
      if (streamProgress >= 1) clearInterval(streamInterval)
    }, 150)

    // Progress: path events
    if (success) bookCinematic.onPathReady(getPathEvents())
    else bookCinematic.onPathReady([])
  }).catch(() => {
    bookCinematic.onTitleReady('Brocéliande')
    bookCinematic.onIntroReady('La forêt attend votre venue...')
    bookCinematic.onIntroProgress(1)
    bookCinematic.onPathReady([])
  })

  // Prewarm cards in background
  prewarmMultiple(getState(), 2).catch(e => console.warn('[Prewarm] Init:', e?.message))

  // Wait for book cinematic to complete (player clicks "Entrer" or skips)
  await new Promise(resolve => {
    bookCinematic.setOnComplete(() => {
      renderManager.pause()
      resolve()
    })
    // Safety timeout: 30s max
    setTimeout(() => { if (!bookCinematic.isDone()) bookCinematic.skip() }, 30000)
  })

  // Wire encounter callback: PathCamera stops → draw next card
  gameScene3D.setOnEncounterReached((_encounterIdx) => {
    _drawNextCard().catch(e => console.error('[Encounter] _drawNextCard failed:', e))
  })

  // Wire world interactable callback
  gameScene3D.setOnWorldInteract(async (type, position) => {
    const state = getState()
    if (!state?.run) return
    switch (type) {
      case 'mushroom':
        dispatch('APPLY_EFFECTS', { effects: ['HEAL_LIFE:1'], source: 'WORLD_PICKUP' })
        SFX.lifeGain()
        vfxFlash('heal')
        break
      case 'crystal':
        dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:3'], source: 'WORLD_PICKUP' })
        SFX.aspectUp()
        vfxFlash('success')
        break
      case 'chest': {
        const types = ['chance', 'observation', 'finesse', 'vigueur', 'esprit', 'perception']
        const mgType = types[Math.floor(Math.random() * types.length)]
        SFX.minigameStart()
        const result = await playInteractiveMinigame(mgType, { factions: state.run.factions })
        if (result.success) {
          dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:5'], source: 'CHEST_MINIGAME' })
          SFX.minigameSuccess()
          vfxFlash('success')
        } else {
          dispatch('APPLY_EFFECTS', { effects: ['ADD_TENSION:5'], source: 'CHEST_MINIGAME' })
          SFX.minigameFail()
        }
        break
      }
      case 'rune':
        dispatch('APPLY_EFFECTS', { effects: ['ADD_KARMA:2'], source: 'WORLD_PICKUP' })
        SFX.cardReveal()
        break
    }
  })

  dispatch('SET_PHASE', { phase: 'game' })
  router.navigate('game3d', getState())
}

// Detect which game scene is active
function _activeGameScene() {
  return router._activePhase === 'game3d' ? gameScene3D : gameScene
}

async function _drawNextCard() {
  const active = _activeGameScene()
  const phase = router._activePhase === 'game3d' ? 'game3d' : 'game'

  // For 3D mode: scenario-first, then prewarm fallback
  if (phase === 'game3d') {
    console.log('[Game3D] _drawNextCard: encounter reached, fetching card')
    active.showCardLoading(true)

    try {
      let card = null

      // 1. Try scenario card first
      if (hasCardsRemaining()) {
        card = getNextScenarioCard()
        if (card) {
          if (!card._effects) card._effects = _defaultEffects()
          // Prefetch next scenario when 1 card remaining
          if (cardsRemaining() <= 1) {
            prefetchNextScenario(getState())
          }
        }
      }

      // 2. Fallback: prewarm pipeline
      if (!card) {
        const safetyTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Safety timeout 8s')), 8000)
        )
        card = await Promise.race([
          getPrewarmedCardOrFallback(getState(), 5000),
          safetyTimeout
        ])
        // Also trigger scenario generation in background for future cards
        prefetchNextScenario(getState())
      }

      if (card) {
        if (!card._effects) card._effects = _defaultEffects()
        dispatch('SET_CARD', { card })
        SFX.cardReveal()
        console.log('[Game3D] Card dispatched:', card.title)
      } else {
        throw new Error('Card promise resolved to null')
      }
    } catch (err) {
      console.error('[_drawNextCard] Fast pipeline failed:', err)
      const emergency = {
        id: 'emergency_main',
        title: 'Un Moment de Calme',
        text: 'Le vent se tait. Les brumes t\'enveloppent un instant.',
        choices: [
          { label: 'Se reposer', preview: 'Recuperation' },
          { label: 'Mediter', preview: 'Reflexion' },
          { label: 'Continuer', preview: 'Avancer' },
        ],
        tags: ['recovery'],
        _effects: _defaultEffects(),
      }
      dispatch('SET_CARD', { card: emergency })
    } finally {
      active.showCardLoading(false)
      router.navigate(phase, getState())
    }
    return
  }

  // DOM mode: original sequential pipeline
  active.showCardLoading(true)

  // Check for pre-warmed card first
  const prewarmed = getPrewarmedCard()
  if (prewarmed) {
    clearPrewarmedCard()
    dispatch('SET_CARD', { card: prewarmed })
    SFX.cardReveal()
    active.showCardLoading(false)
    router.navigate(phase, getState())
    return
  }

  try {
    const state = getState()
    const card = await generateCard(state)

    let effects
    try {
      effects = await generateEffects(state, card)
    } catch {
      effects = _defaultEffects()
    }
    card._effects = effects

    dispatch('SET_CARD', { card })
    SFX.cardReveal()
  } catch (err) {
    console.error('[_drawNextCard] Card gen failed:', err)
    try {
      const fallback = getFallbackCard(buildNarratorContext(getState()))
      fallback._effects = _defaultEffects()
      dispatch('SET_CARD', { card: fallback })
    } catch (e2) {
      console.error('[_drawNextCard] Fallback also failed:', e2)
    }
  } finally {
    active.showCardLoading(false)
    router.navigate(phase, getState())
  }
}

function _defaultEffects() {
  return {
    effects_0: ['SHIFT_FACTION:druides:5', 'ADD_TENSION:5'],
    effects_1: ['SHIFT_FACTION:anciens:5', 'ADD_KARMA:10'],
    effects_2: ['SHIFT_FACTION:guerriers:5', 'MODIFY_BOND:5'],
  }
}

function showSaveLoadScreen() {
  const slots = listSlots()
  const desc = slots.map((s, i) =>
    s ? `${i + 1}: Carte ${s.cards_played} — Jour ${s.day}` : `${i + 1}: Vide`
  ).join('\n')
  const choice = prompt(`Emplacements:\n${desc}\n\nEntrer le numéro (1-3):`)
  const idx = parseInt(choice) - 1
  if (idx >= 0 && idx < 3 && slots[idx]) {
    dispatch('LOAD_SLOT', { slot: idx })
    const s = getState()
    _hide3D()
    router.navigate(s.phase === 'game' ? 'game' : 'hub', s)
    if (s.phase === 'game') _drawNextCard()
  }
}

function _showMilestoneReward(cardsPlayed) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;
    align-items:center;justify-content:center;pointer-events:none;
    background:radial-gradient(ellipse at center, rgba(255,200,50,0.1) 0%, transparent 60%);
    animation:fadeIn 0.5s;
  `
  const title = document.createElement('div')
  title.textContent = `✦ Étape ${cardsPlayed}/25 atteinte ✦`
  title.style.cssText = `color:#FFBF33;font:bold 20px 'VT323',monospace;margin-bottom:16px;text-shadow:0 0 10px rgba(255,191,51,0.4);`
  overlay.appendChild(title)

  const btnWrap = document.createElement('div')
  btnWrap.style.cssText = 'display:flex;gap:12px;pointer-events:auto;'

  const healBtn = document.createElement('button')
  healBtn.textContent = '♥ +1 Vie'
  healBtn.style.cssText = 'padding:10px 20px;border-radius:8px;background:rgba(4,8,4,0.9);border:1px solid #44cc44;color:#44cc44;font:14px VT323,monospace;cursor:pointer;'
  healBtn.addEventListener('click', () => {
    dispatch('APPLY_EFFECTS', { effects: ['HEAL_LIFE:1'], source: 'MILESTONE' })
    _flashMessage('♥ Vie restaurée!')
    try { SFX.lifeGain?.() } catch {}
    overlay.remove()
  })

  const factionBtn = document.createElement('button')
  const randomFaction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)]
  const fInfo = FACTION_INFO[randomFaction]
  factionBtn.textContent = `${fInfo.symbol} +10 ${fInfo.label}`
  factionBtn.style.cssText = `padding:10px 20px;border-radius:8px;background:rgba(4,8,4,0.9);border:1px solid ${fInfo.color};color:${fInfo.color};font:14px VT323,monospace;cursor:pointer;`
  factionBtn.addEventListener('click', () => {
    dispatch('APPLY_EFFECTS', { effects: [`SHIFT_FACTION:${randomFaction}:10`], source: 'MILESTONE' })
    _flashMessage(`${fInfo.symbol} +10 ${fInfo.label}!`)
    try { SFX.aspectUp?.() } catch {}
    overlay.remove()
  })

  btnWrap.appendChild(healBtn)
  btnWrap.appendChild(factionBtn)
  overlay.appendChild(btnWrap)
  document.body.appendChild(overlay)

  // Auto-dismiss after 8s if no choice
  setTimeout(() => { if (overlay.parentNode) { healBtn.click() } }, 8000)
}

function _playEndingTransition(isDefeat) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:150;pointer-events:none;
      background:${isDefeat ? 'radial-gradient(ellipse at center, rgba(80,0,0,0) 0%, rgba(60,0,0,0.8) 100%)' : 'radial-gradient(ellipse at center, rgba(255,220,100,0) 0%, rgba(255,200,50,0.4) 100%)'};
      opacity:0;transition:opacity 1.5s ease-in;
    `
    document.body.appendChild(overlay)

    // Text announcement
    const text = document.createElement('div')
    text.textContent = isDefeat ? 'Ton essence s\'éteint...' : 'La lumière t\'enveloppe...'
    text.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:151;
      color:${isDefeat ? '#ff4444' : '#ffcc44'};font:bold 28px Georgia,serif;
      text-shadow:0 0 20px ${isDefeat ? 'rgba(255,0,0,0.5)' : 'rgba(255,200,50,0.5)'};
      opacity:0;transition:opacity 1s 0.5s;pointer-events:none;
    `
    document.body.appendChild(text)

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      text.style.opacity = '1'
    })

    if (isDefeat) try { SFX.damage?.() } catch {}
    else try { SFX.confirm?.() } catch {}

    setTimeout(() => {
      overlay.remove()
      text.remove()
      resolve()
    }, 2500)
  })
}

function _showEffectToasts(effects) {
  if (!effects?.length) return
  const toasts = []
  for (const eff of effects) {
    if (typeof eff !== 'string') continue
    const parts = eff.split(':')
    const type = parts[0]
    if (type === 'SHIFT_FACTION' && parts[2]) {
      const val = parseInt(parts[2])
      const faction = parts[1]
      const label = faction.charAt(0).toUpperCase() + faction.slice(1)
      const sign = val >= 0 ? '+' : ''
      toasts.push({ text: `${sign}${val} ${label}`, color: val >= 0 ? '#33aa55' : '#cc4444', icon: val >= 0 ? '▲' : '▼' })
    } else if (type === 'DAMAGE_LIFE' || type === 'DAMAGE') {
      toasts.push({ text: `-${parts[1] || 1} Vie`, color: '#ff4444', icon: '♥' })
    } else if (type === 'HEAL_LIFE' || type === 'HEAL') {
      toasts.push({ text: `+${parts[1] || 1} Vie`, color: '#44cc44', icon: '♥' })
    } else if (type === 'ADD_KARMA') {
      toasts.push({ text: `+${parts[1]} Karma`, color: '#ffcc44', icon: '✦' })
    } else if (type === 'ADD_TENSION') {
      toasts.push({ text: `+${parts[1]} Tension`, color: '#cc6644', icon: '⚡' })
    }
  }
  // Stagger display
  toasts.forEach((t, i) => {
    setTimeout(() => {
      const el = document.createElement('div')
      el.textContent = `${t.icon} ${t.text}`
      el.style.cssText = `
        position:fixed;top:${40 + i * 36}%;left:50%;transform:translateX(-50%);z-index:200;
        color:${t.color};font:bold 18px 'VT323',monospace;
        text-shadow:0 0 8px ${t.color}66;
        pointer-events:none;opacity:1;
        transition:opacity 0.8s,transform 0.8s;
      `
      document.body.appendChild(el)
      // Float up and fade
      requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) translateY(-30px)'
        el.style.opacity = '0'
      })
      setTimeout(() => el.remove(), 1500)
    }, i * 200)
  })
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
  // Restore cross-run meta from localStorage
  const savedMeta = loadMeta()
  if (savedMeta) {
    const s = getState()
    Object.assign(s.meta, savedMeta)
    if (savedMeta.language) setLanguage(savedMeta.language)
  }

  // Start LLM health check in background (non-blocking) + initial pre-warm
  checkLLMHealth().then(() => {
    prewarmCard(getState())
  })

  const loading = document.getElementById('loading-overlay')
  await new Promise(r => setTimeout(r, 1500))
  if (loading) loading.classList.add('hidden')

  _show3D()
  dispatch('SET_PHASE', { phase: 'menu' })
  router.navigate('menu', getState())
}

boot()

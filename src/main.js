// M.E.R.L.I.N. — Web Entry Point
// SceneRouter-based flow: intro -> quiz -> rencontre -> hub -> transition -> game -> ending
// Phase 1: RenderManager + MenuScene3D + LLM Pre-warm

import './ui/styles.css'
import './ui/styles_scenes.css'
import { RenderManager } from './three/render_manager.js'
import { MenuScene3D } from './three/menu_scene_3d.js'
import { checkLLMHealth, onStatusChange, prewarmCard, prewarmMultiple, getPrewarmedCardOrFallback, getPrewarmedCard, clearPrewarmedCard } from './llm/prewarm.js'
import { generateScenario, getNextScenarioCard, hasCardsRemaining, cardsRemaining, prefetchNextScenario, clearScenario } from './llm/scenario_generator.js'
import { getState, dispatch, subscribe } from './game/store.js'
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

      // Modulate faction shifts by last minigame score (if any)
      if (_lastMinigameScore > 0) {
        const multiplier = Math.max(0.3, _lastMinigameScore / 50) // 0.3x-2.0x range
        effects = effects.map(e => {
          if (typeof e === 'string' && e.startsWith('SHIFT_FACTION:')) {
            const parts = e.split(':')
            if (parts.length >= 3) {
              const val = parseInt(parts[2])
              if (!isNaN(val)) return `${parts[0]}:${parts[1]}:${Math.round(val * multiplier)}`
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
            dispatch('APPLY_EFFECTS', { effects: ['DAMAGE_LIFE:1'], source: 'MINIGAME_FUMBLE' })
            gameScene3D.playEffect('DAMAGE')
          }
          _difficulty = updateDifficulty(_difficulty, { type: 'damage', amount: result.fumble ? 2 : 1 })
        }
        _syncRegistries()
      }

      const newState = getState()
      if (newState.phase === 'ending') {
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

  // Canvas for animated path drawing
  const cv = document.createElement('canvas')
  cv.width = 600; cv.height = 800
  cv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:90vw;max-height:90vh;'
  el.appendChild(cv)
  document.body.appendChild(el)

  const cx = cv.getContext('2d')
  let t = 0, pathProgress = 0, eventDots = [], rafId = 0

  // Generate random path points (Bézier curves)
  const pathPts = []
  let px = 300, py = 720
  for (let i = 0; i < 8; i++) {
    const nx = 100 + Math.random() * 400
    const ny = py - 60 - Math.random() * 40
    pathPts.push({ x: px, y: py, cx1: px + (Math.random() - 0.5) * 80, cy1: py - 30, cx2: nx + (Math.random() - 0.5) * 80, cy2: ny + 30 })
    // Fork branch at some points
    if (i === 2 || i === 5) {
      const forkX = nx + (Math.random() > 0.5 ? 80 : -80)
      eventDots.push({ x: nx, y: ny, type: 'fork', r: 0 })
      pathPts.push({ x: nx, y: ny, cx1: nx + 20, cy1: ny - 20, cx2: forkX, cy2: ny - 60, isBranch: true })
    }
    // Event markers
    if (i % 2 === 0) eventDots.push({ x: nx, y: ny, type: 'event', r: 0 })
    px = nx; py = ny
  }

  const drawFrame = () => {
    t += 0.016
    pathProgress = Math.min(1, t / 5) // 5s to draw full path

    // Parchment background with aged texture
    cx.fillStyle = '#d4c5a0'
    cx.fillRect(0, 0, 600, 800)
    // Subtle noise
    for (let i = 0; i < 200; i++) {
      cx.fillStyle = `rgba(${120 + Math.random() * 40}, ${100 + Math.random() * 30}, ${60 + Math.random() * 30}, 0.03)`
      cx.fillRect(Math.random() * 600, Math.random() * 800, 2 + Math.random() * 4, 2 + Math.random() * 4)
    }

    // Border
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 3; cx.strokeRect(15, 15, 570, 770)
    cx.strokeStyle = '#8a7040'; cx.lineWidth = 1; cx.strokeRect(22, 22, 556, 756)

    // Title
    cx.fillStyle = '#4a3520'
    cx.font = 'bold 32px "VT323", serif'
    cx.textAlign = 'center'
    cx.fillText('M.E.R.L.I.N.', 300, 55)
    cx.font = '16px "VT323", serif'
    cx.fillStyle = '#6a5a40'
    cx.fillText('Forêt de Brocéliande', 300, 80)

    // Animated path (ink drawing effect)
    const segsToDraw = Math.floor(pathProgress * pathPts.length)
    const segFrac = (pathProgress * pathPts.length) % 1

    cx.strokeStyle = '#5a4a30'
    cx.lineWidth = 2.5
    cx.setLineDash([])

    for (let i = 0; i < segsToDraw + 1 && i < pathPts.length; i++) {
      const p = pathPts[i]
      const frac = i < segsToDraw ? 1 : segFrac
      if (frac <= 0) continue

      cx.globalAlpha = p.isBranch ? 0.4 : 0.8
      cx.strokeStyle = p.isBranch ? '#7a6a50' : '#5a4a30'
      cx.lineWidth = p.isBranch ? 1.5 : 2.5

      // Draw partial Bézier
      cx.beginPath()
      cx.moveTo(p.x, p.y)
      const steps = Math.ceil(frac * 20)
      for (let s = 1; s <= steps; s++) {
        const st = s / 20
        const mt = 1 - st
        const bx = mt*mt*mt*p.x + 3*mt*mt*st*p.cx1 + 3*mt*st*st*p.cx2 + st*st*st*(pathPts[i+1]?.x ?? p.cx2)
        const by = mt*mt*mt*p.y + 3*mt*mt*st*p.cy1 + 3*mt*st*st*p.cy2 + st*st*st*(pathPts[i+1]?.y ?? p.cy2)
        cx.lineTo(bx, by)
      }
      cx.stroke()
    }
    cx.globalAlpha = 1

    // Event dots (appear with delay)
    eventDots.forEach((d, i) => {
      const appear = (i + 1) * 0.6 // staggered appearance
      if (t > appear) {
        d.r = Math.min(1, (t - appear) * 2)
        const r = d.r * (d.type === 'fork' ? 6 : 4)
        cx.beginPath(); cx.arc(d.x, d.y, r, 0, Math.PI * 2)
        cx.fillStyle = d.type === 'fork' ? '#cc6633' : '#33aa55'
        cx.fill()
        // Glow
        cx.beginPath(); cx.arc(d.x, d.y, r + 3, 0, Math.PI * 2)
        cx.strokeStyle = d.type === 'fork' ? 'rgba(204,102,51,0.3)' : 'rgba(51,170,85,0.3)'
        cx.lineWidth = 1; cx.stroke()
      }
    })

    // Status text
    cx.fillStyle = '#6a5a40'
    cx.font = '14px "VT323", serif'
    cx.textAlign = 'center'
    const messages = [
      'Merlin trace les sentiers de votre destin...',
      'Les korrigans murmurent aux carrefours...',
      'Les runes s\'illuminent le long du chemin...',
      'La forêt se prépare à vous accueillir...',
    ]
    cx.fillText(messages[Math.floor(t / 2) % messages.length], 300, 760)

    // Progress bar at bottom
    cx.fillStyle = 'rgba(90,74,48,0.2)'
    cx.fillRect(50, 775, 500, 4)
    cx.fillStyle = '#5a4a30'
    cx.fillRect(50, 775, 500 * pathProgress, 4)

    if (pathProgress < 1) {
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
  _hide3D()
  SFX.confirm()

  // Skip quiz/intro — go direct to game3d with Broceliande
  dispatch('NEW_RUN', { biome_key: 'broceliande', phase: 'game', profile: 'equilibre' })

  // Reset per-run registries
  _narrative = createNarrative()
  _session = createSession()
  _difficulty = createDifficultyState()
  _syncRegistries()

  // Show loading screen while LLM prepares cards
  _showLoadingScreen()

  // Pre-generate scenario + 2 cards (sequential to avoid Groq rate limit)
  clearScenario()
  const llmReady = (async () => {
    await generateScenario(getState()).catch(e => console.warn('[Scenario] Init:', e?.message))
    await prewarmMultiple(getState(), 2).catch(e => console.warn('[Prewarm] Init:', e?.message))
  })()
  await Promise.race([llmReady, new Promise(r => setTimeout(r, 8000))])
  _hideLoadingScreen()

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

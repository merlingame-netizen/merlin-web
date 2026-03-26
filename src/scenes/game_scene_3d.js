// M.E.R.L.I.N. — 3D Cinematic Game Scene
// v4: Full 3D encounter flow — eyelid iris, event assets, 3D card with raycasted choices

import * as THREE from 'three'

import { WorldScene } from '../three/world_scene.js'
import { PathCamera } from '../three/path_camera.js'
import { EncounterSpawner } from '../three/encounter_spawner.js'
import { EffectVisuals } from '../three/effect_visuals.js'
import { Card3D } from '../three/card_3d.js'
import { playEyelidOpen, playEyelidClose } from '../three/eyelid_effect.js'
import { spawnEventAsset, dismissEventAsset, matchAsset } from '../three/event_assets.js'
import { spawnEventProps, dismissEventProps, getEventType } from '../three/event_props.js'
import { updateTweens } from '../three/tween_engine.js'
import { startBiomeDrone, stopBiomeDrone, playEncounterSpawn, playEncounterDismiss } from '../audio/spatial_audio.js'
import { SFX } from '../audio/sfx_manager.js'
import { getIntroText, getSeasonName } from '../data/intro_texts.js'
import { getScenarioTitle, getScenarioIntro, getPathEvents } from '../llm/scenario_generator.js'
import { getLLMStatus, onStatusChange } from '../llm/prewarm.js'
import { getRealPeriod, getRealSeason } from '../three/lighting_system.js'
import { FACTIONS, FACTION_INFO } from '../game/constants.js'
import { getState } from '../game/store.js'

// Map card content to scene mood
function _cardToMood(card) {
  const tags = card.tags || []
  const text = (card.text || '').toLowerCase()
  if (tags.includes('danger') || text.includes('menace') || text.includes('combat') || text.includes('attaque')) return 'danger'
  if (text.includes('nuit') || text.includes('obscur') || text.includes('sombre') || text.includes('tenebres') || text.includes('ténèbres')) return 'dark'
  if (tags.includes('sacred') || text.includes('sacré') || text.includes('rituel') || text.includes('nemeton')) return 'sacred'
  if (text.includes('chemin') || text.includes('sentier') || text.includes('route') || text.includes('croisee') || text.includes('croisée')) return 'journey'
  if (text.includes('fete') || text.includes('fête') || text.includes('joie') || text.includes('rire') || text.includes('musique') || text.includes('banquet')) return 'festive'
  if (text.includes('froid') || text.includes('glace') || text.includes('hiver') || text.includes('brume')) return 'cold'
  if (tags.includes('recovery') || text.includes('repos') || text.includes('guéri') || text.includes('chaleur')) return 'warm'
  return 'neutral'
}

function _extractCreatureFromCard(card) {
  const text = (card.text || '').toLowerCase()
  const creatures = ['korrigan', 'loup', 'corbeau', 'esprit', 'sirène', 'géant', 'tuatha']
  for (const c of creatures) {
    if (text.includes(c)) return c === 'sirène' ? 'sirene' : c === 'géant' ? 'geant' : c
  }
  return null
}

export class GameScene3D {
  constructor(onChoice, onSave, onQuit, onBestiole, renderManager) {
    this._onChoice = onChoice
    this._onSave = onSave
    this._onQuit = onQuit
    this._onBestiole = onBestiole
    this._renderManager = renderManager
    this._onEncounterReached = null

    this._world = new WorldScene()
    this._pathCamera = null
    this._spawner = null
    this._effects = null
    this._el = null

    this._encounterActive = false
    this._cardLoading = false
    this._biomeKey = null
    this._started = false
    this._souffleActive = false
    this._llmUnsub = null
    this._introCleanup = null
    this._card3d = null
    this._eventProps = null // current encounter props (legacy event_props)
    this._currentAsset = null // current encounter asset (event_assets)
    this._encounterCard = null // 3D card for encounters
    this._introCard = null // 3D card for intro
    this._onWorldInteract = null
    this._cleanupRaycast = null
    this._scenarioTitle = null
  }

  setOnEncounterReached(fn) {
    this._onEncounterReached = fn
  }

  setOnWorldInteract(fn) {
    this._onWorldInteract = fn
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-game3d'
    this._el.innerHTML = `
      <div class="g3d-hud-top">
        <div class="g3d-factions" id="g3d-factions"></div>
        <div class="g3d-info" id="g3d-info"></div>
      </div>
      <div class="g3d-llm-panel" id="g3d-llm-panel">
        <div class="g3d-brain" id="g3d-brain-narrator">
          <span class="brain-dot narrator-dot"></span>
          <span class="brain-label">Narrateur</span>
        </div>
        <div class="g3d-brain" id="g3d-brain-gm">
          <span class="brain-dot gm-dot"></span>
          <span class="brain-label">Game Master</span>
        </div>
      </div>
      <div class="g3d-center" id="g3d-center"></div>
      <div class="g3d-bottom-hud">
        <div class="g3d-life-bar" id="g3d-life">
          <div class="g3d-life-label">Essence</div>
          <div class="g3d-life-hearts" id="g3d-hearts"></div>
        </div>
        <div class="g3d-souffle-bar" id="g3d-souffle">
          <div class="g3d-souffle-label">Souffle</div>
          <div class="g3d-souffle-orb" id="g3d-souffle-orb">◈</div>
        </div>
        <div class="g3d-progress-bar" id="g3d-progress">
          <div class="g3d-progress-fill" id="g3d-progress-fill"></div>
          <span class="g3d-progress-text" id="g3d-progress-text">0/25</span>
        </div>
      </div>
      <div class="g3d-sidebar">
        <button class="g3d-btn" id="g3d-save">[ Sauv ]</button>
        <button class="g3d-btn" id="g3d-quit">[ Hub ]</button>
        <!-- <button class="g3d-btn" id="g3d-bestiole">[ Bestiole ]</button> -->
      </div>
    `
    container.appendChild(this._el)

    this._el.querySelector('#g3d-save')?.addEventListener('click', () => this._onSave())
    this._el.querySelector('#g3d-quit')?.addEventListener('click', () => this._onQuit())
    // this._el.querySelector('#g3d-bestiole')?.addEventListener('click', () => this._onBestiole())

    // LLM status listener
    this._updateLLMPanel(getLLMStatus())
    this._llmUnsub = onStatusChange((s) => this._updateLLMPanel(s))
  }

  unmount() {
    this._pathCamera?.dispose()
    this._introCleanup?.()
    this._cleanupRaycast?.()
    this._card3d?.dismiss()
    this._encounterCard?.dismiss()
    this._introCard?.dismiss()
    // Cleanup pre-placed assets
    if (this._prePlacedAssets?.length) {
      const scene = this._world?.getScene()
      this._prePlacedAssets.forEach(a => { if (a?.group && scene) scene.remove(a.group) })
      this._prePlacedAssets = []
    }
    this._interactables?.clear()
    // Remove canvas pointer handler
    const canvas = this._renderManager._renderer?.domElement
    if (canvas && this._pointerHandler) {
      canvas.removeEventListener('pointerdown', this._pointerHandler)
      this._pointerHandler = null
    }
    this._el?.remove()
    this._el = null
    this._renderManager.setPostProcessing(false)
    this._renderManager.pause()
    this._started = false
    this._llmUnsub?.()
    stopBiomeDrone()
  }

  showCardLoading(loading) {
    this._cardLoading = loading
    const center = this._el?.querySelector('#g3d-center')
    if (center && !this._started) return
    if (center) {
      center.innerHTML = loading
        ? '<div class="g3d-loading">Merlin medite...</div>'
        : ''
    }
  }

  onEnter(state) {
    const biomeKey = state.run?.biome_key ?? 'broceliande'
    const seasonIndex = state.run?.season_index ?? 0
    const day = state.run?.day ?? 1

    // Store scenario title if available
    const scenarioTitle = getScenarioTitle()
    if (scenarioTitle) {
      this._scenarioTitle = scenarioTitle
    }

    // Create PathCamera — encounter callback directly triggers card draw (no PlotOrb)
    this._pathCamera = new PathCamera(this._world.getCamera(), (encounterIdx) => {
      console.log(`[Game3D] Encounter ${encounterIdx}/25 reached — drawing card`)
      this._onEncounterReached?.(encounterIdx)
    })
    this._pathCamera.setHeightFunction((x, z) => this._world.heightAt(x, z))
    this._pathCamera.configure(biomeKey)

    // Create world with path curve
    const pathCurve = this._pathCamera.getPath()
    if (biomeKey !== this._biomeKey) {
      this._biomeKey = biomeKey
      this._world.create(biomeKey, pathCurve)
    }

    // Apply time of day
    const now = new Date()
    const hour = now.getHours() + now.getMinutes() / 60
    this._world.setTimeOfDay(hour, seasonIndex)

    // Night blend for post-processing
    const sky = this._world.getSky()
    if (sky && this._renderManager._postProcessing) {
      this._renderManager._postProcessing.setNightBlend(sky.getNightBlend())
    }

    // Encounter system
    this._spawner = new EncounterSpawner(this._world.getScene())
    this._effects = new EffectVisuals(this._world.getCamera(), this._world.getScene())

    // Pre-place event assets along the path at encounter positions (visible during walk)
    this._prePlacedAssets = []
    this._prePlaceEventsOnPath(pathCurve, biomeKey)

    // 3D Card system (legacy single-instance for intro)
    this._card3d = new Card3D(this._world.getScene())

    // Interactive world objects — disabled: assets in scene are the interactables
    this._interactables = null

    // Canvas pointer handler — disabled (no separate interactable objects)
    this._pointerHandler = null

    // Approaching callback: spawn card 3D ahead before stopping
    this._pathCamera.setOnApproaching((idx, pointAhead) => {
      // Pre-spawn card mesh face-down ahead on path
      if (this._card3d) {
        this._card3d.spawn(pointAhead, { title: '...', text: '', choices: [], _faction: 'druides' })
      }
    })

    this._encounterActive = false
    this._started = false

    // Activate 3D rendering with post-processing
    this._renderManager.setPostProcessing(true)
    this._renderManager.setActiveScene(
      this._world.getScene(),
      this._world.getCamera(),
      (dt, elapsed) => this._update(dt, elapsed)
    )
    this._renderManager.resume()

    // Show intro with eyelid iris + 3D parchment card
    this._showGameIntro(biomeKey, seasonIndex, day)

    this.render(state)
  }

  /** 3D Game Intro: eyelid iris open, parchment card drops, "Entrer" button */
  async _showGameIntro(biomeKey, seasonIndex, day) {
    const center = this._el?.querySelector('#g3d-center')
    if (!center) return

    // 1. Iris opens (circular black -> reveals scene)
    await playEyelidOpen(2000)

    // 2. Get scenario intro text (from LLM or fallback)
    const scenarioIntro = getScenarioIntro()
    const introData = getIntroText(biomeKey, seasonIndex)
    let introText = scenarioIntro || (Array.isArray(introData) ? introData.join(' ') : String(introData))
    // Cap intro text to ~150 chars to keep typewriter under 5s at 30ms/char
    if (introText.length > 150) {
      const cutPoint = introText.lastIndexOf('.', 150)
      introText = introText.substring(0, cutPoint > 50 ? cutPoint + 1 : 150)
    }
    const scenarioTitle = this._scenarioTitle || 'Broceliande'

    // 3. Spawn a PARCHMENT card in 3D (drops from above)
    const cam = this._world.getCamera()
    const dir = new THREE.Vector3()
    cam.getWorldDirection(dir)
    const cardPos = cam.position.clone().add(dir.multiplyScalar(2.5))
    cardPos.y = cam.position.y - 0.1

    const introCardData = {
      title: scenarioTitle,
      text: introText,
      choices: [],
      _faction: 'druides',
      _style: 'parchment',
    }

    this._introCard = new Card3D(this._world.getScene(), cam, {
      position: cardPos,
      card: introCardData,
      parchment: true,
    })

    // Card drops from sky with bounce
    if (this._introCard.group) {
      SFX.cardDraw()
      await this._introCard.dropFromSky(cam.position)
      SFX.cardReveal()

      // Text writes on page 1
      // 80 chars/sec batched = ~2s for 150 chars, smooth rendering
      await this._introCard.animateText(introCardData, 80)

      // Scale pulse + edge glow when text finishes
      await Promise.all([
        this._introCard.pulseScale(),
        this._introCard.flashEdgeGlow(),
      ])
    }

    // Prewarm handled by startFirstRun() in main.js — no duplicate here

    // 4. Page-turning loop + final "Enter" button
    const totalPages = this._introCard?.pageCount || 1
    const showIntroButton = (isLast) => {
      const label = isLast ? 'Entrer dans la for\u00eat \u25B6' : 'Tourner la page \u25B6'
      const btnClass = isLast ? 'g3d-intro-go' : 'g3d-intro-flip'
      center.innerHTML = `
        <div class="g3d-intro-actions" style="position:fixed;bottom:20px;left:0;right:0;z-index:50;display:flex;justify-content:center;pointer-events:auto">
          <button class="g3d-intro-btn ${btnClass}" style="pointer-events:auto;cursor:pointer">${label}</button>
        </div>
      `
    }

    // Show first button
    showIntroButton(totalPages <= 1)

    // Wait for user to page through all pages then enter
    await new Promise(resolve => {
      const handleClick = async () => {
        const card = this._introCard
        if (!card) { resolve(); return }

        try { SFX.click() } catch (e) { /* ignore */ }

        if (!card.isLastPage) {
          // Flip to next page
          center.innerHTML = '' // hide button during flip
          await card.nextPage()
          try { SFX.cardReveal() } catch (e) { /* ignore */ }
          showIntroButton(card.isLastPage)
          // Re-attach listener
          center.querySelector('.g3d-intro-btn')?.addEventListener('click', handleClick, { once: true })
        } else {
          // Last page — enter the forest
          try { SFX.confirm() } catch (e) { /* ignore */ }
          try { SFX.transitionWhoosh() } catch (e) { /* ignore */ }
          if (card.flipOut) card.flipOut()
          else if (card.dismiss) card.dismiss()
          this._introCard = null
          center.innerHTML = ''
          resolve()
        }
      }
      center.querySelector('.g3d-intro-btn')?.addEventListener('click', handleClick, { once: true })
    })

    // 5. Start walking
    this._started = true
    this._pathCamera.startWalking()
    this._introCleanup = null
  }

  /** Fork choice — visual path split, player picks a direction */
  _showForkChoice() {
    this._encounterActive = true
    this._forkShown = true

    const forkPaths = [
      { label: 'Le sentier lumineux', mood: 'sacred', color: '#33ff66', icon: '✦' },
      { label: 'Le chemin des ombres', mood: 'danger', color: '#ff5533', icon: '◆' },
      { label: 'La voie des brumes', mood: 'mystic', color: '#4dd9cc', icon: '◈' },
    ]

    // Show fork UI as DOM overlay
    const container = document.createElement('div')
    container.id = 'fork-choice'
    container.style.cssText = `
      position:fixed;inset:0;z-index:35;display:flex;flex-direction:column;
      align-items:center;justify-content:center;pointer-events:none;
      background:radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);
    `

    const title = document.createElement('div')
    title.textContent = 'Le sentier se divise...'
    title.style.cssText = `
      color:#FFBF33;font:bold 24px 'VT323',monospace;margin-bottom:30px;
      text-shadow:0 0 12px rgba(255,191,51,0.4);pointer-events:none;
      animation: fadeIn 0.8s ease-out;
    `
    container.appendChild(title)

    const btnWrap = document.createElement('div')
    btnWrap.style.cssText = 'display:flex;gap:16px;pointer-events:auto;flex-wrap:wrap;justify-content:center;'

    forkPaths.forEach((path, i) => {
      const btn = document.createElement('button')
      btn.style.cssText = `
        padding:16px 24px;border-radius:10px;cursor:pointer;
        background:rgba(6,13,6,0.88);border:2px solid ${path.color};
        color:${path.color};font:16px/1.3 'VT323',monospace;
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        transition:transform 0.15s,box-shadow 0.15s;min-width:160px;
      `
      btn.innerHTML = `<span style="font-size:20px">${path.icon}</span><br>${path.label}`
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.08)'
        btn.style.boxShadow = `0 0 20px ${path.color}44`
        try { SFX.choiceHover?.() } catch {}
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)'
        btn.style.boxShadow = 'none'
      })
      btn.addEventListener('click', () => {
        try { SFX.choiceSelect?.() } catch {}
        // Apply fork mood to the world
        this._world.setMood(path.mood)
        // Remove fork UI
        container.remove()
        this._encounterActive = false
        // Resume walking
        this._pathCamera?.resumeAfterChoice()
        console.log(`[Fork] Player chose: ${path.label} (${path.mood})`)
      })
      btnWrap.appendChild(btn)
    })

    container.appendChild(btnWrap)
    document.body.appendChild(container)

    // Auto-dismiss after 15s if no choice
    setTimeout(() => {
      if (container.parentNode) {
        container.remove()
        this._encounterActive = false
        this._pathCamera?.resumeAfterChoice()
      }
    }, 15000)
  }

  /** Pre-place event assets along path — uses scenario path_events if available */
  _prePlaceEventsOnPath(pathCurve, biomeKey) {
    if (!pathCurve) return
    const scene = this._world.getScene()
    const heightFn = (x, z) => this._world.heightAt(x, z)

    // Use scenario path_events (from LLM) if available, else fallback pool
    const pathEvents = getPathEvents()
    const fallbackPool = [
      'menhir', 'dolmen', 'sacred_tree', 'altar', 'cairn',
      'torch', 'lantern', 'well', 'rune_stone', 'totem',
      'waterfall', 'cauldron', 'portal', 'spirit', 'deer',
    ]

    const encounterPoints = Array.from({ length: 25 }, (_, i) => 0.03 + i * 0.035)
    const count = Math.min(encounterPoints.length, 12)

    for (let i = 0; i < count; i++) {
      // Use scenario event tag if available, else cycle through pool
      const event = pathEvents[i]
      const assetTag = event?.tag || fallbackPool[i % fallbackPool.length]
      const t = event?.position || encounterPoints[i]

      const pos = pathCurve.getPointAt(Math.min(t, 0.999))
      const tangent = pathCurve.getTangentAt(Math.min(t, 0.999))

      // Alternate sides of path, closer for even indices
      const side = (i % 2 === 0) ? 1 : -1
      const dist = 2.5 + Math.random() * 2
      const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
      const assetPos = pos.clone().add(right.clone().multiplyScalar(side * dist))
      assetPos.y = heightFn(assetPos.x, assetPos.z) ?? 0

      const asset = spawnEventAsset(
        { tags: [assetTag], scene_tag: assetTag, _faction: 'druides' },
        assetPos, scene, heightFn
      )
      if (asset) this._prePlacedAssets.push(asset)
    }

    console.log(`[Game3D] Pre-placed ${this._prePlacedAssets.length} assets (${pathEvents.length} from scenario)`)
  }

  /** Update LLM dual-brain status panel */
  _updateLLMPanel(status) {
    const narratorDot = this._el?.querySelector('.narrator-dot')
    const gmDot = this._el?.querySelector('.gm-dot')
    if (!narratorDot || !gmDot) return

    const dotClass = status === 'ok' ? 'brain-ok' : (status === 'error' ? 'brain-error' : 'brain-connecting')
    narratorDot.className = `brain-dot narrator-dot ${dotClass}`
    gmDot.className = `brain-dot gm-dot ${dotClass}`
  }

  render(state) {
    if (!this._el) return
    const run = state.run

    // Faction reputation HUD
    const factionsEl = this._el.querySelector('#g3d-factions')
    if (factionsEl) {
      factionsEl.innerHTML = FACTIONS.map(f => {
        const rep = run.factions?.[f] ?? 50
        const info = FACTION_INFO[f]
        const barW = Math.max(2, rep)
        const status = rep >= 80 ? 'allié' : rep <= 20 ? 'hostile' : ''
        const statusBadge = status ? `<span class="g3d-faction-status" style="color:${rep >= 80 ? '#33ff66' : '#ff4444'}">${status}</span>` : ''
        return `<span class="g3d-faction-pip" style="color:${info.color}" title="${info.label}: ${rep}">
          <span class="g3d-faction-name">${info.symbol} ${info.label.slice(0, 6)}</span>
          <span class="g3d-faction-bar" style="width:${barW}%;background:${info.color}"></span>
          <span class="g3d-faction-val">${rep}</span>${statusBadge}
        </span>`
      }).join('')
    }

    // Info bar with real period/season
    const infoEl = this._el.querySelector('#g3d-info')
    if (infoEl) {
      const cardsInfo = `Carte ${run.cards_played ?? 0}/25`
      const period = getRealPeriod()
      const season = getRealSeason()
      infoEl.innerHTML = `
        <span style="color:#ffbe33">Jour ${run.day ?? 1} \u00B7 ${cardsInfo}</span>
        <span class="g3d-period-badge" style="color:#aaddaa;margin-left:8px;font-size:0.85em">${season} \u2014 ${period}</span>
      `
    }

    // Life essence hearts
    const heartsEl = this._el?.querySelector('#g3d-hearts')
    if (heartsEl) {
      const life = run.life_essence ?? 3
      const maxLife = 5
      const hearts = []
      for (let i = 0; i < maxLife; i++) {
        const filled = i < life
        hearts.push(`<span class="g3d-heart ${filled ? 'g3d-heart-full' : 'g3d-heart-empty'}">${filled ? '♥' : '♡'}</span>`)
      }
      heartsEl.innerHTML = hearts.join('')
    }

    // Souffle orb
    const souffleOrb = this._el?.querySelector('#g3d-souffle-orb')
    if (souffleOrb) {
      const hasSouffle = (run.souffle ?? 0) > 0
      souffleOrb.className = `g3d-souffle-orb ${hasSouffle ? 'g3d-souffle-active' : 'g3d-souffle-empty'}`
    }

    // Progress bar
    const progressFill = this._el?.querySelector('#g3d-progress-fill')
    const progressText = this._el?.querySelector('#g3d-progress-text')
    if (progressFill && progressText) {
      const cards = run.cards_played ?? 0
      const max = 25
      const pct = Math.min(100, Math.round(cards / max * 100))
      progressFill.style.width = pct + '%'
      progressText.textContent = `${cards}/${max}`
    }

    // Update period badge if it exists elsewhere
    const badge = this._el?.querySelector('.g3d-period-badge, #g3d-period')
    if (badge) {
      const period = getRealPeriod()
      const season = getRealSeason()
      badge.textContent = `${season} \u2014 ${period}`
    }

    // Store scenario title if available
    const scenarioData = state.run?.scenario
    if (scenarioData?.title) {
      this._scenarioTitle = scenarioData.title
    }

    // Show encounter or fork
    const card = run.current_card
    if (card && !this._encounterActive) {
      // Every 5th encounter = fork (visual path choice, no card)
      if (run.cards_played > 0 && run.cards_played % 5 === 0 && !this._forkShown) {
        this._showForkChoice()
      } else {
        this._forkShown = false
        this._showEncounter(card)
      }
    }
  }

  _update(dt, elapsed) {
    this._pathCamera?.update(dt)
    this._world?.update(dt, elapsed)
    this._effects?.update(dt)
    this._card3d?.update(elapsed)
    this._encounterCard?.update(elapsed)
    this._introCard?.update(elapsed)
    this._interactables?.update(elapsed, this._world?.getCamera()?.position)
    updateTweens()

    // Ambient whispers during walking (every ~8-12s)
    if (this._started && !this._encounterActive) {
      this._whisperTimer = (this._whisperTimer ?? 0) + dt / 1000
      if (this._whisperTimer > 8 + Math.random() * 4) {
        this._whisperTimer = 0
        this._showAmbientWhisper()
      }
    }
  }

  _showAmbientWhisper() {
    const whispers = [
      'Le vent murmure entre les branches...',
      'Une brindille craque sous tes pas.',
      'Des lucioles dansent au loin.',
      'L\'air sent la mousse et la terre humide.',
      'Un corbeau t\'observe depuis un chêne.',
      'Les feuilles bruissent d\'histoires anciennes.',
      'La brume s\'épaissit autour du sentier.',
      'Tu sens une présence bienveillante.',
      'Les racines dessinent des runes dans le sol.',
      'Un frisson parcourt la forêt.',
      'Les menhirs semblent veiller sur ton passage.',
      'L\'écho d\'un chant lointain effleure tes oreilles.',
    ]
    const text = whispers[Math.floor(Math.random() * whispers.length)]
    const el = document.createElement('div')
    el.textContent = text
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:25;
      color:rgba(200,210,180,0.5);font:italic 14px Georgia,serif;
      pointer-events:none;white-space:nowrap;
      opacity:0;transition:opacity 1.5s;
    `
    document.body.appendChild(el)
    requestAnimationFrame(() => { el.style.opacity = '1' })
    setTimeout(() => { el.style.opacity = '0' }, 3000)
    setTimeout(() => el.remove(), 4500)
  }

  async _showEncounter(card) {
    this._encounterActive = true

    const mood = _cardToMood(card)
    this._world.setMood(mood)

    // 1. Get camera position for asset and card placement
    const camPos = this._pathCamera?.getPosition() ?? this._world.getCamera().position
    const forward = this._pathCamera?.getForward()
    const scene = this._world.getScene()
    const heightFn = (x, z) => this._world.heightAt(x, z)

    // 2. Spawn contextual 3D asset — vary left/center/right of path
    const placements = ['left', 'center', 'right']
    const placement = placements[Math.floor(Math.random() * 3)]
    const cam = this._pathCamera?.getCamera() ?? this._world.getCamera()
    const camRef = cam.position.clone()
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize()
    fwd.y = 0
    fwd.normalize()
    const rightVec = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()

    let assetOffset
    switch (placement) {
      case 'left':
        assetOffset = fwd.clone().multiplyScalar(5).add(rightVec.clone().multiplyScalar(-3))
        break
      case 'right':
        assetOffset = fwd.clone().multiplyScalar(5).add(rightVec.clone().multiplyScalar(3))
        break
      default: // center
        assetOffset = fwd.clone().multiplyScalar(6)
        break
    }
    const assetPos = camRef.clone().add(assetOffset)
    this._currentAsset = spawnEventAsset(card, assetPos, scene, heightFn)

    // Also spawn legacy event props for creature types
    const propsPos = camPos.clone()
    if (forward) propsPos.add(forward.clone().multiplyScalar(5))
    this._eventProps = spawnEventProps(card, propsPos, scene, heightFn)

    // Creature spawn disabled — assets only
    // const evType = getEventType(card)
    // if (this._spawner && (evType === 'creature' || evType === 'glow')) { ... }

    // 3. Spawn encounter card in 3D — slightly off-center (not too far)
    let cardLateral
    switch (placement) {
      case 'left': cardLateral = 0.6; break     // card slightly right of center
      case 'right': cardLateral = -0.6; break   // card slightly left of center
      default: cardLateral = 0; break            // card centered
    }
    const cardPos = camRef.clone()
      .add(fwd.clone().multiplyScalar(2.5))
      .add(rightVec.clone().multiplyScalar(cardLateral))
    cardPos.y = camRef.y - 0.3 // Lower card so title isn't cut off at top

    const choices = card.choices || []
    card._faction = card._faction || (card.tags?.[0]) || 'druides'

    // Dismiss any pre-spawned placeholder card
    if (this._card3d) {
      this._card3d.dismiss()
    }

    this._encounterCard = new Card3D(scene, cam, {
      position: cardPos,
      card: card,
      choices: choices,
    })

    SFX.cardDraw()
    await this._encounterCard.flipIn(cam.position)
    // Scene-specific encounter sound based on card tags/mood
    const tags = card.tags ?? []
    if (tags.includes('creature') || tags.includes('animal')) SFX.encounterCreature?.()
    else if (tags.includes('sacred') || tags.includes('magic')) SFX.encounterSacred?.()
    else if (tags.includes('danger') || tags.includes('combat')) SFX.encounterDanger?.()
    else if (tags.includes('mystic') || tags.includes('spirit')) SFX.encounterMystic?.()
    else SFX.encounterNature?.() // default: nature ambiance

    // Scale pulse + edge glow after reveal
    await Promise.all([
      this._encounterCard.pulseScale(),
      this._encounterCard.flashEdgeGlow(),
    ])

    // 4. Setup raycasting for choice selection on the 3D card
    this._setupCardRaycast(card)

    // 5. Projected DOM buttons over the card's choice zones (reliable click fallback)
    this._showProjectedChoiceButtons(card, choices)
  }

  /** Raycasting for clicking choices on the 3D card */
  _setupCardRaycast(card) {
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    this._choiceMade = false

    // Helper: raycast to card and return choice index + UV
    const _raycastToCard = (clientX, clientY) => {
      const rect = this._renderManager?._renderer?.domElement?.getBoundingClientRect()
      if (!rect) return -1
      if (clientX == null || clientY == null) return -1

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, this._world.getCamera())

      const cardGroup = this._encounterCard?.group
      if (!cardGroup) return -1

      const intersects = raycaster.intersectObject(cardGroup, true)
      if (intersects.length > 0 && intersects[0].uv) {
        return this._encounterCard.getChoiceAtUV(intersects[0].uv)
      }
      return -1
    }

    // Hover: highlight choice zone on mousemove
    const onMove = (event) => {
      if (this._choiceMade || !this._encounterCard) return
      const choiceIdx = _raycastToCard(event.clientX, event.clientY)
      this._encounterCard.highlightChoice(choiceIdx)
    }

    const onClick = (event) => {
      if (this._choiceMade) return

      const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX
      const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY
      const choiceIdx = _raycastToCard(clientX, clientY)

      if (choiceIdx >= 0) {
        this._choiceMade = true
        // Clear hover highlight
        this._encounterCard?.highlightChoice(-1)
        // SFX
        try { SFX.choiceSelect() } catch (e) { /* ignore */ }
        // Flash white confirm
        this._encounterCard?.flashChoiceConfirm()
        // Remove listeners
        this._cleanupRaycast?.()
        // Clear fallback timer
        if (this._choiceFallbackTimer) {
          clearTimeout(this._choiceFallbackTimer)
          this._choiceFallbackTimer = null
        }
        // Process choice (slight delay for flash to register)
        setTimeout(() => this._handleChoice(choiceIdx), 100)
      }
    }

    // Touch support
    const onTouch = (event) => {
      if (event.changedTouches?.length) {
        const touch = event.changedTouches[0]
        onClick({ clientX: touch.clientX, clientY: touch.clientY })
      }
    }

    // Keyboard navigation
    let selectedIdx = -1
    const choices = card.choices || []
    const onKeydown = (e) => {
      if (this._choiceMade || !choices.length) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        selectedIdx = selectedIdx < choices.length - 1 ? selectedIdx + 1 : 0
        // Could highlight choice on card texture — for now just track
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        selectedIdx = selectedIdx > 0 ? selectedIdx - 1 : choices.length - 1
      } else if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault()
        this._choiceMade = true
        try { SFX.choiceSelect() } catch (e) { /* ignore */ }
        this._cleanupRaycast?.()
        if (this._choiceFallbackTimer) {
          clearTimeout(this._choiceFallbackTimer)
          this._choiceFallbackTimer = null
        }
        this._handleChoice(selectedIdx)
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick)
    document.addEventListener('touchend', onTouch)
    document.addEventListener('keydown', onKeydown)

    this._cleanupRaycast = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick)
      document.removeEventListener('touchend', onTouch)
      document.removeEventListener('keydown', onKeydown)
      // Clear hover state on cleanup
      this._encounterCard?.highlightChoice(-1)
      this._cleanupRaycast = null
    }
  }

  /** Projected transparent DOM buttons over the 3D card's choice zones */
  _showProjectedChoiceButtons(card, choices) {
    if (!choices?.length) return
    const center = this._el?.querySelector('#g3d-center')
    if (!center) return

    const colors = ['rgba(180,165,130,0.92)', 'rgba(180,165,130,0.92)', 'rgba(180,165,130,0.92)']
    const borderColors = ['#2a6a2a', '#8a6a20', '#2a4a6a']

    // Create floating choice buttons that update position each frame
    const container = document.createElement('div')
    container.className = 'g3d-projected-choices'
    container.style.cssText = 'position:fixed;inset:0;z-index:45;pointer-events:none;'

    choices.slice(0, 3).forEach((c, i) => {
      const btn = document.createElement('button')
      btn.className = 'g3d-proj-btn'
      btn.dataset.idx = String(i)
      btn.textContent = c.label || `Choix ${i + 1}`
      btn.style.cssText = `
        position:absolute;pointer-events:auto;cursor:pointer;
        padding:10px 16px;border-radius:8px;
        background:${colors[i]};border:1px solid ${borderColors[i]};
        color:#3a2810;font:13px/1.2 Georgia,'Times New Roman',serif;
        backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
        transition:background 0.15s,transform 0.15s;
        max-width:220px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      `
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(160,145,110,0.95)'
        btn.style.transform = 'scale(1.05)'
        btn.style.borderColor = borderColors[i]
        try { SFX.choiceHover?.() } catch {}
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = colors[i]
        btn.style.transform = 'scale(1)'
      })
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (this._choiceMade) return
        this._choiceMade = true
        try { SFX.choiceSelect?.() } catch {}
        this._cleanupRaycast?.()
        // Highlight selected, dim others
        container.querySelectorAll('.g3d-proj-btn').forEach((b, j) => {
          b.disabled = true
          b.style.opacity = j === i ? '1' : '0.2'
        })
        this._handleChoice(i)
      })
      container.appendChild(btn)
    })

    document.body.appendChild(container)
    this._projectedContainer = container

    // Update button positions each frame (project 3D card position to screen)
    const cam = this._pathCamera?.getCamera() ?? this._world.getCamera()
    const renderer = this._renderManager?._renderer
    const updatePositions = () => {
      if (!this._encounterCard?.group || !renderer || this._choiceMade) {
        cancelAnimationFrame(this._projRAF)
        return
      }
      const cardPos = this._encounterCard.group.position.clone()
      // Project card center to screen
      const projected = cardPos.clone().project(cam)
      const hw = renderer.domElement.clientWidth / 2
      const hh = renderer.domElement.clientHeight / 2
      const screenX = (projected.x * hw) + hw
      const screenY = -(projected.y * hh) + hh

      // Position buttons relative to card screen position
      const btns = container.querySelectorAll('.g3d-proj-btn')
      const btnH = 40
      const startY = screenY + 20 // below card center
      btns.forEach((btn, i) => {
        btn.style.left = `${screenX - 110}px`
        btn.style.top = `${startY + i * (btnH + 8)}px`
      })
      this._projRAF = requestAnimationFrame(updatePositions)
    }
    this._projRAF = requestAnimationFrame(updatePositions)
  }

  /** DOM fallback for choice selection (shown after 10s if no raycast click) */
  _showDOMChoiceFallback(card) {
    const center = this._el?.querySelector('#g3d-center')
    if (!center || this._choiceMade) return

    const colors = ['#33aa55', '#cc9933', '#4488cc']
    const choicesHtml = (card.choices ?? []).map((c, i) =>
      `<button class="g3d-slim-choice" data-idx="${i}" style="border-left:3px solid ${colors[i % 3]}">
        ${(c.label || '').slice(0, 35)}
      </button>`
    ).join('')

    center.innerHTML = `<div class="g3d-slim-bar">${choicesHtml}</div>`

    const choiceBtns = [...center.querySelectorAll('.g3d-slim-choice')]
    choiceBtns.forEach(btn => {
      btn.addEventListener('mouseenter', () => { try { SFX.choiceHover() } catch (e) { /* ignore */ } })
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        if (this._choiceMade) return
        this._choiceMade = true
        try { SFX.choiceSelect() } catch (e) { /* ignore */ }
        this._cleanupRaycast?.()
        const idx = parseInt(btn.dataset.idx)
        choiceBtns.forEach((b, i) => {
          b.disabled = true
          if (i !== idx) b.style.opacity = '0.2'
          else b.classList.add('g3d-slim-choice-selected')
        })
        this._handleChoice(idx)
      })
    })
  }

  /** Unified choice handler — called by raycast, keyboard, or DOM fallback */
  async _handleChoice(idx) {
    try {
      await this._dismissEncounter()
      await this._onChoice(idx, false)
    } catch (err) {
      console.error('[Game3D] onChoice error:', err)
    } finally {
      this._pathCamera?.resumeAfterChoice()
    }
  }

  async _dismissEncounter() {
    this._encounterActive = false

    // Cleanup raycast listeners
    this._cleanupRaycast?.()

    // Remove projected choice buttons
    if (this._projRAF) cancelAnimationFrame(this._projRAF)
    this._projectedContainer?.remove()
    this._projectedContainer = null

    // Clear fallback timer
    if (this._choiceFallbackTimer) {
      clearTimeout(this._choiceFallbackTimer)
      this._choiceFallbackTimer = null
    }

    this._world.setMood('neutral')

    // Dismiss encounter card with flip animation
    if (this._encounterCard) {
      SFX.transitionWhoosh()
      await this._encounterCard.flipOut()
      this._encounterCard = null
    }

    // Dismiss contextual asset (event_assets)
    if (this._currentAsset) {
      const scene = this._world?.getScene()
      if (scene) await dismissEventAsset(this._currentAsset, scene)
      this._currentAsset = null
    }

    // Dismiss legacy event props
    if (this._eventProps) {
      await dismissEventProps(this._eventProps, this._world.getScene())
      this._eventProps = null
    }

    // Creature spawner disabled — no dismiss needed
    // const dismissPos = this._spawner?.getGroup()?.position
    // if (dismissPos) playEncounterDismiss(dismissPos, this._world.getCamera().position)
    // await this._spawner?.dismiss()

    // Clear DOM choice fallback bar
    const center = this._el?.querySelector('#g3d-center')
    if (center) center.innerHTML = ''
  }

  playEffect(effectType, faction) {
    if (!this._effects) return
    switch (effectType) {
      case 'DAMAGE': this._effects.playDamage(); break
      case 'HEAL': this._effects.playHeal(); break
      case 'SHIFT_FACTION': this._effects.playShiftFaction(faction); break
      case 'ADD_SOUFFLE': this._effects.playAddSouffle(); break
      case 'ADD_TENSION': this._effects.playTension(); break
    }
  }
}

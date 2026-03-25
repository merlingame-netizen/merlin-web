// M.E.R.L.I.N. — Personality Quiz Scene
// 5 questions -> profile on 4 axes (audace/prudence, altruisme/égoïsme)
// Determines initial aspect bias and archetype

const QUESTIONS = [
  {
    text: 'Un voyageur blessé gît au bord du sentier. La nuit tombe.',
    choices: [
      { label: 'Je m\'arrête et le soigne', axes: { altruisme: 2, prudence: -1 } },
      { label: 'Je l\'observe d\'abord, méfiant', axes: { prudence: 2 } },
      { label: 'Je passe mon chemin', axes: { egoisme: 2 } },
    ],
  },
  {
    text: 'Un esprit des bois t\'offre un pacte: pouvoir contre servitude.',
    choices: [
      { label: 'J\'accepte sans hésiter', axes: { audace: 2, prudence: -1 } },
      { label: 'Je négocie les termes', axes: { prudence: 1, audace: 1 } },
      { label: 'Je refuse fermement', axes: { prudence: 2 } },
    ],
  },
  {
    text: 'Ton clan est menacé. Tu peux fuir ou combattre.',
    choices: [
      { label: 'Je mène la charge', axes: { audace: 2, altruisme: 1 } },
      { label: 'J\'organise la défense', axes: { prudence: 1, altruisme: 1 } },
      { label: 'Je protège les miens en fuyant', axes: { prudence: 2 } },
    ],
  },
  {
    text: 'Un arbre sacré meurt. Son bois pourrait forger une arme puissante.',
    choices: [
      { label: 'Je préserve l\'arbre', axes: { altruisme: 2 } },
      { label: 'Je prends le bois', axes: { egoisme: 1, audace: 1 } },
      { label: 'Je cherche un rituel de guérison', axes: { prudence: 1, altruisme: 1 } },
    ],
  },
  {
    text: 'Merlin te regarde dans les yeux: "Que cherches-tu, druide?"',
    choices: [
      { label: 'La vérité, quoi qu\'il en coûte', axes: { audace: 2 } },
      { label: 'L\'équilibre entre les mondes', axes: { altruisme: 1, prudence: 1 } },
      { label: 'Le pouvoir de protéger', axes: { audace: 1, altruisme: 1 } },
    ],
  },
]

const ARCHETYPES = {
  guerrier:   { name: 'Guerrier',   bias: { Corps: 1 }, desc: 'Force et audace te définissent.' },
  gardien:    { name: 'Gardien',    bias: { Monde: 1 }, desc: 'Tu protèges l\'équilibre du monde.' },
  mystique:   { name: 'Mystique',   bias: { Ame: 1 },   desc: 'Les secrets de l\'âme te guident.' },
  equilibre:  { name: 'Équilibré',  bias: {},            desc: 'Tu marches entre tous les chemins.' },
}

function computeArchetype(scores) {
  const { audace = 0, prudence = 0, altruisme = 0, egoisme = 0 } = scores
  if (audace >= 4 && egoisme >= 2) return 'guerrier'
  if (altruisme >= 4) return 'gardien'
  if (prudence >= 4) return 'mystique'
  return 'equilibre'
}

export class PersonalityQuiz {
  constructor(onComplete) {
    this._onComplete = onComplete
    this._el = null
    this._qIndex = 0
    this._scores = { audace: 0, prudence: 0, altruisme: 0, egoisme: 0 }
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-quiz'
    container.appendChild(this._el)

    const skip = document.createElement('button')
    skip.className = 'skip-btn'
    skip.textContent = 'Passer >>'
    skip.addEventListener('click', () => {
      this._onComplete({ archetype: 'equilibre', scores: { ...this._scores }, bias: {} })
    })
    this._el.appendChild(skip)
  }

  unmount() {
    this._el?.remove()
    this._el = null
  }

  render() {
    if (!this._el) return
    if (this._qIndex >= QUESTIONS.length) {
      this._showResult()
      return
    }
    const q = QUESTIONS[this._qIndex]
    this._el.innerHTML = `
      <div class="quiz-progress">${this._qIndex + 1} / ${QUESTIONS.length}</div>
      <div class="quiz-question">${q.text}</div>
      <div class="quiz-choices">
        ${q.choices.map((c, i) => `
          <button class="quiz-choice" data-idx="${i}">${c.label}</button>
        `).join('')}
      </div>
    `
    this._el.querySelectorAll('.quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => this._answer(parseInt(btn.dataset.idx)))
    })
  }

  onEnter() {
    this._qIndex = 0
    this._scores = { audace: 0, prudence: 0, altruisme: 0, egoisme: 0 }
    this.render()
  }

  _answer(idx) {
    const q = QUESTIONS[this._qIndex]
    const axes = q.choices[idx].axes
    for (const [k, v] of Object.entries(axes)) {
      this._scores[k] = (this._scores[k] ?? 0) + v
    }
    this._qIndex++
    this.render()
  }

  _showResult() {
    const archKey = computeArchetype(this._scores)
    const arch = ARCHETYPES[archKey]
    this._el.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-title">Ton archétype: ${arch.name}</div>
        <div class="quiz-result-desc">${arch.desc}</div>
        <button class="menu-btn quiz-continue">[ Continuer ]</button>
      </div>
    `
    this._el.querySelector('.quiz-continue').addEventListener('click', () => {
      this._onComplete({ archetype: archKey, scores: { ...this._scores }, bias: arch.bias })
    })
  }
}

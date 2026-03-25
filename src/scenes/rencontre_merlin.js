// M.E.R.L.I.N. — Rencontre Merlin Scene
// Introductory dialogue with Merlin, typewriter effect, choice responses

const DIALOGUE = [
  {
    speaker: 'Merlin',
    text: 'Ah... Te voilà enfin, jeune druide. Les Oghams m\'avaient prévenu de ta venue.',
  },
  {
    speaker: 'Merlin',
    text: 'Je suis Merlin, gardien des équilibres. Corps, Âme, Monde — trois forces que tu devras apprendre à maîtriser.',
  },
  {
    speaker: 'Merlin',
    text: 'Chaque choix que tu feras pèsera sur la Triade. Trop loin dans une direction... et c\'est la chute.',
    choices: [
      { label: 'Je suis prêt.', response: 'Bien. L\'audace est une vertu... quand elle est tempérée de sagesse.' },
      { label: 'J\'ai peur.', response: 'La peur est sage, jeune druide. Elle te gardera en vie.' },
      { label: 'Que sont les Oghams?', response: 'Les Oghams sont l\'alphabet sacré des druides. Chaque symbole est un pouvoir, un souffle du monde ancien.' },
    ],
  },
  {
    speaker: 'Merlin',
    text: 'Ta Bestiole t\'accompagnera. Elle connaît des secrets que même moi j\'ignore. Prends soin d\'elle.',
  },
  {
    speaker: 'Merlin',
    text: 'Maintenant... entre dans l\'Antre. Choisis ton chemin. Et souviens-toi: l\'équilibre, toujours l\'équilibre.',
  },
]

export class RencontreMerlin {
  constructor(onComplete) {
    this._onComplete = onComplete
    this._el = null
    this._step = 0
    this._typeTimer = null
  }

  mount(container) {
    this._el = document.createElement('div')
    this._el.className = 'scene-rencontre'
    this._el.innerHTML = `
      <div class="rencontre-portrait">
        <div class="merlin-ascii">🧙</div>
        <div class="merlin-name">Merlin</div>
      </div>
      <div class="rencontre-dialogue">
        <div class="dialogue-text"></div>
        <div class="dialogue-choices"></div>
      </div>
      <button class="skip-btn" id="skip-rencontre">Passer >></button>
    `
    this._el.querySelector('#skip-rencontre').addEventListener('click', () => {
      if (this._typeTimer) clearInterval(this._typeTimer)
      this._onComplete()
    })
    container.appendChild(this._el)
  }

  unmount() {
    if (this._typeTimer) clearInterval(this._typeTimer)
    this._el?.remove()
    this._el = null
  }

  render() {}

  onEnter() {
    this._step = 0
    this._showStep()
  }

  _showStep() {
    if (this._step >= DIALOGUE.length) {
      this._onComplete()
      return
    }

    const d = DIALOGUE[this._step]
    const textEl = this._el.querySelector('.dialogue-text')
    const choicesEl = this._el.querySelector('.dialogue-choices')
    choicesEl.innerHTML = ''

    this._typewrite(textEl, d.text, () => {
      if (d.choices) {
        choicesEl.innerHTML = d.choices.map((c, i) =>
          `<button class="menu-btn dialogue-choice" data-idx="${i}">${c.label}</button>`
        ).join('')
        choicesEl.querySelectorAll('.dialogue-choice').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx)
            const response = d.choices[idx].response
            choicesEl.innerHTML = ''
            this._typewrite(textEl, response, () => {
              this._addContinueBtn(choicesEl)
            })
          })
        })
      } else {
        this._addContinueBtn(choicesEl)
      }
    })
  }

  _addContinueBtn(container) {
    const btn = document.createElement('button')
    btn.className = 'menu-btn dialogue-next'
    btn.textContent = '[ Suivant ]'
    btn.addEventListener('click', () => {
      this._step++
      this._showStep()
    })
    container.appendChild(btn)
  }

  _typewrite(el, text, onDone) {
    if (this._typeTimer) clearInterval(this._typeTimer)
    el.textContent = ''
    el.classList.add('typing')
    let i = 0
    this._typeTimer = setInterval(() => {
      el.textContent += text[i] ?? ''
      i++
      if (i >= text.length) {
        clearInterval(this._typeTimer)
        this._typeTimer = null
        el.classList.remove('typing')
        if (onDone) onDone()
      }
    }, 30)
  }
}

# M.E.R.L.I.N. — Le Jeu des Oghams (Web Edition)

Three.js web port du jeu de cartes narratif celtique. Propulsé par Groq LLaMA.

## Stack

- **Frontend**: Vite + Three.js (CRT background) + HTML/CSS overlay
- **LLM**: Groq API — `llama-3.3-70b-versatile` (Narrator) + `llama-3.1-8b-instant` (Game Master)
- **Hébergement**: Vercel (serverless API route `/api/llm`)

## Déploiement Vercel

### 1. Cloner et installer

```bash
cd C:/Users/PGNK2128/merlin-web
npm install
```

### 2. Créer une clé Groq

Aller sur https://console.groq.com/keys et créer une clé API.

### 3. Déployer sur Vercel

```bash
# Installer Vercel CLI si nécessaire
npm install -g vercel

# Login
vercel login

# Déployer (premier déploiement)
vercel

# Ajouter la clé API Groq
vercel env add GROQ_API_KEY

# Redéployer en production
vercel --prod
```

L'URL sera : `https://merlin-game.vercel.app` (ou slug auto-généré)

### 4. Variables d'environnement Vercel

| Variable | Valeur |
|----------|--------|
| `GROQ_API_KEY` | Ta clé Groq (gsk_xxx...) |
| `GROQ_MODEL_NARRATOR` | `llama-3.3-70b-versatile` (optionnel) |
| `GROQ_MODEL_GM` | `llama-3.1-8b-instant` (optionnel) |

## Développement local

```bash
npm run dev
# → http://localhost:5173
```

Pour tester l'API LLM en local, créer un fichier `.env.local`:
```
GROQ_API_KEY=gsk_ton_vrai_token_ici
```

Puis lancer avec Vercel CLI :
```bash
vercel dev
# → http://localhost:3000 (avec API routes actives)
```

## Architecture

```
merlin-web/
├── api/
│   └── llm.js              ← Vercel serverless: proxy Groq (Narrator + GM)
├── src/
│   ├── game/
│   │   ├── constants.js    ← Oghams, Aspects, Endings, Victories
│   │   ├── store.js        ← État Redux-like (immutable)
│   │   ├── effect_engine.js← SHIFT_ASPECT, ADD_SOUFFLE, etc.
│   │   └── save_system.js  ← localStorage 3 slots
│   ├── llm/
│   │   └── groq_client.js  ← generateCard() + generateEffects() + fallbacks
│   ├── three/
│   │   └── crt_scene.js    ← CRT animated background (scanlines, runes, glow)
│   └── ui/
│       ├── styles.css      ← Palette CRT Druido-Tech
│       └── game_ui.js      ← DOM controller + buildHTML()
├── public/
│   └── assets/             ← Sprites (optionnel)
├── index.html
├── vite.config.js
├── vercel.json
└── .env.example
```

## Système de jeu

- **Triade**: 3 Aspects × 3 états (Corps/Âme/Monde × BAS/EQUILIBRE/HAUT)
- **Souffle d'Ogham**: Max 7, départ 3. +1 si tout en équilibre
- **Fins**: 12 chutes (2 extrêmes simultanés) + 3 victoires
- **Sauvegarde**: 3 slots localStorage
- **LLM**: Narrator (70B) génère texte + choix, GM (8B) génère effets JSON
- **Fallback**: Pool de 5 cartes statiques si API indisponible

// M.E.R.L.I.N. — Pixel Portraits
// Merlin (3 moods), 6 NPC variants, Bestiole sprite
// 12x16 pixel sprites stored as index arrays

const MERLIN_PALETTE = {
  1: '#5a4a3a', // robe dark
  2: '#7a6a5a', // robe mid
  3: '#9a8a7a', // robe light
  4: '#dac8a0', // skin
  5: '#bab0a0', // beard
  6: '#ffbe33', // staff glow / amber
  7: '#33ff66', // eyes (phosphor)
  8: '#ffffff', // highlight
}

const BESTIOLE_PALETTE = {
  1: '#2a4a2a', // body dark
  2: '#4a7a4a', // body mid
  3: '#6b9b5b', // body light
  4: '#ffbe33', // eyes
  5: '#8bbb6b', // belly
  6: '#1a3a1a', // shadow
}

const NPC_PALETTE = {
  1: '#3a2a1a', // dark cloth
  2: '#5a4a3a', // mid cloth
  3: '#7a6a5a', // light cloth
  4: '#dac8a0', // skin
  5: '#8a5a3a', // hair
  6: '#aa7a4a', // hair light
  7: '#4a6a8a', // accent
}

// Merlin sprite data (12 wide x 16 tall)
const MERLIN_NEUTRAL = {
  palette: MERLIN_PALETTE,
  data: [
    [0,0,0,0,0,6,6,0,0,0,0,0],
    [0,0,0,0,6,6,6,6,0,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,5,5,4,4,4,4,5,5,0,0],
    [0,0,5,4,7,4,4,7,4,5,0,0],
    [0,0,0,4,4,4,4,4,4,0,0,0],
    [0,0,0,4,5,5,5,5,4,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,1,1,2,2,3,3,2,2,1,1,0],
    [0,1,2,2,3,3,3,3,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,1,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
  ],
}

const MERLIN_HAPPY = {
  palette: { ...MERLIN_PALETTE, 7: '#66ff99' }, // brighter eyes
  data: [
    [0,0,0,0,0,6,6,0,0,0,0,0],
    [0,0,0,0,6,8,8,6,0,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,5,5,4,4,4,4,5,5,0,0],
    [0,0,5,4,7,4,4,7,4,5,0,0],
    [0,0,0,4,4,8,8,4,4,0,0,0],
    [0,0,0,4,5,5,5,5,4,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,1,1,2,2,3,3,2,2,1,1,0],
    [0,1,2,2,3,3,3,3,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,1,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
  ],
}

const MERLIN_ANGRY = {
  palette: { ...MERLIN_PALETTE, 7: '#ff6b6b' }, // red eyes
  data: [
    [0,0,0,0,0,6,6,0,0,0,0,0],
    [0,0,0,0,6,6,6,6,0,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,5,5,4,4,4,4,5,5,0,0],
    [0,0,1,4,7,4,4,7,4,1,0,0],
    [0,0,0,4,4,4,4,4,4,0,0,0],
    [0,0,0,4,4,5,5,4,4,0,0,0],
    [0,0,0,5,5,5,5,5,5,0,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,1,1,2,2,3,3,2,2,1,1,0],
    [0,1,2,2,3,3,3,3,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,1,0,0],
    [0,0,1,1,2,2,2,2,1,1,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0],
  ],
}

const BESTIOLE_SPRITE = {
  palette: BESTIOLE_PALETTE,
  data: [
    [0,0,0,0,4,0,0,4,0,0,0,0],
    [0,0,0,2,2,2,2,2,2,0,0,0],
    [0,0,2,3,4,3,3,4,3,2,0,0],
    [0,0,2,3,3,3,3,3,3,2,0,0],
    [0,2,2,5,5,5,5,5,5,2,2,0],
    [0,2,5,5,5,5,5,5,5,5,2,0],
    [0,1,2,2,5,5,5,5,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,1,0,0],
    [0,0,0,1,6,0,0,6,1,0,0,0],
    [0,0,0,0,1,0,0,1,0,0,0,0],
  ],
}

// 6 NPC variants (just color swaps on a base)
const NPC_BASE = {
  data: [
    [0,0,0,0,5,5,5,0,0,0,0,0],
    [0,0,0,5,5,6,5,5,0,0,0,0],
    [0,0,0,4,4,4,4,4,0,0,0,0],
    [0,0,4,4,7,4,7,4,4,0,0,0],
    [0,0,0,4,4,4,4,4,0,0,0,0],
    [0,0,0,4,4,4,4,4,0,0,0,0],
    [0,0,1,1,2,2,2,1,1,0,0,0],
    [0,1,1,2,2,3,2,2,1,1,0,0],
    [0,1,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,1,2,2,2,1,1,0,0,0],
    [0,0,0,1,1,0,1,1,0,0,0,0],
    [0,0,0,1,1,0,1,1,0,0,0,0],
  ],
}

const NPC_VARIANTS = [
  { palette: NPC_PALETTE },
  { palette: { ...NPC_PALETTE, 7: '#8a3a3a' } },
  { palette: { ...NPC_PALETTE, 7: '#3a8a3a', 5: '#3a3a3a', 6: '#5a5a5a' } },
  { palette: { ...NPC_PALETTE, 1: '#1a1a3a', 2: '#2a2a5a', 3: '#4a4a7a', 7: '#6a8aba' } },
  { palette: { ...NPC_PALETTE, 5: '#aa6a2a', 6: '#ca8a4a', 7: '#dac88a' } },
  { palette: { ...NPC_PALETTE, 1: '#2a1a1a', 2: '#4a2a2a', 3: '#6a3a3a', 7: '#ba4a4a' } },
]

export function getMerlinSprite(mood = 'neutral') {
  if (mood === 'happy') return MERLIN_HAPPY
  if (mood === 'angry') return MERLIN_ANGRY
  return MERLIN_NEUTRAL
}

export function getBestioleSprite() {
  return BESTIOLE_SPRITE
}

export function getNPCSprite(variant = 0) {
  const v = NPC_VARIANTS[variant % NPC_VARIANTS.length]
  return { palette: v.palette, data: NPC_BASE.data }
}

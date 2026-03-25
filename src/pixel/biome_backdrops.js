// M.E.R.L.I.N. — Biome Backdrops (Pixel Art)
// 8 biomes: palettes + procedural layer generators

const BIOME_PALETTES = {
  broceliande: {
    1: '#0a1a0a', 2: '#1a3a1a', 3: '#2d5a2d', 4: '#4a7a4a',
    5: '#6b9b5b', 6: '#8bbb6b', 7: '#3a2a1a', 8: '#5a4a2a',
    9: '#7a6a3a', 10: '#2a4a2a',
  },
  landes: {
    1: '#1a1a0a', 2: '#3a3a1a', 3: '#5a5a2a', 4: '#7a7a3a',
    5: '#9a8a4a', 6: '#baa55a', 7: '#4a3a2a', 8: '#6a5a3a',
    9: '#8a7a5a', 10: '#3a3a1a',
  },
  cotes: {
    1: '#0a1a2a', 2: '#1a3a5a', 3: '#2a5a7a', 4: '#3a7a9a',
    5: '#5a9aba', 6: '#8abada', 7: '#dac88a', 8: '#baa86a',
    9: '#9a8a5a', 10: '#4a6a8a',
  },
  monts: {
    1: '#1a1a2a', 2: '#2a2a3a', 3: '#4a4a5a', 4: '#6a6a7a',
    5: '#8a8a9a', 6: '#aaaaba', 7: '#3a4a3a', 8: '#5a6a5a',
    9: '#1a2a1a', 10: '#7a7a8a',
  },
  ile_sein: {
    1: '#0a0a1a', 2: '#1a2a4a', 3: '#2a4a6a', 4: '#4a6a8a',
    5: '#6a8aaa', 6: '#8aaaca', 7: '#5a5a6a', 8: '#7a7a8a',
    9: '#cacada', 10: '#3a5a7a',
  },
  huelgoat: {
    1: '#0a1a0a', 2: '#1a2a0a', 3: '#2a4a1a', 4: '#3a5a2a',
    5: '#5a7a3a', 6: '#7a9a4a', 7: '#4a3a2a', 8: '#6a5a3a',
    9: '#8a7a5a', 10: '#2a3a1a',
  },
  ecosse: {
    1: '#1a0a1a', 2: '#2a1a2a', 3: '#4a2a4a', 4: '#6a4a5a',
    5: '#8a6a7a', 6: '#aa8a9a', 7: '#3a3a4a', 8: '#5a5a6a',
    9: '#2a3a2a', 10: '#4a3a4a',
  },
  iles_mystiques: {
    1: '#0a0a2a', 2: '#1a1a4a', 3: '#2a2a6a', 4: '#4a3a8a',
    5: '#6a5aaa', 6: '#8a7aca', 7: '#daba6a', 8: '#ba9a4a',
    9: '#9a7a3a', 10: '#3a3a6a',
  },
}

// Procedural backdrop generator: sky + terrain + details
export function generateBackdrop(biomeKey, width = 64, height = 32) {
  const palette = BIOME_PALETTES[biomeKey] ?? BIOME_PALETTES.broceliande
  const grid = []

  // Sky (top 40%)
  const skyEnd = Math.floor(height * 0.4)
  for (let y = 0; y < skyEnd; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const t = y / skyEnd
      row.push(t < 0.5 ? 1 : 2)
    }
    grid.push(row)
  }

  // Horizon / midground (40-65%)
  const midEnd = Math.floor(height * 0.65)
  for (let y = skyEnd; y < midEnd; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      // Simple hills using sine
      const hillH = Math.sin(x * 0.15 + (biomeKey.length * 0.5)) * 3
      if (y - skyEnd < hillH + 4) {
        row.push(3 + (x % 3 === 0 ? 1 : 0))
      } else {
        row.push(5)
      }
    }
    grid.push(row)
  }

  // Ground (65-100%)
  for (let y = midEnd; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const detail = _pseudoRandom(x * 7 + y * 13 + biomeKey.length)
      if (detail < 0.15) {
        row.push(7) // tree/rock detail
      } else if (detail < 0.25) {
        row.push(8) // secondary detail
      } else {
        row.push(y < height - 2 ? 5 : 6)
      }
    }
    grid.push(row)
  }

  return { grid, palette }
}

export function getBiomePalette(biomeKey) {
  return BIOME_PALETTES[biomeKey] ?? BIOME_PALETTES.broceliande
}

// Simple deterministic pseudo-random (0-1)
function _pseudoRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

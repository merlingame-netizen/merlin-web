// M.E.R.L.I.N. — Ogham Icon Sprites (8x12 pixel glyphs)
// Simplified pixel representations of the 18 Ogham characters

const OGHAM_PALETTE = {
  1: '#33ff66', // phosphor green (main stroke)
  2: '#1a7a33', // dim green (stem)
  3: '#ffbe33', // amber (activated glow)
}

// Each glyph is 8 wide x 12 tall
// Stem runs down center (col 3-4), strokes branch left or right
const OGHAM_GLYPHS = {
  beith: [
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  luis: [
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,1,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,1,1,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  quert: [
    [0,0,0,2,2,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  fearn: [
    [0,0,0,2,2,0,0,0],
    [0,1,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,1,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,1,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  sail: [
    [0,0,0,2,2,0,0,0],
    [0,1,1,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,1,1,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,1,1,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,1,1,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  nion: [
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [1,1,1,2,2,1,1,1],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [1,1,1,2,2,1,1,1],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [1,1,1,2,2,1,1,1],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
  ],
}

// For oghams not explicitly defined, generate a simple variant
function _generateSimpleGlyph(seed) {
  const glyph = []
  for (let y = 0; y < 12; y++) {
    const row = [0, 0, 0, 2, 2, 0, 0, 0]
    if (y % (2 + (seed % 3)) === 1) {
      const side = seed % 2 === 0
      if (side) { row[5] = 1; if (seed > 8) row[6] = 1 }
      else { row[2] = 1; if (seed > 8) row[1] = 1 }
    }
    glyph.push(row)
  }
  return glyph
}

const ALL_OGHAM_IDS = [
  'beith', 'luis', 'quert', 'fearn', 'sail', 'nion',
  'huath', 'dair', 'tinne', 'coll', 'muin', 'gort',
  'ngetal', 'straif', 'ruis', 'ailm', 'onn', 'ur',
]

export function getOghamGlyph(id) {
  if (OGHAM_GLYPHS[id]) {
    return { palette: OGHAM_PALETTE, data: OGHAM_GLYPHS[id] }
  }
  const idx = ALL_OGHAM_IDS.indexOf(id)
  return { palette: OGHAM_PALETTE, data: _generateSimpleGlyph(idx >= 0 ? idx : 0) }
}

export function getOghamPalette() {
  return OGHAM_PALETTE
}

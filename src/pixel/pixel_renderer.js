// M.E.R.L.I.N. — Pixel Art Renderer
// Canvas-based pixel art: grid rendering, palette system, cascade animation

const PIXEL_SIZE = 4
const GRID_W = 64
const GRID_H = 32

export class PixelRenderer {
  constructor(canvas) {
    this._canvas = canvas
    this._ctx = canvas.getContext('2d')
    this._canvas.width = GRID_W * PIXEL_SIZE
    this._canvas.height = GRID_H * PIXEL_SIZE
    this._ctx.imageSmoothingEnabled = false
    this._animFrame = null
  }

  get width() { return GRID_W }
  get height() { return GRID_H }

  clear(color = '#050c05') {
    this._ctx.fillStyle = color
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height)
  }

  drawPixel(x, y, color) {
    this._ctx.fillStyle = color
    this._ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
  }

  drawGrid(grid, palette) {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y]
      for (let x = 0; x < row.length; x++) {
        const idx = row[x]
        if (idx > 0 && palette[idx]) {
          this.drawPixel(x, y, palette[idx])
        }
      }
    }
  }

  drawSprite(sprite, offsetX = 0, offsetY = 0, palette) {
    const pal = palette ?? sprite.palette
    for (let y = 0; y < sprite.data.length; y++) {
      for (let x = 0; x < sprite.data[y].length; x++) {
        const idx = sprite.data[y][x]
        if (idx > 0 && pal[idx]) {
          this.drawPixel(x + offsetX, y + offsetY, pal[idx])
        }
      }
    }
  }

  // Cascade reveal animation: top-to-bottom row reveal
  animateCascade(grid, palette, speed = 40) {
    return new Promise(resolve => {
      let row = 0
      this.clear()
      const step = () => {
        if (row >= grid.length) { resolve(); return }
        for (let x = 0; x < grid[row].length; x++) {
          const idx = grid[row][x]
          if (idx > 0 && palette[idx]) this.drawPixel(x, row, palette[idx])
        }
        row++
        this._animFrame = setTimeout(step, speed)
      }
      step()
    })
  }

  // Dissolve animation: random pixel fade
  animateDissolve(speed = 20, steps = 16) {
    return new Promise(resolve => {
      let step = 0
      const canvas = this._canvas
      const ctx = this._ctx
      const tick = () => {
        if (step >= steps) { resolve(); return }
        ctx.fillStyle = `rgba(5, 12, 5, ${1 / steps})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        step++
        this._animFrame = setTimeout(tick, speed)
      }
      tick()
    })
  }

  stopAnimation() {
    if (this._animFrame) {
      clearTimeout(this._animFrame)
      this._animFrame = null
    }
  }

  destroy() {
    this.stopAnimation()
  }
}

// Utility: generate a procedural gradient sky
export function generateSkyGradient(width, height, topColor, bottomColor, palette) {
  const grid = []
  const topIdx = Object.keys(palette).find(k => palette[k] === topColor) ?? 1
  const botIdx = Object.keys(palette).find(k => palette[k] === bottomColor) ?? 2
  for (let y = 0; y < height; y++) {
    const row = []
    const t = y / (height - 1)
    const idx = t < 0.5 ? parseInt(topIdx) : parseInt(botIdx)
    for (let x = 0; x < width; x++) row.push(idx)
    grid.push(row)
  }
  return grid
}

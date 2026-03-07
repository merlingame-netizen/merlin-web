// M.E.R.L.I.N. — Save System using localStorage (ported from merlin_save_system.gd)

const SAVE_VERSION = '1.0.0'
const SLOT_KEY = (slot) => `merlin_save_slot_${slot}`
const SLOT_COUNT = 3

export function saveSlot(slot, state) {
  if (slot < 0 || slot >= SLOT_COUNT) return false
  const data = {
    ...state,
    version: SAVE_VERSION,
    timestamp: Date.now(),
  }
  try {
    localStorage.setItem(SLOT_KEY(slot), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function loadSlot(slot) {
  if (slot < 0 || slot >= SLOT_COUNT) return null
  try {
    const raw = localStorage.getItem(SLOT_KEY(slot))
    if (!raw) return null
    const data = JSON.parse(raw)
    return _migrate(data)
  } catch {
    return null
  }
}

export function listSlots() {
  const slots = []
  for (let i = 0; i < SLOT_COUNT; i++) {
    try {
      const raw = localStorage.getItem(SLOT_KEY(i))
      if (!raw) { slots.push(null); continue }
      const data = JSON.parse(raw)
      slots.push({
        slot: i,
        timestamp: data.timestamp ?? 0,
        cards_played: data.run?.cards_played ?? 0,
        day: data.run?.day ?? 1,
        phase: data.phase ?? 'menu',
        triade: data.run?.triade ?? null,
      })
    } catch {
      slots.push(null)
    }
  }
  return slots
}

export function deleteSlot(slot) {
  if (slot < 0 || slot >= SLOT_COUNT) return
  localStorage.removeItem(SLOT_KEY(slot))
}

function _migrate(data) {
  // version migration placeholder
  return data
}

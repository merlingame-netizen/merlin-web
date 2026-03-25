// M.E.R.L.I.N. — Celtic Calendar
// Seasonal events, festivals, day-of-year effects

const CELTIC_FESTIVALS = [
  { name: 'Samhain', day: 1, duration: 7, season: 0, desc: 'Le voile entre les mondes s\'amincit', effect: { ame_bias: 1, tension_bonus: 10 } },
  { name: 'Alban Arthan', day: 21, duration: 3, season: 0, desc: 'Le solstice d\'hiver rallume l\'espoir', effect: { equilibre_bonus: true } },
  { name: 'Imbolc', day: 45, duration: 7, season: 1, desc: 'Le renouveau printanier commence', effect: { souffle_bonus: 1, corps_bias: -1 } },
  { name: 'Alban Eilir', day: 79, duration: 3, season: 1, desc: 'L\'équinoxe de printemps', effect: { equilibre_bonus: true } },
  { name: 'Bealtaine', day: 120, duration: 7, season: 2, desc: 'Les feux de Beltane embrasent les collines', effect: { monde_bias: 1, bond_bonus: 5 } },
  { name: 'Alban Hefin', day: 172, duration: 3, season: 2, desc: 'Le solstice d\'été, apogée de lumière', effect: { souffle_bonus: 2 } },
  { name: 'Lughnasadh', day: 213, duration: 7, season: 3, desc: 'La fête des récoltes de Lugh', effect: { essence_bonus: 2, karma_bonus: 10 } },
  { name: 'Alban Elfed', day: 265, duration: 3, season: 3, desc: 'L\'équinoxe d\'automne', effect: { equilibre_bonus: true } },
]

const SEASONS = [
  { name: 'Samhain', startDay: 1, endDay: 44, color: '#2a1a3a', desc: 'Saison des morts et du renouveau' },
  { name: 'Imbolc', startDay: 45, endDay: 119, color: '#1a3a2a', desc: 'Saison du renouveau printanier' },
  { name: 'Bealtaine', startDay: 120, endDay: 212, color: '#3a3a1a', desc: 'Saison de la lumière et de la vie' },
  { name: 'Lughnasadh', startDay: 213, endDay: 365, color: '#3a2a1a', desc: 'Saison des récoltes et du déclin' },
]

export function getCurrentSeason(day) {
  const dayOfYear = ((day - 1) % 365) + 1
  return SEASONS.find(s => dayOfYear >= s.startDay && dayOfYear <= s.endDay) ?? SEASONS[0]
}

export function getActiveFestival(day) {
  const dayOfYear = ((day - 1) % 365) + 1
  return CELTIC_FESTIVALS.find(f =>
    dayOfYear >= f.day && dayOfYear < f.day + f.duration
  ) ?? null
}

export function getCalendarContext(day) {
  const season = getCurrentSeason(day)
  const festival = getActiveFestival(day)
  let ctx = `Saison: ${season.name} — ${season.desc}`
  if (festival) {
    ctx += ` | Festival: ${festival.name} — ${festival.desc}`
  }
  return ctx
}

export function getDayEvents(day) {
  const season = getCurrentSeason(day)
  const festival = getActiveFestival(day)
  return { season, festival, dayOfYear: ((day - 1) % 365) + 1 }
}

export { CELTIC_FESTIVALS, SEASONS }

import { playerStats, replay, type Game, type Snapshot } from '../engine'
import type { TKey } from '../i18n'

type T = (k: TKey) => string

export const playerLabel = (p: { name: string }) => p.name

export function configLabel(g: Pick<Game, 'config'>, t: T): string {
  const c = g.config
  const legs = c.legs > 1 ? ` · first to ${c.legs}` : ''
  switch (c.mode) {
    case 'x01': {
      const io = `${c.inMode === 'double' ? 'DI' : 'SI'}${c.outMode === 'double' ? 'DO' : c.outMode === 'master' ? 'MO' : 'SO'}`
      const lim = c.maxRounds ? ` · ${c.maxRounds} ${t('rounds').toLowerCase()}` : ''
      return `${c.start} ${io}${lim}${legs}`
    }
    case 'highscore':
      return `${t('mode_highscore')} · ${c.rounds} ${t('rounds').toLowerCase()}${legs}`
    case 'shanghai':
      return `${t('mode_shanghai')} · ${c.rounds} ${t('rounds').toLowerCase()}${legs}`
    case 'baseball':
      return `${t('mode_baseball')} · ${c.innings} ${t('innings').toLowerCase()}${legs}`
    case 'cricket':
      return `${t('mode_cricket')}${c.scoring !== 'standard' ? ' · ' + t(`scoring_${c.scoring}`).split(' (')[0] : ''}${legs}`
  }
}

export interface ResultTable {
  title: string
  headers: string[]
  rows: string[][]
}

/** Final leg / current state value for player */
function mainValue(snap: Snapshot, p: number): number {
  const st = (snap.finished ? snap.legStates[snap.legStates.length - 1] : snap.state) as {
    rem?: number[]
    score?: number[]
  }
  if (snap.config.mode === 'x01') return st.rem![p]
  return st.score![p]
}

export function resultTable(g: Game, t: T, locale: string, snap = replay(g)): ResultTable {
  const c = g.config
  const headers = [t('rank'), t('player')]
  if (c.legs > 1) headers.push(t('legs'))
  if (c.mode === 'x01') headers.push(t('remaining'), t('avgDart'), t('avgRound'), t('bestTurn'), '180', t('highCheckout'), t('darts'))
  else if (c.mode === 'cricket') headers.push(...(c.scoring !== 'none' ? [t('points')] : []), t('mpd'), t('mpr'), t('darts'))
  else headers.push(t('total'), t('avgDart'), t('avgRound'), t('bestTurn'), t('darts'))

  const rows: string[][] = []
  snap.ranking.forEach((group, gi) => {
    const pos = snap.ranking.slice(0, gi).reduce((a, x) => a + x.length, 0) + 1
    for (const p of group) {
      const st = playerStats(snap, p)
      const row = [String(pos) + '.', playerLabel(g.players[p])]
      if (c.legs > 1) row.push(String(snap.legsWon[p]))
      if (c.mode === 'x01')
        row.push(String(mainValue(snap, p)), st.avgDart.toFixed(2), st.avgRound.toFixed(2), String(st.best), String(st.t180), String(st.highCheckout || '–'), String(st.darts))
      else if (c.mode === 'cricket')
        row.push(...(c.scoring !== 'none' ? [String(mainValue(snap, p))] : []), st.avgDart.toFixed(2), st.avgRound.toFixed(2), String(st.darts))
      else row.push(String(mainValue(snap, p)), st.avgDart.toFixed(2), st.avgRound.toFixed(2), String(st.best), String(st.darts))
      rows.push(row)
    }
  })
  const date = new Date(g.finishedAt ?? g.startedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  return { title: `${t('appName')} – ${configLabel(g, t)} – ${date}`, headers, rows }
}

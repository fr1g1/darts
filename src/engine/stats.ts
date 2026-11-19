import type { Snapshot } from './replay'

export interface PlayerStats {
  darts: number
  turns: number
  total: number
  /** points (marks in cricket) per dart */
  avgDart: number
  /** points (marks in cricket) per round/turn */
  avgRound: number
  best: number
  t180: number
  t140: number
  t100: number
  highCheckout: number
}

export function playerStats(snap: Snapshot, p: number): PlayerStats {
  const turns = snap.turns.filter((t) => t.p === p)
  const darts = turns.reduce((a, t) => a + t.darts.length, 0)
  const total = turns.reduce((a, t) => a + t.value, 0)
  const values = turns.map((t) => t.value)
  return {
    darts,
    turns: turns.length,
    total,
    avgDart: darts ? total / darts : 0,
    avgRound: turns.length ? total / turns.length : 0,
    best: values.length ? Math.max(...values) : 0,
    t180: values.filter((v) => v === 180).length,
    t140: values.filter((v) => v >= 140 && v < 180).length,
    t100: values.filter((v) => v >= 100 && v < 140).length,
    highCheckout: snap.config.mode === 'x01' ? Math.max(0, ...turns.filter((t) => t.won).map((t) => t.value)) : 0,
  }
}

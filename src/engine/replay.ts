import { MODES } from './modes'
import type { Dart, Game, GameConfig, GameEvent } from './types'

export interface TurnRecord {
  leg: number
  round: number
  p: number
  darts: Dart[]
  value: number
  bust: boolean
  /** this turn won the leg */
  won: boolean
  /** remaining/score before the turn – mode specific state before */
}

export type Flag = 'bust' | 'leg' | 'game' | 'shanghai' | 'limit' | null

export interface Snapshot {
  config: GameConfig
  n: number
  leg: number
  legStarter: number
  legsWon: number[]
  /** winner index per finished leg, null = draw */
  legWinners: (number | null)[]
  /** final mode state per finished leg */
  legStates: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any
  current: number
  round: number
  turnDarts: Dart[]
  turns: TurnRecord[]
  /** Round limit reached with tie / bull-off rule – waiting for manual winner pick */
  awaitingManual: number[] | null
  finished: boolean
  /** match winner, null = draw or not finished */
  winner: number | null
  /** final ranking (player indices, best first) – groups of tied players */
  ranking: number[][]
  /** what the last event caused (for UI notices) */
  lastFlag: Flag
}

export function rankPlayers(cfg: GameConfig, state: unknown, n: number, legsWon?: number[]): number[][] {
  const mode = MODES[cfg.mode]
  const cmp = (a: number, b: number) => {
    if (legsWon && legsWon[a] !== legsWon[b]) return legsWon[b] - legsWon[a]
    return mode.compare(cfg, state, a, b)
  }
  const sorted = [...Array(n).keys()].sort(cmp)
  const groups: number[][] = []
  for (const p of sorted) {
    const last = groups[groups.length - 1]
    if (last && cmp(last[0], p) === 0) last.push(p)
    else groups.push([p])
  }
  return groups
}

export function replay(game: Pick<Game, 'config' | 'players' | 'events'>): Snapshot {
  const cfg = game.config
  const n = game.players.length
  const mode = MODES[cfg.mode]
  const limit = mode.roundLimit(cfg)

  const snap: Snapshot = {
    config: cfg,
    n,
    leg: 1,
    legStarter: 0,
    legsWon: Array(n).fill(0),
    legWinners: [],
    legStates: [],
    state: mode.initLeg(cfg, n),
    current: 0,
    round: 1,
    turnDarts: [],
    turns: [],
    awaitingManual: null,
    finished: false,
    winner: null,
    ranking: [],
    lastFlag: null,
  }
  let turnStart = snap.state
  let turnsInRound = 0

  const startLeg = () => {
    snap.leg++
    snap.legStarter = (snap.leg - 1) % n
    snap.state = mode.initLeg(cfg, n)
    snap.current = snap.legStarter
    snap.round = 1
    snap.turnDarts = []
    turnStart = snap.state
    turnsInRound = 0
  }

  const endLeg = (winner: number | null) => {
    snap.legWinners.push(winner)
    snap.legStates.push(snap.state)
    snap.awaitingManual = null
    if (winner !== null) snap.legsWon[winner]++
    const matchOver = (winner !== null && snap.legsWon[winner] >= cfg.legs) || (winner === null && cfg.legs === 1)
    if (matchOver) {
      snap.finished = true
      snap.winner = winner
      snap.lastFlag = 'game'
    } else {
      snap.lastFlag = snap.lastFlag === 'shanghai' ? 'shanghai' : 'leg'
      startLeg()
    }
  }

  const recordTurn = (bust: boolean, won: boolean) => {
    snap.turns.push({
      leg: snap.leg,
      round: snap.round,
      p: snap.current,
      darts: snap.turnDarts,
      value: bust ? 0 : mode.turnValue(cfg, turnStart, snap.state, snap.current),
      bust,
      won,
    })
  }

  const nextPlayer = () => {
    snap.current = (snap.current + 1) % n
    snap.turnDarts = []
    turnStart = snap.state
    turnsInRound++
    if (turnsInRound < n) return
    turnsInRound = 0
    if (limit !== null && snap.round >= limit) {
      const ranked = rankPlayers(cfg, snap.state, n)
      const custom = mode.resolveLimit?.(cfg, snap.state, ranked.flat())
      snap.lastFlag = 'limit'
      if (custom === 'manual') {
        snap.awaitingManual = [...Array(n).keys()]
      } else if (custom !== undefined) {
        endLeg(custom)
      } else if (ranked[0].length === 1) {
        endLeg(ranked[0][0])
      } else if (cfg.tieBreak === 'bulloff') {
        snap.awaitingManual = ranked[0]
      } else {
        endLeg(null)
      }
      return
    }
    snap.round++
  }

  const apply = (ev: GameEvent) => {
    snap.lastFlag = null
    if (snap.finished) return
    if (ev.k === 'w') {
      if (snap.awaitingManual) endLeg(ev.p)
      return
    }
    if (snap.awaitingManual) return
    const d: Dart = { s: ev.s, m: ev.m }
    const r = mode.dart(cfg, snap.state, snap.current, d, { round: snap.round, turnDarts: snap.turnDarts })
    snap.turnDarts = [...snap.turnDarts, d]
    if (r.bust) {
      snap.state = turnStart
      recordTurn(true, false)
      snap.lastFlag = 'bust'
      nextPlayer()
      return
    }
    snap.state = r.state
    if (r.flag) snap.lastFlag = r.flag
    if (r.legWon) {
      recordTurn(false, true)
      endLeg(snap.current)
      return
    }
    if (r.endTurn || snap.turnDarts.length >= 3) {
      recordTurn(false, false)
      nextPlayer()
    }
  }

  for (const ev of game.events) apply(ev)

  const finalState = snap.finished ? snap.legStates[snap.legStates.length - 1] : snap.state
  snap.ranking = rankPlayers(cfg, finalState, n, cfg.legs > 1 ? snap.legsWon : undefined)
  if (snap.finished && snap.winner !== null) {
    // ensure match winner is first even if final-leg state compare disagrees (e.g. bull-off)
    snap.ranking = [[snap.winner], ...snap.ranking.map((g) => g.filter((p) => p !== snap.winner)).filter((g) => g.length)]
  }
  return snap
}

/** Number of darts the current player may still throw this turn */
export const dartsLeft = (s: Snapshot) => 3 - s.turnDarts.length

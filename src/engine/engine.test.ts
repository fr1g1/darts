import { describe, expect, it } from 'vitest'
import { replay, suggestCheckout, playerStats } from './index'
import type { GameConfig, GameEvent, Mult, PlayerProfile } from './types'

const players = (n: number): PlayerProfile[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: 'P' + i, color: '#000' }))

const parse = (s: string): GameEvent[] =>
  s.trim().split(/\s+/).filter(Boolean).map((tok) => {
    if (tok === '-') return { k: 'd', s: 0, m: 1 }
    if (tok === 'BULL') return { k: 'd', s: 25, m: 2 }
    if (tok.startsWith('W')) return { k: 'w', p: tok === 'Wn' ? null : Number(tok.slice(1)) }
    const m: Mult = tok[0] === 'T' ? 3 : tok[0] === 'D' ? 2 : 1
    return { k: 'd', s: Number(m === 1 ? tok : tok.slice(1)), m }
  })

const run = (config: GameConfig, n: number, evs: string) => replay({ config, players: players(n), events: parse(evs) })

const x01 = (o: Partial<Extract<GameConfig, { mode: 'x01' }>> = {}): GameConfig => ({
  mode: 'x01', start: 501, inMode: 'straight', outMode: 'double', maxRounds: null, limitRule: 'lowest', legs: 1, tieBreak: 'draw', ...o,
})

describe('x01', () => {
  it('subtracts and rotates players', () => {
    const s = run(x01(), 2, 'T20 T20 T20 20 20 20')
    expect(s.state.rem).toEqual([321, 441])
    expect(s.current).toBe(0)
    expect(s.round).toBe(2)
  })
  it('busts below zero and reverts turn', () => {
    const s = run(x01({ start: 50 }), 2, '20 T20')
    expect(s.state.rem[0]).toBe(50)
    expect(s.current).toBe(1)
    expect(s.lastFlag).toBe('bust')
    expect(s.turns[0].bust).toBe(true)
  })
  it('busts on remaining 1 with double out', () => {
    const s = run(x01({ start: 41 }), 1, '20 20')
    expect(s.state.rem[0]).toBe(41)
  })
  it('busts on non-double finish', () => {
    const s = run(x01({ start: 40 }), 2, '20 20')
    expect(s.state.rem[0]).toBe(40)
    expect(s.finished).toBe(false)
  })
  it('finishes on double, bull counts as D25', () => {
    expect(run(x01({ start: 40 }), 2, 'D20').winner).toBe(0)
    const s = run(x01({ start: 50 }), 2, 'BULL')
    expect(s.finished).toBe(true)
    expect(s.winner).toBe(0)
  })
  it('straight out allows any finish, master out allows triple', () => {
    expect(run(x01({ start: 41, outMode: 'straight' }), 1, '20 20 1').finished).toBe(true)
    expect(run(x01({ start: 60, outMode: 'master' }), 1, 'T20').finished).toBe(true)
    expect(run(x01({ start: 60, outMode: 'master' }), 1, '20 20 20').finished).toBe(false)
  })
  it('double in ignores darts before a double', () => {
    const s = run(x01({ inMode: 'double' }), 1, 'T20 D10 T20')
    expect(s.state.rem[0]).toBe(501 - 20 - 60)
  })
  it('legs rotate the starter and count wins', () => {
    const s = run(x01({ start: 40, legs: 2 }), 2, 'D20 D20')
    expect(s.legsWon).toEqual([1, 1])
    expect(s.finished).toBe(false)
    expect(s.current).toBe(0)
    const s2 = run(x01({ start: 40, legs: 2 }), 2, 'D20 D20 D20')
    expect(s2.winner).toBe(0)
  })
  it('round limit: lowest remaining wins', () => {
    const s = run(x01({ maxRounds: 1 }), 2, 'T20 T20 T20 20 20 20')
    expect(s.finished).toBe(true)
    expect(s.winner).toBe(0)
  })
  it('round limit with bull-off waits for manual winner', () => {
    const s = run(x01({ maxRounds: 1, limitRule: 'bulloff' }), 2, 'T20 T20 T20 20 20 20')
    expect(s.awaitingManual).toEqual([0, 1])
    const s2 = run(x01({ maxRounds: 1, limitRule: 'bulloff' }), 2, 'T20 T20 T20 20 20 20 W1')
    expect(s2.winner).toBe(1)
    expect(s2.ranking[0]).toEqual([1])
  })
  it('stats: average', () => {
    const s = run(x01(), 2, 'T20 T20 T20 20 20 20')
    expect(playerStats(s, 0).avgRound).toBe(180)
    expect(playerStats(s, 0).avgDart).toBe(60)
    expect(playerStats(s, 1).avgDart).toBe(20)
    expect(playerStats(s, 0).t180).toBe(1)
  })
})

describe('cricket', () => {
  const cfg = (scoring: 'standard' | 'cutthroat' | 'none' = 'standard'): GameConfig => ({ mode: 'cricket', scoring, maxRounds: 20, legs: 1, tieBreak: 'draw' })
  it('closes numbers and scores on open opponents', () => {
    const s = run(cfg(), 2, 'T20 T20 - - - -')
    expect(s.state.marks[0][0]).toBe(3)
    expect(s.state.score[0]).toBe(60)
  })
  it('no points when all opponents closed (3 players)', () => {
    const s = run(cfg(), 3, 'T20 - - T20 - - - - - 20')
    // P0 closed, P1 closed, P2 open → P0 scores 20
    expect(s.state.score[0]).toBe(20)
    const s2 = run(cfg(), 3, 'T20 - - T20 - - T20 - - 20')
    expect(s2.state.score[0]).toBe(0)
  })
  it('bull: outer 1 mark, inner 2 marks', () => {
    const s = run(cfg(), 1, '25 BULL')
    expect(s.state.marks[0][6]).toBe(3)
  })
  it('win requires all closed and score >= opponents', () => {
    const all = 'T20 T19 T18 - - - T17 T16 T15 - - - BULL 25'
    expect(run(cfg(), 2, all).winner).toBe(0)
  })
  it('cutthroat gives points to opponents', () => {
    const s = run(cfg('cutthroat'), 2, 'T20 20')
    expect(s.state.score).toEqual([0, 20])
  })
})

describe('score modes', () => {
  it('highscore sums over rounds', () => {
    const s = run({ mode: 'highscore', rounds: 1, legs: 1, tieBreak: 'draw' }, 2, 'T20 T20 T20 1 1 1')
    expect(s.finished).toBe(true)
    expect(s.winner).toBe(0)
  })
  it('highscore tie → draw or bull-off', () => {
    expect(run({ mode: 'highscore', rounds: 1, legs: 1, tieBreak: 'draw' }, 2, '1 1 1 1 1 1').finished).toBe(true)
    expect(run({ mode: 'highscore', rounds: 1, legs: 1, tieBreak: 'bulloff' }, 2, '1 1 1 1 1 1').awaitingManual).toEqual([0, 1])
  })
  it('shanghai counts only target and instant-wins', () => {
    const s = run({ mode: 'shanghai', rounds: 7, instantWin: true, legs: 1, tieBreak: 'draw' }, 2, '1 2 D1 2 2 2')
    expect(s.state.score).toEqual([3, 0])
    const w = run({ mode: 'shanghai', rounds: 7, instantWin: true, legs: 1, tieBreak: 'draw' }, 2, 'T1 1 D1')
    expect(w.winner).toBe(0)
    expect(w.lastFlag).toBe('game')
  })
  it('baseball scores 1/2/3 on inning number', () => {
    const s = run({ mode: 'baseball', innings: 9, legs: 1, tieBreak: 'draw' }, 1, '1 D1 T1 2 T2 5')
    expect(s.state.score[0]).toBe(10)
  })
})

describe('checkout', () => {
  it('suggests common finishes', () => {
    expect(suggestCheckout(170, 3, 'double')?.map((d) => d.s * d.m)).toEqual([60, 60, 50])
    expect(suggestCheckout(40, 1, 'double')).toEqual([{ s: 20, m: 2 }])
    expect(suggestCheckout(100, 2, 'double')?.map((d) => d.s * d.m)).toEqual([60, 40])
    expect(suggestCheckout(159, 3, 'double')).toBeNull()
    expect(suggestCheckout(171, 3, 'double')).toBeNull()
  })
})

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { replay } from '../engine'
import type { Game, GameConfig, ModeId, Mult, PlayerProfile } from '../engine'
import type { Lang } from '../i18n'

export type Screen = 'home' | 'players' | 'setup' | 'game' | 'results' | 'history'
export type Theme = 'system' | 'light' | 'dark'

export const MAX_PLAYERS = 6

export const PLAYER_COLORS = ['#e4572e', '#2e9b5f', '#3b82f6', '#f2b134', '#a855f7', '#ec4899', '#14b8a6', '#94a3b8']

export const DEFAULT_CONFIGS: Record<ModeId, GameConfig> = {
  x01: { mode: 'x01', start: 501, inMode: 'straight', outMode: 'double', maxRounds: null, limitRule: 'lowest', legs: 1, tieBreak: 'bulloff' },
  highscore: { mode: 'highscore', rounds: 7, legs: 1, tieBreak: 'draw' },
  shanghai: { mode: 'shanghai', rounds: 7, instantWin: true, legs: 1, tieBreak: 'draw' },
  baseball: { mode: 'baseball', innings: 9, legs: 1, tieBreak: 'draw' },
  cricket: { mode: 'cricket', scoring: 'standard', maxRounds: 20, legs: 1, tieBreak: 'draw' },
}

const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string

/** Two configs are the same preset when all their settings are equal (key order ignored) */
export const sameConfig = (a: GameConfig, b: GameConfig) => {
  const norm = (c: GameConfig) => JSON.stringify(Object.fromEntries(Object.entries(c).sort(([x], [y]) => x.localeCompare(y))))
  return norm(a) === norm(b)
}

export interface GamePreset {
  id: string
  name: string
  config: GameConfig
}

interface AppState {
  lang: Lang
  theme: Theme
  inputView: 'keypad' | 'board'
  /** tap-on-dartboard input enabled */
  showBoard: boolean
  screen: Screen
  /** game id shown on results screen */
  viewGameId: string | null
  players: PlayerProfile[]
  game: Game | null
  history: Game[]
  lastConfig: Record<ModeId, GameConfig>
  lastMode: ModeId
  lastPlayerIds: string[]
  /** user-saved game configurations */
  presets: GamePreset[]

  setLang(l: Lang): void
  setTheme(t: Theme): void
  setInputView(v: 'keypad' | 'board'): void
  setShowBoard(v: boolean): void
  go(s: Screen, viewGameId?: string | null): void

  savePlayer(p: Omit<PlayerProfile, 'id'> & { id?: string }): PlayerProfile
  deletePlayer(id: string): void

  startGame(config: GameConfig, playerIds: string[]): void
  rematch(): void
  throwDart(s: number, m: Mult): void
  pickWinner(p: number | null): void
  endTurn(): void
  undo(): void
  abandon(): void
  deleteHistory(id?: string): void
  savePreset(name: string, config: GameConfig): void
  deletePreset(id: string): void
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v) } catch { /* storage unavailable */ }
  },
  removeItem: (k) => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  },
}

/** Apply finished state: move finished game into history */
function settle(game: Game, history: Game[]): { game: Game; history: Game[] } {
  const snap = replay(game)
  if (snap.finished && !game.finishedAt) {
    const g = { ...game, finishedAt: Date.now() }
    return { game: g, history: [g, ...history.filter((h) => h.id !== g.id)].slice(0, 100) }
  }
  if (!snap.finished && game.finishedAt) {
    const g = { ...game, finishedAt: undefined }
    return { game: g, history: history.filter((h) => h.id !== g.id) }
  }
  return { game, history }
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      lang: 'cs',
      theme: 'system',
      inputView: 'keypad',
      showBoard: true,
      screen: 'home',
      viewGameId: null,
      players: [],
      game: null,
      history: [],
      lastConfig: DEFAULT_CONFIGS,
      lastMode: 'x01',
      lastPlayerIds: [],
      presets: [],

      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setInputView: (inputView) => set({ inputView }),
      setShowBoard: (showBoard) => set(showBoard ? { showBoard } : { showBoard, inputView: 'keypad' }),
      go: (screen, viewGameId = null) => {
        set({ screen, viewGameId })
        try { window.scrollTo(0, 0) } catch { /* noop */ }
      },

      savePlayer(p) {
        const existing = p.id ? get().players.find((x) => x.id === p.id) : undefined
        const player: PlayerProfile = {
          id: existing?.id ?? uid(),
          name: p.name.trim(),
          color: p.color,
        }
        set((s) => ({
          players: existing ? s.players.map((x) => (x.id === player.id ? player : x)) : [...s.players, player],
        }))
        return player
      },
      deletePlayer: (id) => set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

      startGame(config, playerIds) {
        const all = get().players
        const players = (playerIds.map((id) => all.find((p) => p.id === id)).filter(Boolean) as PlayerProfile[]).slice(0, MAX_PLAYERS)
        if (!players.length) return
        set((s) => ({
          game: { id: uid(), config, players, events: [], startedAt: Date.now() },
          lastConfig: { ...s.lastConfig, [config.mode]: config },
          lastMode: config.mode,
          lastPlayerIds: playerIds,
          screen: 'game',
          viewGameId: null,
        }))
      },
      rematch() {
        const { viewGameId, history, game } = get()
        const g = (viewGameId ? history.find((h) => h.id === viewGameId) : null) ?? game
        if (!g) return
        // rotate player order so a different player starts
        const players = [...g.players.slice(1), g.players[0]]
        set({
          game: { id: uid(), config: g.config, players, events: [], startedAt: Date.now() },
          screen: 'game',
          viewGameId: null,
        })
      },
      throwDart(s, m) {
        const { game, history } = get()
        if (!game || game.finishedAt) return
        const snap = replay(game)
        if (snap.awaitingManual) return
        set(settle({ ...game, events: [...game.events, { k: 'd', s, m }] }, history))
      },
      pickWinner(p) {
        const { game, history } = get()
        if (!game) return
        set(settle({ ...game, events: [...game.events, { k: 'w', p }] }, history))
      },
      endTurn() {
        const { game, history } = get()
        if (!game || game.finishedAt) return
        const snap = replay(game)
        if (snap.awaitingManual || snap.turnDarts.length === 0) return
        const fill = Array.from({ length: 3 - snap.turnDarts.length }, () => ({ k: 'd' as const, s: 0, m: 1 as Mult, auto: true }))
        set(settle({ ...game, events: [...game.events, ...fill] }, history))
      },
      undo() {
        const { game, history } = get()
        if (!game || !game.events.length) return
        const events = [...game.events]
        if (events[events.length - 1].k === 'd' && (events[events.length - 1] as { auto?: boolean }).auto) {
          while (events.length && events[events.length - 1].k === 'd' && (events[events.length - 1] as { auto?: boolean }).auto) events.pop()
        } else {
          events.pop()
        }
        set({ ...settle({ ...game, events }, history), screen: 'game' })
      },
      abandon: () => set({ game: null, screen: 'home' }),
      savePreset: (name, config) =>
        set((s) => {
          const n = name.trim()
          if (!n) return {}
          // same name → overwrite that preset, otherwise append
          const existing = s.presets.find((p) => p.name.toLowerCase() === n.toLowerCase())
          // never keep two presets with identical settings
          if (s.presets.some((p) => p.id !== existing?.id && sameConfig(p.config, config))) return {}
          return existing
            ? { presets: s.presets.map((p) => (p.id === existing.id ? { ...p, name: n, config } : p)) }
            : { presets: [...s.presets, { id: uid(), name: n, config }] }
        }),
      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      deleteHistory: (id) => set((s) => ({ history: id ? s.history.filter((h) => h.id !== id) : [] })),
    }),
    {
      name: 'darts-app:v1',
      version: 2,
      migrate: (persisted) => persisted as AppState,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        lang: s.lang,
        theme: s.theme,
        inputView: s.inputView,
        showBoard: s.showBoard,
        screen: s.screen,
        viewGameId: s.viewGameId,
        players: s.players,
        game: s.game,
        history: s.history,
        lastConfig: s.lastConfig,
        lastMode: s.lastMode,
        lastPlayerIds: s.lastPlayerIds,
        presets: s.presets,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        // v1 had separate name + nickname → keep only the nickname (fallback to name)
        const norm = (x: PlayerProfile & { nickname?: string }): PlayerProfile => ({
          id: x.id,
          name: (x.nickname || x.name || '').trim(),
          color: x.color,
        })
        const normGame = (g: Game | null | undefined) => (g ? { ...g, players: g.players.map(norm) } : null)
        return {
          ...current,
          ...p,
          players: (p.players ?? []).map(norm),
          game: normGame(p.game),
          history: (p.history ?? []).map((g) => normGame(g)!),
          lastConfig: { ...DEFAULT_CONFIGS, ...(p.lastConfig ?? {}) },
          presets: Array.isArray(p.presets) ? p.presets : [],
        }
      },
    },
  ),
)

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  CRICKET_TARGETS,
  playerStats,
  shanghaiTarget,
  type CricketState,
  type Game,
  type ScoreState,
  type Snapshot,
  type X01State,
} from '../../engine'
import { useT } from '../../i18n'

interface BoardProps {
  game: Game
  snap: Snapshot
}

function LegPips({ won, need }: { won: number; need: number }) {
  if (need <= 1) return null
  return (
    <span className="flex shrink-0 gap-1" aria-label={`${won}/${need}`}>
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < won ? 'bg-gold' : 'bg-line'}`} />
      ))}
    </span>
  )
}

/** Ø – average icon */
export function AvgIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block h-[1em] w-[1em] shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M4 20L20 4" />
    </svg>
  )
}

/** Averages line: per dart and per round, with an average icon instead of text */
function Averages({ snap, p, dec = 1, unitClass = '', wrap = false }: { snap: Snapshot; p: number; dec?: number; unitClass?: string; wrap?: boolean }) {
  const t = useT()
  const st = playerStats(snap, p)
  const item = (v: number, unit: string, title: string) => (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={title}>
      <AvgIcon className="text-muted" />
      <span className="num font-bold text-ink">{v.toFixed(dec)}</span>
      <span className={`avg-unit text-[0.85em] text-muted ${unitClass}`}>/{unit}</span>
    </span>
  )
  return (
    <div className={`flex items-center gap-x-3 leading-tight ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
      {item(st.avgDart, t('perDart'), t('avgDart'))}
      {item(st.avgRound, t('perRound'), t('avgRound'))}
    </div>
  )
}

/** Same size for every player – the active one only gets a coloured border */
function PlayerCard({
  game,
  snap,
  p,
  value,
  children,
}: BoardProps & { p: number; value: ReactNode; children?: ReactNode }) {
  const pl = game.players[p]
  const active = p === snap.current && !snap.finished
  return (
    <div
      className="pcard relative overflow-hidden rounded-2xl border-2 bg-surface px-3 py-1.5"
      style={{ borderColor: active ? pl.color : 'var(--line)' }}
    >
      <div className="pcard-inner">
        <div className="pcard-head flex min-w-0 items-center gap-[0.4em]">
          <span
            className="num inline-flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center rounded-full text-[0.8em] font-bold text-white"
            style={{ background: pl.color }}
          >
            {pl.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{pl.name}</span>
          <LegPips won={snap.legsWon[p]} need={game.config.legs} />
        </div>
        <div className="pcard-num num font-bold">{value}</div>
        {children && <div className="pcard-extra min-w-0">{children}</div>}
      </div>
    </div>
  )
}

const MIN_ONE_COL_ROW = 64

/** Player cards stacked in one column whenever there is room; 2 columns only when the area is too low */
function CardGrid({ n, children }: { n: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const perRow = (el.clientHeight - (n - 1) * 8) / n
      setCols(n > 1 && perRow < MIN_ONE_COL_ROW ? 2 : 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [n])
  const rows2 = Math.ceil(n / 2)
  return (
    <div
      ref={ref}
      className="grid min-h-0 flex-1 auto-rows-fr gap-2"
      // min height = what the 2-column fallback needs, so the measured height never depends on the column count
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, minHeight: rows2 * 56 + (rows2 - 1) * 8 }}
    >
      {children}
    </div>
  )
}

// ---------------- X01 ----------------
export function X01Board({ game, snap }: BoardProps) {
  const t = useT()
  const st = snap.state as X01State
  const cfg = game.config.mode === 'x01' ? game.config : null
  if (!cfg) return null
  return (
    <div className="flex h-full flex-col gap-2">
      <CardGrid n={game.players.length}>
        {game.players.map((pl, i) => {
          return (
            <PlayerCard key={pl.id} game={game} snap={snap} p={i} value={st.rem[i]}>
              <Averages snap={snap} p={i} />
              {!st.opened[i] && <div className="text-xs font-semibold text-gold">{t('notOpened')}</div>}
            </PlayerCard>
          )
        })}
      </CardGrid>
    </div>
  )
}

// ---------------- Score modes ----------------
const MAX_TABLE_ROUNDS = 10

export function ScoreBoard({ game, snap }: BoardProps) {
  const t = useT()
  const st = snap.state as ScoreState
  const cfg = game.config
  const rounds = cfg.mode === 'highscore' ? cfg.rounds : cfg.mode === 'shanghai' ? cfg.rounds : cfg.mode === 'baseball' ? cfg.innings : 0
  const target = cfg.mode === 'shanghai' ? shanghaiTarget(snap.round) : cfg.mode === 'baseball' ? snap.round : null
  const legTurns = snap.turns.filter((x) => x.leg === snap.leg)
  const cell = (p: number, r: number) => legTurns.find((x) => x.p === p && x.round === r)
  // show at most 10 rounds (a window ending at the current round) so the table never scrolls
  const last = Math.min(rounds, Math.max(snap.round, MAX_TABLE_ROUNDS))
  const first = Math.max(1, last - MAX_TABLE_ROUNDS + 1)
  const shown = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  return (
    <div className="flex h-full flex-col gap-2">
      {target !== null && (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-ink px-4 py-0.5 text-bg sm:py-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-70">{t('target')}</span>
          <span className="num text-3xl font-bold sm:text-4xl">{target === 25 ? 'BULL' : target}</span>
          <span className="num ml-auto text-lg opacity-70">
            {t('round')} {snap.round}/{rounds}
          </span>
        </div>
      )}
      {/* the round table is the whole scoreboard: rounds, Σ total and per-player averages; rows stretch to the available height */}
      <div className="flex min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-surface">
        <table className="num h-full w-full table-fixed text-center text-lg leading-tight sm:text-2xl lg:text-3xl">
          <colgroup>
            <col className="w-[27%]" />
            {shown.map((r) => (
              <col key={r} />
            ))}
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="text-sm text-muted sm:text-base">
              <th className="px-2 py-0.5 text-left font-semibold sm:py-1">{t('round')}</th>
              {shown.map((r) => (
                <th key={r} className={`py-1 font-semibold ${r === snap.round ? 'bg-surface-2 text-ink' : ''}`}>
                  {cfg.mode === 'shanghai' && shanghaiTarget(r) === 25 ? 'B' : r}
                </th>
              ))}
              <th className="border-l border-line py-1 font-semibold text-ink" title={t('total')}>
                Σ
              </th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, i) => {
              const active = i === snap.current && !snap.finished
              return (
                <tr key={p.id} className="border-t border-line" style={active ? { boxShadow: `inset 4px 0 0 ${p.color}` } : undefined}>
                  <td className="px-2 py-0 text-left font-sans leading-tight sm:py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-sm leading-none font-semibold sm:text-lg sm:leading-tight lg:text-xl" style={{ color: p.color }}>
                        {p.name}
                      </span>
                      <LegPips won={snap.legsWon[i]} need={cfg.legs} />
                    </div>
                    <div className="mt-0.5 text-[11px] leading-none font-normal sm:mt-0 sm:text-sm sm:leading-tight lg:text-base">
                      <Averages snap={snap} p={i} unitClass="hidden sm:inline" wrap />
                    </div>
                  </td>
                  {shown.map((r) => {
                    const v = cell(i, r)?.value
                    return (
                      <td key={r} className={`py-0.5 font-bold ${r === snap.round ? 'bg-surface-2' : ''} ${v === 0 ? 'text-muted' : ''}`}>
                        {v ?? ''}
                      </td>
                    )
                  })}
                  <td className="border-l border-line bg-ink/5 py-0.5 font-extrabold">{st.score[i]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Cricket ----------------
/** Cricket marks as dots: one filled dot per hit (max 3), empty rings for the hits still missing.
    A closed number (3 hits) shows three filled dots in green (colour comes from the cell). */
function Mark({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center gap-[0.3em] align-middle text-[1.2rem] leading-none sm:text-[1.7rem]" aria-label={`${n}/3`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-[0.5em] w-[0.5em] rounded-full ${i < n ? 'bg-current' : 'border-2 border-current opacity-20'}`}
        />
      ))}
    </span>
  )
}

function splitInsert<T>(cells: T[], label: T, n: number): T[] {
  const half = n > 1 ? Math.ceil(n / 2) : n
  return [...cells.slice(0, half), label, ...cells.slice(half)]
}

export function CricketBoard({ game, snap }: BoardProps) {
  const t = useT()
  const st = snap.state as CricketState
  const cfg = game.config.mode === 'cricket' ? game.config : null
  if (!cfg) return null
  const n = game.players.length
  const heads = game.players.map((p, i) => {
    const active = i === snap.current && !snap.finished
    const stats = playerStats(snap, i)
    return (
      <th key={p.id} className="px-1 pt-1.5 pb-1 align-top" style={{ borderTop: `4px solid ${active ? p.color : 'transparent'}` }}>
        <div className="truncate text-sm font-semibold sm:text-base" style={{ color: p.color }}>
          {p.name}
        </div>
        {cfg.scoring !== 'none' && <div className="num text-2xl leading-tight font-bold sm:text-4xl">{st.score[i]}</div>}
        <div className="flex flex-col items-center text-xs leading-tight font-normal text-muted sm:text-sm">
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap" title={t('mpd')}>
            <AvgIcon /> <b className="num text-ink">{stats.avgDart.toFixed(2)}</b>/{t('perDart')}
          </span>
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap" title={t('mpr')}>
            <AvgIcon /> <b className="num text-ink">{stats.avgRound.toFixed(2)}</b>/{t('perRound')}
          </span>
          <LegPips won={snap.legsWon[i]} need={cfg.legs} />
        </div>
      </th>
    )
  })
  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-line bg-surface">
      <table className="h-full w-full table-fixed text-center">
        <colgroup>{splitInsert(game.players.map((p) => <col key={p.id} />), <col key="label" className="w-12" />, n)}</colgroup>
        <thead>
          <tr>{splitInsert(heads, <th key="label" className="bg-ink/5" />, n)}</tr>
        </thead>
        <tbody>
          {CRICKET_TARGETS.map((tg, ti) => {
            const closedAll = st.marks.every((m) => m[ti] >= 3)
            const cells = game.players.map((p, i) => (
              <td key={p.id} className="py-0" style={{ color: st.marks[i][ti] >= 3 ? 'var(--green)' : undefined }}>
                <Mark n={st.marks[i][ti]} />
              </td>
            ))
            const label = (
              <td key="label" className={`num border-x border-line bg-ink/5 text-lg leading-tight font-bold sm:text-2xl ${closedAll ? 'text-muted line-through' : ''}`}>
                {tg === 25 ? 'B' : tg}
              </td>
            )
            return (
              <tr key={tg} className="border-t border-line">
                {splitInsert(cells, label, n)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function GameBoard(props: BoardProps) {
  switch (props.game.config.mode) {
    case 'x01':
      return <X01Board {...props} />
    case 'cricket':
      return <CricketBoard {...props} />
    default:
      return <ScoreBoard {...props} />
  }
}

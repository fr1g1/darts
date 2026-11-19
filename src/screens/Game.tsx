import { useEffect, useMemo, useRef, useState } from 'react'
import { CRICKET_TARGETS, replay, shanghaiTarget, type Mult } from '../engine'
import { useT } from '../i18n'
import { useApp } from '../store/app'
import { configLabel, playerLabel } from '../share/format'
import { GameBoard } from '../components/scoreboards/Boards'
import { TurnBar } from '../components/TurnBar'
import { BoardControls, Keypad, type InputProps } from '../components/Keypad'
import { Dartboard } from '../components/Dartboard'
import { Avatar, Button, Segmented } from '../components/ui'
import { SettingsButtons } from '../components/Settings'

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (!nav.wakeLock?.request) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lock: any = null
    let cancelled = false
    const req = () =>
      nav.wakeLock
        .request('screen')
        .then((l: unknown) => {
          if (cancelled) (l as { release(): void }).release()
          else lock = l
        })
        .catch(() => {})
    req()
    const onVis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release?.()
    }
  }, [active])
}

function KeypadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-label="keypad">
      {[4, 10, 16].flatMap((y) => [4, 10, 16].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4.5" height="4.5" rx="1" />))}
    </svg>
  )
}

function BoardIcon({ off }: { off?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="board">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      {off && <path d="M4 4l16 16" strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  )
}

export function Game() {
  const t = useT()
  const app = useApp()
  const game = app.game!
  const snap = useMemo(() => replay(game), [game])
  const [mult, setMult] = useState<Mult>(1)
  const [buffer, setBuffer] = useState('')
  const [notice, setNotice] = useState<{ key: number; text: string; tone: 'bad' | 'good' | 'info' } | null>(null)
  const prevLen = useRef(game.events.length)
  useWakeLock(!snap.finished)

  const blocked = snap.finished || !!snap.awaitingManual
  const cfg = game.config
  const highlight =
    cfg.mode === 'cricket'
      ? [...CRICKET_TARGETS]
      : cfg.mode === 'shanghai'
        ? [shanghaiTarget(snap.round)]
        : cfg.mode === 'baseball'
          ? [snap.round]
          : null

  // notices for bust / leg / shanghai
  useEffect(() => {
    const len = game.events.length
    const grew = len > prevLen.current
    prevLen.current = len
    if (!grew) return
    const f = snap.lastFlag
    let n: typeof notice = null
    if (f === 'bust') n = { key: len, text: t('bust'), tone: 'bad' }
    else if (f === 'shanghai') n = { key: len, text: t('shanghai'), tone: 'good' }
    else if (f === 'leg') {
      const w = snap.legWinners[snap.legWinners.length - 1]
      n = { key: len, text: w === null ? t('draw') : `${t('legWon')} ${game.players[w].name}`, tone: 'good' }
    } else if (f === 'limit' && snap.awaitingManual) n = null
    else if (f === 'limit') n = { key: len, text: t('limitReached'), tone: 'info' }
    if (n) setNotice(n)
  }, [game.events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 1400)
    return () => window.clearTimeout(id)
  }, [notice])

  const onDart = (s: number, m: Mult) => {
    if (blocked) return
    try {
      navigator.vibrate?.(12)
    } catch {
      /* noop */
    }
    app.throwDart(s, m)
  }

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (/^[0-9]$/.test(k)) {
        setBuffer((b) => (b + k).slice(-2))
        return
      }
      if (k === 'enter' || k === ' ') {
        e.preventDefault()
        if (buffer) {
          const v = parseInt(buffer, 10)
          if (v === 0) onDart(0, 1)
          else if ((v >= 1 && v <= 20) || (v === 25 && mult !== 3)) onDart(v, v === 25 && mult === 2 ? 2 : mult)
          setBuffer('')
          setMult(1)
        } else app.endTurn()
        return
      }
      if (k === 'd') setMult((m) => (m === 2 ? 1 : 2))
      else if (k === 't') setMult((m) => (m === 3 ? 1 : 3))
      else if (k === 's') setMult(1)
      else if (k === 'b') {
        onDart(25, 2)
        setMult(1)
      } else if (k === 'm') onDart(0, 1)
      else if (k === 'backspace') {
        e.preventDefault()
        if (buffer) setBuffer((b) => b.slice(0, -1))
        else app.undo()
      } else if (k === 'escape') {
        setBuffer('')
        setMult(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const inputProps: InputProps = {
    onDart,
    onUndo: app.undo,
    canUndo: game.events.length > 0,
    disabled: blocked,
    highlight,
    mult,
    setMult,
  }
  const showBoard = app.showBoard
  const boardInCol2 = showBoard && app.inputView === 'board'

  const winner = snap.winner !== null ? game.players[snap.winner] : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line bg-bg">
        <div className="mx-auto flex h-13 max-w-[1600px] items-center gap-1 px-2 sm:px-4 short:h-11">
          <button onClick={() => app.go('home')} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2" aria-label={t('home')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="num min-w-0 flex-1 truncate text-xl font-bold uppercase sm:text-2xl">{configLabel(game, t)}</h1>
          {showBoard && (
            <div className="tri:hidden">
              <Segmented
                nowrap
                compact
                value={app.inputView}
                onChange={app.setInputView}
                options={[
                  { value: 'keypad', label: <KeypadIcon /> },
                  { value: 'board', label: <BoardIcon /> },
                ]}
              />
            </div>
          )}
          <button
            onClick={() => app.setShowBoard(!showBoard)}
            className={`h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2 ${showBoard ? 'hidden tri:flex' : 'flex text-muted'}`}
            title={showBoard ? t('boardOff') : t('boardOn')}
            aria-label={showBoard ? t('boardOff') : t('boardOn')}
            aria-pressed={showBoard}
          >
            <BoardIcon off={!showBoard} />
          </button>
          <div className="hidden sm:block">
            <SettingsButtons />
          </div>
          <button
            onClick={() => confirm(t('confirmAbandon')) && app.abandon()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-accent hover:bg-surface-2"
            title={t('abandon')}
            aria-label={t('abandon')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Keypad and tap-on-board share one input box of identical size: switching views never moves the layout */}
      <main
        className={`mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-2 p-2 sm:gap-3 sm:p-3 wide:grid-cols-[minmax(0,1fr)_minmax(320px,min(50vw,calc(100dvh-200px)))] wide:grid-rows-1 short:gap-2 short:p-1.5 short:wide:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] ${
          showBoard ? 'tri:grid-cols-[minmax(300px,1fr)_minmax(300px,420px)_min(38vw,calc(100dvh-100px))]' : ''
        }`}
      >
        <section className="min-h-0 overflow-y-auto overscroll-contain">
          <GameBoard game={game} snap={snap} />
        </section>
        <section className="flex min-h-0 w-full flex-col gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <TurnBar game={game} snap={snap} />
          <div className="relative h-[42dvh] shrink-0 wide:h-auto wide:min-h-0 wide:flex-1">
            <div className={`h-full ${boardInCol2 ? 'hidden tri:block' : ''}`}>
              <Keypad {...inputProps} />
            </div>
            {boardInCol2 && (
              <div className="flex h-full flex-col gap-1.5 tri:hidden short:flex-row">
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <Dartboard onDart={onDart} disabled={blocked} highlight={highlight} className="h-full w-full" />
                </div>
                <BoardControls {...inputProps} />
              </div>
            )}
            {buffer && (
              <div className="num pointer-events-none absolute inset-x-0 top-1 z-10 mx-auto w-fit rounded-lg bg-gold px-3 py-0.5 text-lg font-bold text-white shadow">
                {mult === 3 ? 'T' : mult === 2 ? 'D' : ''}
                {buffer} ⏎
              </div>
            )}
          </div>
        </section>
        {showBoard && (
          <section className="hidden min-h-0 flex-col gap-1.5 tri:flex">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Dartboard onDart={onDart} disabled={blocked} highlight={highlight} className="h-full w-full" />
            </div>
            <BoardControls {...inputProps} />
          </section>
        )}
      </main>

      {notice && (
        <div key={notice.key} className="pointer-events-none fixed inset-x-0 top-1/3 z-40 flex justify-center">
          <div
            className={`animate-flash num rounded-2xl px-8 py-4 text-5xl font-extrabold tracking-wide uppercase shadow-2xl sm:text-6xl ${
              notice.tone === 'bad' ? 'bg-accent text-white' : notice.tone === 'good' ? 'bg-green text-white' : 'bg-ink text-bg'
            }`}
          >
            {notice.text}
          </div>
        </div>
      )}

      {snap.awaitingManual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="animate-pop w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">{t('limitReached')}</div>
            <h2 className="num mt-1 text-3xl font-bold">{t('pickWinner')}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {snap.awaitingManual.map((p) => (
                <button
                  key={p}
                  onClick={() => app.pickWinner(p)}
                  className="flex h-14 items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 text-left text-lg font-semibold hover:border-ink/40"
                >
                  <Avatar name={game.players[p].name} color={game.players[p].color} size={36} />
                  {playerLabel(game.players[p])}
                </button>
              ))}
              <Button variant="ghost" onClick={app.undo}>
                ↶ {t('undoLast')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {snap.finished && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
          <div className="animate-pop w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl">
            <div className="flex flex-col items-center gap-2 p-6 text-center" style={{ background: winner ? `color-mix(in srgb, ${winner.color} 22%, transparent)` : undefined }}>
              <div className="text-5xl">{winner ? '🏆' : '🤝'}</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted">{winner ? t('gameWon') : t('draw')}</div>
              {winner && <div className="num text-4xl font-extrabold">{playerLabel(winner)}</div>}
              <div className="text-sm text-muted">{configLabel(game, t)}</div>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button variant="primary" size="lg" onClick={() => app.go('results')}>
                {t('results')} →
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={app.rematch}>{t('rematch')}</Button>
                <Button variant="ghost" onClick={app.undo}>
                  ↶ {t('undoLast')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

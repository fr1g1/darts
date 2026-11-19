import { useMemo } from 'react'
import { replay } from '../engine'
import { useT } from '../i18n'
import { useApp } from '../store/app'
import { configLabel } from '../share/format'
import { SettingsButtons } from '../components/Settings'
import { Avatar } from '../components/ui'

function BoardMark() {
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 sm:h-20 sm:w-20">
      <circle cx="50" cy="50" r="48" fill="var(--board-black)" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray="12.56 12.56" />
      <circle cx="50" cy="50" r="30" fill="var(--board-cream)" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="var(--green)" strokeWidth="5" strokeDasharray="6.9 6.9" />
      <circle cx="50" cy="50" r="9" fill="var(--green)" />
      <circle cx="50" cy="50" r="4" fill="var(--accent)" />
    </svg>
  )
}

function Tile({ title, sub, onClick, accent }: { title: string; sub?: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex min-h-24 flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        accent ? 'border-transparent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-ink/40'
      }`}
    >
      <span className="num text-3xl font-bold uppercase tracking-wide">{title}</span>
      {sub && <span className={`text-sm ${accent ? 'opacity-85' : 'text-muted'}`}>{sub}</span>}
    </button>
  )
}

export function Home() {
  const t = useT()
  const { game, players, history, go } = useApp()
  const snap = useMemo(() => (game ? replay(game) : null), [game])
  const active = game && !game.finishedAt ? game : null

  return (
    <div className="grain min-h-dvh">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 pb-10 sm:pt-12">
        <div className="flex items-center gap-4">
          <BoardMark />
          <div className="min-w-0 flex-1">
            <h1 className="num text-5xl leading-none font-extrabold tracking-wide uppercase sm:text-6xl">{t('appName')}</h1>
            <p className="mt-1 text-muted">{t('tagline')}</p>
          </div>
          <div className="self-start">
            <SettingsButtons />
          </div>
        </div>

        {active && snap && (
          <button
            onClick={() => go('game')}
            className="flex flex-col gap-3 rounded-2xl border-2 border-green bg-surface p-4 text-left shadow-sm transition active:scale-[0.99] sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-green">{t('inProgress')}</span>
              <span className="text-xs text-muted">
                {t('round')} {snap.round}
                {active.config.legs > 1 && ` · ${t('leg')} ${snap.leg}`}
              </span>
            </div>
            <div className="num text-3xl font-bold">{configLabel(active, t)}</div>
            <div className="flex -space-x-2">
              {active.players.map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-surface" title={p.name}>
                  <Avatar name={p.name} color={p.color} size={34} />
                </span>
              ))}
            </div>
            <span className="num mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-green text-xl font-bold tracking-wide text-white uppercase">
              {t('continueGame')} →
            </span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid">
            <Tile accent={!active} title={t('newGame')} sub="X01 · Cricket · Shanghai · …" onClick={() => go('setup')} />
          </div>
          <Tile title={t('players')} sub={`${players.length}`} onClick={() => go('players')} />
          <Tile title={t('history')} sub={`${history.length}`} onClick={() => go('history')} />
        </div>
      </div>
    </div>
  )
}

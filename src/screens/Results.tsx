import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { dartLabel, replay, type Game } from '../engine'
import { useT } from '../i18n'
import { useApp } from '../store/app'
import { configLabel, playerLabel, resultTable } from '../share/format'
import { shareUrl } from '../share/encode'
import { Avatar, Button, Card, Label, TopBar } from '../components/ui'
import { SettingsButtons } from '../components/Settings'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

function SharePanel({ game }: { game: Game }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const url = useMemo(() => shareUrl(game), [game])
  return (
    <Card>
      <Label>{t('share')}</Label>
      <Button
        className="w-full"
        onClick={async () => {
          if (!(await copy(url))) return
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        }}
      >
        {copied ? '✓ ' + t('copied') : t('copyLink')}
      </Button>
    </Card>
  )
}

function RoundTable({ game }: { game: Game }) {
  const t = useT()
  const snap = useMemo(() => replay(game), [game])
  const legs = [...new Set(snap.turns.map((x) => x.leg))]
  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      <div className="px-4 pt-4">
        <Label>{t('roundByRound')}</Label>
      </div>
      {legs.map((leg) => {
        const turns = snap.turns.filter((x) => x.leg === leg)
        const rounds = Math.max(...turns.map((x) => x.round))
        return (
          <div key={leg} className="overflow-x-auto pb-2">
            {legs.length > 1 && (
              <div className="px-4 pt-2 text-sm font-semibold text-muted">
                {t('leg')} {leg}
                {snap.legWinners[leg - 1] != null && ` – ${game.players[snap.legWinners[leg - 1]!].name}`}
              </div>
            )}
            <table className="num w-full text-center">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="sticky left-0 bg-surface px-3 py-1 text-left">{t('round')}</th>
                  {game.players.map((p) => (
                    <th key={p.id} className="px-2 py-1 font-sans font-semibold" style={{ color: p.color }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rounds }, (_, r) => (
                  <tr key={r} className="border-t border-line">
                    <td className="sticky left-0 bg-surface px-3 py-1 text-left text-muted">{r + 1}</td>
                    {game.players.map((p, i) => {
                      const tr = turns.find((x) => x.p === i && x.round === r + 1)
                      return (
                        <td key={p.id} className="px-2 py-1" title={tr?.darts.map(dartLabel).join(' ')}>
                          {tr ? (
                            <span className={tr.bust ? 'text-accent' : tr.won ? 'font-bold text-green' : ''}>
                              {tr.bust ? 'BUST' : tr.value}
                              <span className="ml-1.5 hidden font-sans text-xs text-muted md:inline">{tr.darts.map(dartLabel).join(' ')}</span>
                            </span>
                          ) : (
                            ''
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </Card>
  )
}

export function ResultsView({ game, actions }: { game: Game; actions?: ReactNode }) {
  const t = useT()
  const lang = useApp((s) => s.lang)
  const snap = useMemo(() => replay(game), [game])
  const tbl = useMemo(() => resultTable(game, t, lang, snap), [game, t, lang, snap])
  const winner = snap.winner !== null ? game.players[snap.winner] : null
  const date = new Date(game.finishedAt ?? game.startedAt).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })
  // map table rows back to players for color
  const order = snap.ranking.flat()
  return (
    <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <div
          className="flex items-center gap-4 rounded-3xl p-5"
          style={{ background: winner ? `color-mix(in srgb, ${winner.color} 20%, var(--surface))` : 'var(--surface)' }}
        >
          <div className="text-5xl">{winner ? '🏆' : '🤝'}</div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">{winner ? t('winner') : t('draw')}</div>
            {winner && <div className="num truncate text-4xl font-extrabold">{playerLabel(winner)}</div>}
            <div className="text-sm text-muted">
              {configLabel(game, t)} · {date}
            </div>
          </div>
        </div>
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                {tbl.headers.map((h, i) => (
                  <th key={i} className={`px-3 py-2.5 font-semibold ${i > 1 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((r, ri) => {
                const p = game.players[order[ri]]
                return (
                  <tr key={ri} className="border-b border-line last:border-0">
                    {r.map((c, i) => (
                      <td key={i} className={`px-3 py-2.5 ${i > 1 ? 'num text-right text-lg' : ''} ${i === 0 ? 'num text-xl font-bold' : ''}`}>
                        {i === 1 ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={p.name} color={p.color} size={28} />
                            <span className="font-semibold whitespace-nowrap">{c}</span>
                          </span>
                        ) : (
                          c
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {actions}
        <SharePanel game={game} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <RoundTable game={game} />
      </div>
    </main>
  )
}

export function Results() {
  const t = useT()
  const app = useApp()
  const game = app.viewGameId ? (app.history.find((h) => h.id === app.viewGameId) ?? (app.game?.id === app.viewGameId ? app.game : null)) : app.game
  useEffect(() => {
    if (!game) app.go('home')
  }, [game]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!game) return null
  const isCurrent = app.game?.id === game.id
  // opened from History (by id) vs. from the end-of-game dialog (current game, no id)
  const fromHistory = app.viewGameId !== null
  const activeUnfinished = app.game && !app.game.finishedAt
  const rematch = () => {
    if (fromHistory && activeUnfinished && !confirm(t('confirmNew'))) return
    app.rematch()
  }
  if (fromHistory)
    return (
      <div className="min-h-dvh">
        <TopBar title={t('results')} onBack={() => app.go('history')} right={<SettingsButtons />} />
        <ResultsView
          game={game}
          actions={
            <Card className="grid gap-2">
              <Button variant="primary" size="lg" onClick={rematch}>
                {t('rematch')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirm(t('confirmDeleteResult'))) return
                  app.deleteHistory(game.id)
                  app.go('history')
                }}
              >
                {t('deleteResult')}
              </Button>
            </Card>
          }
        />
      </div>
    )
  return (
    <div className="min-h-dvh">
      <TopBar title={t('results')} onBack={() => app.go(isCurrent && !game.finishedAt ? 'game' : 'home')} right={<SettingsButtons />} />
      <ResultsView
        game={game}
        actions={
          <Card className="grid grid-cols-2 gap-2">
            <Button variant="primary" size="lg" className="col-span-2" onClick={app.rematch}>
              {t('rematch')}
            </Button>
            <Button onClick={() => app.go('setup')}>{t('newGame')}</Button>
            {isCurrent && (
              <Button variant="ghost" onClick={app.undo}>
                ↶ {t('undoLast')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => app.go('home')}>
              {t('home')}
            </Button>
          </Card>
        }
      />
    </div>
  )
}

export function SharedResult({ game, onClose }: { game: Game | null; onClose: () => void }) {
  const t = useT()
  return (
    <div className="min-h-dvh">
      <TopBar title={t('sharedResult')} right={<SettingsButtons />} />
      {game ? (
        <ResultsView
          game={game}
          actions={
            <Button variant="primary" size="lg" onClick={onClose}>
              {t('startOwn')} →
            </Button>
          }
        />
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-muted">{t('invalidLink')}</p>
          <Button variant="primary" onClick={onClose}>
            {t('startOwn')}
          </Button>
        </div>
      )}
    </div>
  )
}

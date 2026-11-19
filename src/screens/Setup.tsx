import { useState, type ReactNode } from 'react'
import type { GameConfig, ModeId } from '../engine'
import { useT, type TKey } from '../i18n'
import { DEFAULT_CONFIGS, MAX_PLAYERS, sameConfig, useApp, type GamePreset } from '../store/app'
import { configLabel } from '../share/format'
import { Avatar, Button, Card, Label, Segmented, Stepper, Toggle, TopBar } from '../components/ui'

function ShuffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  )
}
import { PlayerForm } from '../components/PlayerForm'

const MODES: ModeId[] = ['x01', 'cricket', 'highscore', 'shanghai', 'baseball']

/** Table of saved presets: tap a row to load it, ✕ to delete */
function PresetTable({ presets, current, onPick, onDelete }: { presets: GamePreset[]; current: GameConfig; onPick: (p: GamePreset) => void; onDelete: (p: GamePreset) => void }) {
  const t = useT()
  return (
    <div>
      <Label>{t('presets')}</Label>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full table-fixed text-left">
          <tbody>
            {presets.map((p) => {
              const active = sameConfig(p.config, current)
              return (
                <tr
                  key={p.id}
                  onClick={() => onPick(p)}
                  className={`cursor-pointer border-b border-line transition last:border-0 hover:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}
                  style={active ? { boxShadow: 'inset 4px 0 0 var(--green)' } : undefined}
                >
                  <td className="py-2.5 pr-2 pl-4">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-sm text-muted">
                      {configLabel(p, t)}
                    </div>
                  </td>
                  <td className="w-24 pr-2 text-right text-xs font-semibold tracking-wide text-green uppercase">{active ? t('presetActive') : ''}</td>
                  <td className="w-12 pr-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(p)
                      }}
                      className="h-10 w-10 rounded-lg text-accent hover:bg-surface"
                      aria-label={`${t('delete')} ${p.name}`}
                      title={t('delete')}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted">{t('presetsHint')}</p>
    </div>
  )
}

/** "Save as preset" – expands into a name field */
function SavePreset({ cfg }: { cfg: GameConfig }) {
  const t = useT()
  const { presets, savePreset } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const overwrite = presets.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())
  // these exact settings are already saved → no second copy
  const duplicate = presets.find((p) => sameConfig(p.config, cfg))
  if (duplicate)
    return (
      <Button className="w-full" disabled title={t('presetDuplicate')}>
        ✓ {t('presetAlreadySaved')} „{duplicate.name}“
      </Button>
    )
  if (!open)
    return (
      <Button
        className="w-full"
        onClick={() => {
          setName(configLabel({ config: cfg }, t))
          setOpen(true)
          setSaved(false)
        }}
      >
        {saved ? `✓ ${t('presetSaved')}` : `☆ ${t('savePreset')}`}
      </Button>
    )
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        savePreset(name, cfg)
        setOpen(false)
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2000)
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">{t('presetName')}</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-ink"
        />
      </label>
      {overwrite && <p className="text-xs font-medium text-gold">{t('presetOverwrite')}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" variant="green" disabled={!name.trim()}>
          {t('save')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function OptionalNumber({
  value,
  onChange,
  presets,
  defaultValue,
  max = 99,
}: {
  value: number | null
  onChange: (v: number | null) => void
  presets: number[]
  defaultValue: number
  max?: number
}) {
  const t = useT()
  // "Custom" is an explicit choice, not derived from the value – otherwise stepping onto a preset number (e.g. 15) would flip the selection
  const [custom, setCustom] = useState(value !== null && !presets.includes(value))
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        value={value === null ? 'off' : custom ? 'custom' : String(value)}
        options={[
          { value: 'off', label: t('noLimit') },
          ...presets.map((p) => ({ value: String(p), label: String(p) })),
          { value: 'custom', label: t('custom') },
        ]}
        onChange={(v) => {
          setCustom(v === 'custom')
          onChange(v === 'off' ? null : v === 'custom' ? (value ?? defaultValue) : Number(v))
        }}
      />
      {value !== null && custom && <Stepper value={value} onChange={onChange} min={1} max={max} />}
    </div>
  )
}

function ConfigForm({ cfg, set }: { cfg: GameConfig; set: (c: GameConfig) => void }) {
  const t = useT()
  const START_PRESETS = [180, 301, 501, 701]
  const [customStart, setCustomStart] = useState(cfg.mode === 'x01' && !START_PRESETS.includes(cfg.start))
  // bumped when picking a start-score preset (it also sets the round limit) so the round-limit field re-reads its value
  const [presetNonce, setPresetNonce] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const up = (patch: Record<string, any>) => set({ ...cfg, ...patch } as GameConfig)
  const common = (
    <>
      <Field label={t('legsToWin')}>
        <Stepper value={cfg.legs} onChange={(legs) => up({ legs })} min={1} max={21} />
      </Field>
    </>
  )
  const tie = (
    <Field label={t('tieBreak')}>
      <Segmented
        value={cfg.tieBreak}
        options={[
          { value: 'draw', label: t('tie_draw') },
          { value: 'bulloff', label: t('tie_bulloff') },
        ]}
        onChange={(tieBreak) => up({ tieBreak })}
      />
    </Field>
  )
  switch (cfg.mode) {
    case 'x01': {
      const presets = START_PRESETS
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('startScore')}>
            <div className="flex flex-col gap-2">
              <Segmented
                value={customStart ? -1 : cfg.start}
                options={[...presets.map((p) => ({ value: p, label: <span className="num text-lg">{p}</span> })), { value: -1, label: t('custom') }]}
                onChange={(v) => {
                  const roundsFor: Record<number, number> = { 180: 5, 301: 10, 501: 15, 701: 20 }
                  setCustomStart(v === -1)
                  if (v === -1) up({ start: presets.includes(cfg.start) ? 1001 : cfg.start })
                  else {
                    setPresetNonce((n) => n + 1)
                    up({ start: v, maxRounds: cfg.maxRounds === null ? null : roundsFor[v] })
                  }
                }}
              />
              {customStart && <Stepper value={cfg.start} onChange={(start) => up({ start })} min={2} max={9999} step={100} />}
            </div>
          </Field>
          {common}
          <Field label={t('inMode')}>
            <Segmented
              value={cfg.inMode}
              options={[
                { value: 'straight', label: t('in_straight') },
                { value: 'double', label: t('in_double') },
              ]}
              onChange={(inMode) => up({ inMode })}
            />
          </Field>
          <Field label={t('outMode')}>
            <Segmented
              value={cfg.outMode}
              options={[
                { value: 'straight', label: 'Straight' },
                { value: 'double', label: 'Double' },
                { value: 'master', label: 'Master' },
              ]}
              onChange={(outMode) => up({ outMode })}
            />
          </Field>
          <Field label={t('roundLimit')}>
            <OptionalNumber key={presetNonce} value={cfg.maxRounds} onChange={(maxRounds) => up({ maxRounds })} presets={[5, 10, 15, 20]} defaultValue={15} />
          </Field>
          {cfg.maxRounds !== null && (
            <Field label={t('limitRule')}>
              <Segmented
                value={cfg.limitRule}
                options={[
                  { value: 'lowest', label: t('limit_lowest') },
                  { value: 'bulloff', label: t('limit_bulloff') },
                ]}
                onChange={(limitRule) => up({ limitRule })}
              />
            </Field>
          )}
          {cfg.maxRounds !== null && cfg.limitRule === 'lowest' && tie}
        </div>
      )
    }
    case 'highscore':
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('rounds')}>
            <Stepper value={cfg.rounds} onChange={(rounds) => up({ rounds })} min={1} max={50} />
          </Field>
          {common}
          {tie}
        </div>
      )
    case 'shanghai':
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('rounds')} hint={t('roundsShanghaiHint')}>
            <Stepper value={cfg.rounds} onChange={(rounds) => up({ rounds })} min={1} max={21} />
          </Field>
          {common}
          <div className="sm:col-span-2">
            <Toggle checked={cfg.instantWin} onChange={(instantWin) => up({ instantWin })} label={t('instantWin')} />
          </div>
          {tie}
        </div>
      )
    case 'baseball':
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('innings')}>
            <Stepper value={cfg.innings} onChange={(innings) => up({ innings })} min={1} max={20} />
          </Field>
          {common}
          {tie}
        </div>
      )
    case 'cricket':
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('cricketScoring')}>
            <div className="flex flex-col gap-1.5">
              {(['standard', 'cutthroat', 'none'] as const).map((s) => (
                <label key={s} className="flex min-h-10 cursor-pointer items-center gap-2">
                  <input type="radio" className="h-5 w-5 accent-[var(--accent)]" checked={cfg.scoring === s} onChange={() => up({ scoring: s })} />
                  <span>{t(`scoring_${s}` as TKey)}</span>
                </label>
              ))}
            </div>
          </Field>
          {common}
          <Field label={t('roundLimit')}>
            <OptionalNumber value={cfg.maxRounds} onChange={(maxRounds) => up({ maxRounds })} presets={[10, 15, 20]} defaultValue={20} />
          </Field>
          {cfg.maxRounds !== null && tie}
        </div>
      )
  }
}

export function Setup() {
  const t = useT()
  const app = useApp()
  const [mode, setMode] = useState<ModeId>(app.lastMode)
  const [configs, setConfigs] = useState<Record<ModeId, GameConfig>>({ ...DEFAULT_CONFIGS, ...app.lastConfig })
  const [selected, setSelected] = useState<string[]>(app.lastPlayerIds.filter((id) => app.players.some((p) => p.id === id)))
  const [showRules, setShowRules] = useState(false)
  const [quickAdd, setQuickAdd] = useState(app.players.length === 0)
  const cfg = configs[mode]
  // remount the config form when a preset is loaded so its internal "custom" switches re-read the values
  const [formKey, setFormKey] = useState(0)
  const pickPreset = (p: GamePreset) => {
    setMode(p.config.mode)
    setConfigs((c) => ({ ...c, [p.config.mode]: { ...DEFAULT_CONFIGS[p.config.mode], ...p.config } as GameConfig }))
    setFormKey((k) => k + 1)
  }
  const byId = (id: string) => app.players.find((p) => p.id === id)!
  const available = app.players.filter((p) => !selected.includes(p.id))
  const full = selected.length >= MAX_PLAYERS
  const move = (i: number, d: number) => {
    const s = [...selected]
    const j = i + d
    if (j < 0 || j >= s.length) return
    ;[s[i], s[j]] = [s[j], s[i]]
    setSelected(s)
  }
  const shuffle = () => {
    const s = [...selected]
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[s[i], s[j]] = [s[j], s[i]]
    }
    setSelected(s)
  }
  const start = () => {
    if (app.game && !app.game.finishedAt && !confirm(t('confirmNew'))) return
    app.startGame(cfg, selected)
  }

  return (
    <div className="min-h-dvh pb-28 lg:pb-8">
      <TopBar title={t('newGame')} onBack={() => app.go('home')} />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          {app.presets.length > 0 && (
            <PresetTable
              presets={app.presets}
              current={cfg}
              onPick={pickPreset}
              onDelete={(p) => confirm(`${t('confirmDeletePreset')}\n${p.name}`) && app.deletePreset(p.id)}
            />
          )}
          <div>
            <Label>{t('gameType')}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex min-h-20 flex-col justify-between rounded-2xl border p-3 text-left transition last:col-span-2 sm:last:col-span-1 ${
                    mode === m ? 'border-transparent bg-ink text-bg' : 'border-line bg-surface hover:border-ink/40'
                  }`}
                >
                  <span className="num text-2xl font-bold uppercase">{t(`mode_${m}` as TKey)}</span>
                  <span className={`text-xs leading-tight ${mode === m ? 'opacity-75' : 'text-muted'}`}>{t(`modeDesc_${m}` as TKey)}</span>
                </button>
              ))}
            </div>
          </div>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="num text-2xl font-bold uppercase">{t(`mode_${mode}` as TKey)}</h2>
              <button className="text-sm font-semibold text-muted underline-offset-4 hover:underline" onClick={() => setShowRules((v) => !v)}>
                {t('showRules')} {showRules ? '▴' : '▾'}
              </button>
            </div>
            {showRules && <p className="mb-4 rounded-xl bg-surface-2 p-3 text-sm leading-relaxed">{t(`rules_${mode}` as TKey)}</p>}
            <ConfigForm key={`${mode}-${formKey}`} cfg={cfg} set={(c) => setConfigs({ ...configs, [mode]: c })} />
            <div className="mt-5 border-t border-line pt-4">
              <SavePreset cfg={cfg} />
            </div>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-20">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Label>
              {t('selectPlayers')} · {selected.length}/{MAX_PLAYERS}
            </Label>
            {selected.length > 1 && (
              <button
                onClick={shuffle}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-2"
                title={t('shuffle')}
                aria-label={t('shuffle')}
              >
                <ShuffleIcon />
              </button>
            )}
          </div>
          <ol className="flex flex-col gap-1.5">
            {selected.map((id, i) => {
              const p = byId(id)
              return (
                <li key={id} className="flex items-center gap-2 rounded-xl bg-surface-2 p-2">
                  <span className="num w-5 text-center text-lg font-bold text-muted">{i + 1}</span>
                  <Avatar name={p.name} color={p.color} size={32} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                  <button className="h-9 w-9 rounded-lg hover:bg-surface disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="up">
                    ▲
                  </button>
                  <button className="h-9 w-9 rounded-lg hover:bg-surface disabled:opacity-30" disabled={i === selected.length - 1} onClick={() => move(i, 1)} aria-label="down">
                    ▼
                  </button>
                  <button className="h-9 w-9 rounded-lg text-accent hover:bg-surface" onClick={() => setSelected(selected.filter((x) => x !== id))} aria-label="remove">
                    ✕
                  </button>
                </li>
              )
            })}
          </ol>
          {full && <p className="mt-3 text-sm font-medium text-gold">{t('maxPlayers')}</p>}
          {available.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((p) => (
                <button
                  key={p.id}
                  disabled={full}
                  onClick={() => setSelected((s) => (s.length < MAX_PLAYERS ? [...s, p.id] : s))}
                  className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-1 text-sm font-semibold hover:border-ink/40 disabled:opacity-40"
                >
                  <Avatar name={p.name} color={p.color} size={30} />+ {p.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-line pt-3">
            {quickAdd ? (
              <PlayerForm
                usedColors={app.players.map((p) => p.color)}
                onSubmit={(v) => {
                  const p = app.savePlayer(v)
                  setSelected((s) => (s.length < MAX_PLAYERS ? [...s, p.id] : s))
                }}
                onCancel={app.players.length ? () => setQuickAdd(false) : undefined}
              />
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setQuickAdd(true)}>
                + {t('quickAdd')}
              </Button>
            )}
          </div>
          <div className="mt-3 border-t border-line pt-2">
            <Toggle checked={app.showBoard} onChange={app.setShowBoard} label={t('board') + ' – ' + t('boardTap')} />
          </div>
          <div className="mt-4 hidden lg:block">
            <Button variant="primary" size="lg" className="w-full" disabled={!selected.length} onClick={start}>
              {selected.length ? t('startGame') : t('needPlayers')}
            </Button>
          </div>
        </Card>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {/* same horizontal bounds as the page content above */}
        <div className="mx-auto max-w-6xl px-4">
          <Button variant="primary" size="lg" className="w-full" disabled={!selected.length} onClick={start}>
            {selected.length ? t('startGame') : t('needPlayers')}
          </Button>
        </div>
      </div>
    </div>
  )
}

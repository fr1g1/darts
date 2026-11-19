import { useState } from 'react'
import { useT } from '../i18n'
import { PLAYER_COLORS } from '../store/app'
import type { PlayerProfile } from '../engine'
import { Button } from './ui'

export function PlayerForm({
  initial,
  onSubmit,
  onCancel,
  usedColors = [],
}: {
  initial?: PlayerProfile
  onSubmit: (p: { id?: string; name: string; color: string }) => void
  onCancel?: () => void
  usedColors?: string[]
}) {
  const t = useT()
  const firstFree = PLAYER_COLORS.find((c) => !usedColors.includes(c)) ?? PLAYER_COLORS[0]
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? firstFree)
  const valid = name.trim().length > 0
  const input = 'h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-ink'
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({ id: initial?.id, name, color })
        if (!initial) {
          setName('')
          setColor(PLAYER_COLORS.find((c) => c !== color && !usedColors.includes(c)) ?? PLAYER_COLORS[0])
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-muted">{t('nickname')} *</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="off" required />
      </label>
      <div>
        <span className="mb-1 block text-sm font-medium text-muted">{t('color')}</span>
        <div className="flex flex-wrap gap-2">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-9 w-9 rounded-full transition ${color === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!valid} className="flex-1">
          {initial ? t('save') : t('addPlayer')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}

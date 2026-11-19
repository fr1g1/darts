import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGS, sameConfig, useApp } from './app'
import type { GameConfig } from '../engine'

const x01 = (start: number) => ({ ...DEFAULT_CONFIGS.x01, start }) as GameConfig

describe('presets', () => {
  beforeEach(() => useApp.setState({ presets: [] }))

  it('sameConfig ignores key order', () => {
    const a = x01(501)
    const b = Object.fromEntries(Object.entries(a).reverse()) as GameConfig
    expect(sameConfig(a, b)).toBe(true)
    expect(sameConfig(a, x01(301))).toBe(false)
  })

  it('refuses a second preset with identical settings', () => {
    const { savePreset } = useApp.getState()
    savePreset('A', x01(501))
    savePreset('B', x01(501))
    expect(useApp.getState().presets.map((p) => p.name)).toEqual(['A'])
  })

  it('refuses overwriting by name when it would duplicate another preset', () => {
    const { savePreset } = useApp.getState()
    savePreset('A', x01(501))
    savePreset('B', x01(301))
    savePreset('b', x01(501)) // would make B identical to A
    expect(useApp.getState().presets.map((p) => `${p.name}:${(p.config as { start: number }).start}`)).toEqual(['A:501', 'B:301'])
  })

  it('still overwrites by name with new settings', () => {
    const { savePreset } = useApp.getState()
    savePreset('A', x01(501))
    savePreset('a', x01(701))
    expect(useApp.getState().presets.map((p) => `${p.name}:${(p.config as { start: number }).start}`)).toEqual(['a:701'])
  })
})

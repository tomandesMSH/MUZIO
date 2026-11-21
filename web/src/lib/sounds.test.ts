import { afterEach, describe, expect, it } from 'vitest'
import { setSoundsOn, soundsOn } from './sounds'

describe('sounds setting', () => {
  afterEach(() => localStorage.clear())

  it('is on until turned off on this device', () => {
    expect(soundsOn()).toBe(true)
    setSoundsOn(false)
    expect(soundsOn()).toBe(false)
    setSoundsOn(true)
    expect(soundsOn()).toBe(true)
  })
})

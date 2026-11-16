import { describe, expect, it } from 'vitest'
import { formatTime, hasTimestamps, insertAt, splitTimestamps } from './timestamps'

describe('formatTime', () => {
  it('m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(42.9)).toBe('0:42')
    expect(formatTime(125)).toBe('2:05')
  })
})

describe('splitTimestamps', () => {
  it('finds the times in a comment', () => {
    expect(splitTimestamps('V 0:42 zrychluješ, od 1:05 hezky.')).toEqual([
      { text: 'V ' },
      { time: 42, label: '0:42' },
      { text: ' zrychluješ, od ' },
      { time: 65, label: '1:05' },
      { text: ' hezky.' },
    ])
  })

  it('leaves other numbers alone', () => {
    expect(hasTimestamps('takt 12, 3/4, 1:2:3, 1:75')).toBe(false)
    expect(hasTimestamps('')).toBe(false)
    expect(hasTimestamps(null)).toBe(false)
  })

  it('a time at the very start or end', () => {
    expect(splitTimestamps('0:05')).toEqual([{ time: 5, label: '0:05' }])
    expect(splitTimestamps('12:30!')).toEqual([{ time: 750, label: '12:30' }, { text: '!' }])
  })
})

describe('insertAt', () => {
  it('puts the time where the cursor is', () => {
    expect(insertAt('', 0, '0:42')).toEqual({ text: '0:42 ', cursor: 5 })
    expect(insertAt('Hezky', 5, '0:42')).toEqual({ text: 'Hezky 0:42 ', cursor: 11 })
    expect(insertAt('a b', 2, '1:00')).toEqual({ text: 'a 1:00 b', cursor: 7 })
  })
})

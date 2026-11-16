import { describe, expect, it } from 'vitest'
import { gradingKeyAction, isTextField } from './gradingKeys'

describe('grading keys', () => {
  it('1-5 rate, space plays, Ctrl/Cmd+Enter sends', () => {
    expect(gradingKeyAction({ key: '4', inTextField: false })).toEqual({ type: 'rate', rating: 4 })
    expect(gradingKeyAction({ key: '6', inTextField: false })).toBeNull()
    expect(gradingKeyAction({ key: ' ', inTextField: false })).toEqual({ type: 'play' })
    expect(gradingKeyAction({ key: 'Enter', ctrlKey: true, inTextField: false })).toEqual({ type: 'submit' })
    expect(gradingKeyAction({ key: 'Enter', metaKey: true, inTextField: true })).toEqual({ type: 'submit' })
  })

  it('typing a comment is left alone', () => {
    expect(gradingKeyAction({ key: '4', inTextField: true })).toBeNull()
    expect(gradingKeyAction({ key: ' ', inTextField: true })).toBeNull()
    expect(gradingKeyAction({ key: 'Enter', inTextField: false })).toBeNull()
    expect(gradingKeyAction({ key: '3', ctrlKey: true, inTextField: false })).toBeNull()
  })

  it('knows text fields', () => {
    expect(isTextField(document.createElement('textarea'))).toBe(true)
    expect(isTextField(document.createElement('input'))).toBe(true)
    const box = document.createElement('input')
    box.type = 'checkbox'
    expect(isTextField(box)).toBe(false)
    expect(isTextField(document.createElement('button'))).toBe(false)
  })
})

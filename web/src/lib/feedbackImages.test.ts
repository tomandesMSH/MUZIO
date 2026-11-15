import { describe, expect, it } from 'vitest'
import { feedbackImagePath, fitWithin, validateImageFile } from './feedbackImages'

const MB = 1024 * 1024

describe('validateImageFile', () => {
  it('accepts a phone photo, also an iPhone HEIC without a type', () => {
    expect(validateImageFile({ name: 'IMG_0042.JPG', type: 'image/jpeg', size: 4 * MB })).toBeNull()
    expect(validateImageFile({ name: 'IMG_0043.HEIC', type: '', size: 3 * MB })).toBeNull()
  })

  it('refuses something that is not a picture', () => {
    expect(validateImageFile({ name: 'noty.pdf', type: 'application/pdf', size: MB })).toMatch(/není obrázek/)
  })

  it('refuses empty and huge files', () => {
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 0 })).toMatch(/prázdný/)
    expect(validateImageFile({ name: 'a.png', type: 'image/png', size: 26 * MB })).toMatch(/moc velký/)
  })
})

describe('fitWithin', () => {
  it('shrinks the longest side to 1600 and keeps the ratio', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })

  it('never enlarges a small picture', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('feedbackImagePath', () => {
  it('puts the picture in the folder of its recording', () => {
    expect(feedbackImagePath(42, 'abc')).toBe('42/abc.jpg')
  })
})

import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MicCheck } from './MicCheck'

let amplitude = 0
const stopTrack = vi.fn()

function installFakeMic() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
  })
  ;(globalThis as unknown as { AudioContext: unknown }).AudioContext = class {
    createAnalyser() {
      return {
        fftSize: 2048,
        getFloatTimeDomainData(buf: Float32Array) {
          buf.fill(0)
          buf[0] = amplitude
        },
      }
    }
    createMediaStreamSource() {
      return { connect() {} }
    }
    close() {
      return Promise.resolve()
    }
    resume() {
      return Promise.resolve()
    }
  }
}

describe('MicCheck', () => {
  afterEach(() => vi.useRealTimers())

  async function listen(amp: number) {
    vi.useFakeTimers()
    installFakeMic()
    amplitude = amp
    const view = render(<MicCheck onClose={vi.fn()} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    return view
  }

  it('says it is too quiet', async () => {
    await listen(0.01) // -40 dB
    expect(screen.getByText(/slabě slyšet/)).toBeInTheDocument()
  })

  it('says it is fine', async () => {
    await listen(0.3) // about -10 dB
    expect(screen.getByText(/v pořádku/)).toBeInTheDocument()
  })

  it('says it distorts, and closes the microphone when done', async () => {
    const { unmount } = await listen(1)
    expect(screen.getByText(/přebíjí/)).toBeInTheDocument()
    unmount()
    expect(stopTrack).toHaveBeenCalled()
  })
})

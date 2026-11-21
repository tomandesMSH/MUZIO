import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BugReportModal } from './BugReportModal'
import { sendBugReport } from '../../lib/data/bugReports'

vi.mock('../../lib/AuthProvider', () => ({ useAuth: () => ({ profile: { id: 'u1' } }) }))
vi.mock('../../lib/data/bugReports', () => ({ BUG_REPORT_MAX: 2000, sendBugReport: vi.fn(async () => {}) }))

describe('BugReportModal', () => {
  it('sends the text and thanks', async () => {
    render(<BugReportModal open onClose={vi.fn()} />)
    const send = screen.getByRole('button', { name: 'Odeslat' })
    expect(send).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Popis chyby'), { target: { value: 'Nejde přehrát nahrávka' } })
    fireEvent.click(send)
    expect(await screen.findByText('Díky za nahlášení')).toBeInTheDocument()
    expect(sendBugReport).toHaveBeenCalledWith('u1', 'Nejde přehrát nahrávka')
  })
})

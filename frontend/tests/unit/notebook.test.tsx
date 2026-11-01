import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Notebook } from '@/features/notebook/Notebook'
import { noteSchema } from '@/features/notebook/validation'
import { createSampleCase, loadNotebook, newNoteId, saveNote } from '@/features/notebook/service'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'operator-a' }, loading: false }) }))
vi.mock('@/features/notebook/service', () => ({ loadNotebook: vi.fn(), createSampleCase: vi.fn(), newNoteId: vi.fn(), saveNote: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const caseRecord = { ownerUid: 'operator-a', deviceLabel: 'SC-DEMO-01', context: 'Synthetic context', noteCount: 0, lastNoteId: null, _schemaVersion: 1 as const, createdAt: null!, updatedAt: null! }
const empty = { caseRecord, notes: [] }

beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadNotebook).mockResolvedValue(empty); vi.mocked(newNoteId).mockReturnValue('abcdefghijklmnopqrst') })

describe('notebook acceptance UI', () => {
  it('shows loading then explicit sample initialization and empty history (AC-01/06)', async () => {
    vi.mocked(loadNotebook).mockResolvedValueOnce({ caseRecord: null, notes: [] }).mockResolvedValue(empty)
    render(<Notebook />)
    expect(screen.getByText('Loading case and history…')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Create sample case' }))
    await screen.findByText('No follow-up notes yet. Save your first check using the form.')
    expect(createSampleCase).toHaveBeenCalledWith('operator-a')
  })
  it.each(['', 'short', 'x'.repeat(501)])('rejects invalid draft without calling persistence (AC-03)', async (value) => {
    render(<Notebook />)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Save follow-up' }))
    expect(screen.getByRole('alert')).toHaveTextContent(value.length > 500 ? 'at most 500' : 'at least 10')
    expect(saveNote).not.toHaveBeenCalled()
  })
  it('waits for acknowledgement, prevents double-submit and clears only after save (AC-02/06)', async () => {
    let complete!: () => void
    vi.mocked(saveNote).mockImplementation(() => new Promise<void>((resolve) => { complete = resolve }))
    render(<Notebook />)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '  Checked maintenance; review again at 17:00.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save follow-up' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('textbox')).not.toHaveValue('')
    expect(saveNote).toHaveBeenCalledExactlyOnceWith('operator-a', 'abcdefghijklmnopqrst', 'Checked maintenance; review again at 17:00.')
    await act(async () => complete())
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
    expect(screen.getByText(/Note saved. The case summary/)).toBeInTheDocument()
  })
  it('preserves failed draft, requires refresh, then reconciles committed ID (AC-06)', async () => {
    vi.mocked(saveNote).mockRejectedValue(new Error('uncertain transport result'))
    render(<Notebook />)
    const text = 'Checked maintenance; confirm the next review time.'
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'Save follow-up' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('textbox')).toHaveValue(text)
    expect(screen.getByRole('button', { name: 'Save follow-up' })).toBeDisabled()
    const date = new Date('2026-11-01T10:00:00Z')
    vi.mocked(loadNotebook).mockResolvedValue({ caseRecord: { ...caseRecord, noteCount: 1 }, notes: [{ id: 'abcdefghijklmnopqrst', ownerUid: 'operator-a', caseId: 'operator-a', text, createdAt: { toDate: () => date, toMillis: () => date.getTime() } as never, _schemaVersion: 1 }] })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A changed draft must survive reconciliation.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }))
    await screen.findByText('Saved note confirmed in history.')
    expect(screen.getByRole('textbox')).toHaveValue('A changed draft must survive reconciliation.')
    expect(saveNote).toHaveBeenCalledTimes(1)
  })
  it('shows read failure with a recovery control (AC-06)', async () => {
    vi.mocked(loadNotebook).mockRejectedValue(new Error('permission-denied'))
    render(<Notebook />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read the notebook')
    expect(screen.getByRole('button', { name: 'Refresh history' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Create sample case' })).not.toBeInTheDocument()
  })
  it('accepts trimmed length boundaries (AC-03)', () => {
    expect(noteSchema.parse('  1234567890  ')).toBe('1234567890')
    expect(noteSchema.safeParse('a'.repeat(500)).success).toBe(true)
    expect(noteSchema.safeParse(' '.repeat(20)).success).toBe(false)
  })
})

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { createSampleCase, loadNotebook, newNoteId, saveNote, type NotebookData } from './service'
import { noteSchema } from './validation'

const button =
  'rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black'

export function Notebook() {
  const { user, loading: authLoading } = useAuth()
  if (authLoading || !user) return <p role="status">Checking your sign-in…</p>
  return <NotebookForUser key={user.uid} uid={user.uid} />
}

function NotebookForUser({ uid }: { uid: string }) {
  const [data, setData] = useState<NotebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [validation, setValidation] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const pending = useRef<{ id: string; text: string } | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError('')
    try {
      const next = await loadNotebook(uid)
      setData(next)
      if (pending.current && next.notes.some((note) => note.id === pending.current?.id)) {
        const confirmedText = pending.current.text
        pending.current = null
        setDraft((current) => (current.trim() === confirmedText ? '' : current))
        setStatus('Saved note confirmed in history.')
      }
    } catch {
      setError(
        'Could not read the notebook. Check your connection and refresh. Any unsaved draft is retained.'
      )
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    let active = true
    loadNotebook(uid)
      .then((next) => {
        if (active) {
          setData(next)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Could not read the notebook. Check your connection and refresh. Any unsaved draft is retained.'
          )
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [uid])

  const create = async () => {
    if (!uid || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      await createSampleCase(uid)
      setStatus('Synthetic sample case is ready.')
      await refresh()
    } catch {
      setError('Could not create the sample case. Refresh to check its status before trying again.')
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!uid || inFlight.current || error) return
    const parsed = noteSchema.safeParse(draft)
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Check the note.')
      return
    }
    setValidation('')
    setStatus('')
    inFlight.current = true
    setBusy(true)
    pending.current =
      pending.current?.text === parsed.data
        ? pending.current
        : { id: newNoteId(), text: parsed.data }
    try {
      await saveNote(uid, pending.current.id, parsed.data)
      pending.current = null
      setDraft('')
      setStatus('Note saved. The case summary and history were updated together.')
      toast.success('Follow-up note saved')
      await refresh()
    } catch {
      setError(
        'Save was not confirmed. Any unsaved draft is retained. Refresh history before retrying to avoid a duplicate.'
      )
      toast.error('Save was not confirmed')
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          SafeCall • Personal workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Incident follow-up notebook</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Keep the checks and next steps you want to recover when returning to a case. Only your
          account can read this notebook.
        </p>
      </div>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        Synthetic demo only. No live pendant data, dispatch, welfare check or escalation is
        performed. Do not enter personal or confidential information.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {loading
            ? 'Loading case and history…'
            : busy
              ? 'Saving…'
              : status || 'Notebook is up to date.'}
        </p>
        <button
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={() => void refresh()}
          disabled={loading || busy}
        >
          Refresh history
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          {error}
        </div>
      )}
      {!loading && !error && data && !data.caseRecord && (
        <section className="rounded-xl border border-dashed border-zinc-300 p-8 text-center">
          <h2 className="text-lg font-semibold">Start with a sample case</h2>
          <p className="mx-auto mt-2 mb-5 max-w-md text-sm text-zinc-500">
            Create one isolated, synthetic pendant case. Reopening this notebook keeps the same
            case.
          </p>
          <button className={button} disabled={busy} onClick={() => void create()}>
            {busy ? 'Creating…' : 'Create sample case'}
          </button>
        </section>
      )}
      {data?.caseRecord && (
        <>
          <section
            aria-label="Case context"
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{data.caseRecord.deviceLabel}</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                Synthetic sample
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {data.caseRecord.context}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              {data.caseRecord.noteCount} saved {data.caseRecord.noteCount === 1 ? 'note' : 'notes'}{' '}
              • Changes are append only
            </p>
          </section>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <form
              onSubmit={(event) => void save(event)}
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold">Record follow-up</h2>
              <label htmlFor="follow-up-note" className="block text-sm font-medium">
                What did you check, and what needs attention next?
              </label>
              <textarea
                id="follow-up-note"
                rows={7}
                value={draft}
                disabled={busy}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setValidation('')
                }}
                aria-invalid={!!validation}
                aria-describedby="note-guidance note-validation"
                className="w-full rounded-md border border-zinc-300 p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:border-zinc-600"
              />
              <p id="note-guidance" className="text-xs text-zinc-500">
                10–500 characters after trimming • {draft.trim().length}/500. Saved notes cannot be
                edited or deleted.
              </p>
              <p
                id="note-validation"
                role={validation ? 'alert' : undefined}
                className="text-sm text-red-700"
              >
                {validation}
              </p>
              <button className={button} type="submit" disabled={busy || loading || !!error}>
                {busy ? 'Saving…' : 'Save follow-up'}
              </button>
            </form>
            <section
              aria-label="Saved history"
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold">Saved history</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Newest first • Server timestamps shown in your local time
              </p>
              {data.notes.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-500">
                  No follow-up notes yet. Save your first check using the form.
                </p>
              ) : (
                <ol className="mt-4 space-y-4">
                  {data.notes.map((note) => (
                    <li
                      key={note.id}
                      className="border-t border-zinc-200 pt-4 dark:border-zinc-700"
                    >
                      <p className="text-xs font-medium text-zinc-500">
                        You •{' '}
                        <time dateTime={note.createdAt.toDate().toISOString()}>
                          {note.createdAt.toDate().toLocaleString()}
                        </time>
                      </p>
                      <p className="mt-2 text-sm break-words whitespace-pre-wrap">{note.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

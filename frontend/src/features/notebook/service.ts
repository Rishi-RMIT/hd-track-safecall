import {
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getClientDb } from '@/lib/firebase/client'
import { getFollowUpCasesCollection, getFollowUpNotesCollection } from '@/lib/firebase/firestore'
import { noteSchema, SAMPLE_CONTEXT, SAMPLE_DEVICE } from './validation'

export async function loadNotebook(uid: string) {
  const [caseSnap, notesSnap] = await Promise.all([
    getDocFromServer(doc(getFollowUpCasesCollection(), uid)),
    getDocsFromServer(query(getFollowUpNotesCollection(), where('ownerUid', '==', uid))),
  ])
  const notes = notesSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
  notes.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis() || b.id.localeCompare(a.id))
  return { caseRecord: caseSnap.exists() ? caseSnap.data() : null, notes }
}

export function newNoteId() {
  return doc(getFollowUpNotesCollection()).id
}

export async function createSampleCase(uid: string) {
  const ref = doc(getFollowUpCasesCollection(), uid)
  await runTransaction(getClientDb(), async (transaction) => {
    const existing = await transaction.get(ref)
    if (existing.exists()) return
    transaction.set(ref, {
      ownerUid: uid,
      deviceLabel: SAMPLE_DEVICE,
      context: SAMPLE_CONTEXT,
      noteCount: 0,
      lastNoteId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      _schemaVersion: 1,
    })
  })
}

/** Stable ID is allocated outside the retried callback; never bypasses Firestore rules. */
export async function saveNote(uid: string, id: string, draft: string) {
  const text = noteSchema.parse(draft)
  const caseRef = doc(getFollowUpCasesCollection(), uid)
  const noteRef = doc(getFollowUpNotesCollection(), id)
  await runTransaction(getClientDb(), async (transaction) => {
    const [caseSnap, noteSnap] = await Promise.all([
      transaction.get(caseRef),
      transaction.get(noteRef),
    ])
    if (noteSnap.exists()) {
      if (noteSnap.data().text !== text || noteSnap.data().ownerUid !== uid)
        throw new Error('Note ID conflict')
      return // Same acknowledged request can safely be reconciled/retried.
    }
    if (!caseSnap.exists()) throw new Error('Create a sample case first')
    transaction.set(noteRef, {
      ownerUid: uid,
      caseId: uid,
      text,
      createdAt: serverTimestamp(),
      _schemaVersion: 1,
    })
    transaction.update(caseRef, {
      noteCount: caseSnap.data().noteCount + 1,
      lastNoteId: id,
      updatedAt: serverTimestamp(),
    })
  })
}

export type NotebookData = Awaited<ReturnType<typeof loadNotebook>>

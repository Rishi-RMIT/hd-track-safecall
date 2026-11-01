/** Real Spark integration test. Requires ignored local .env; never publishes credentials.
 * Creates three unique synthetic accounts/cases, retaining their records as evidence.
 * No customer data is read, overwritten or deleted; no privileged SDK writes feature data.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { initializeApp as adminInit, cert } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, collection, setDoc, getDocFromServer, getDocsFromServer, query, where, runTransaction, serverTimestamp, writeBatch, updateDoc, deleteDoc, terminate, Timestamp } from 'firebase/firestore'

process.loadEnvFile('.env')
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'hd-track-safecall') throw new Error('Wrong test project')
const credential = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString())
const admin = adminInit({ credential: cert(credential), projectId: 'hd-track-safecall' }, 'notebook-test-admin')
const adminAuth = getAdminAuth(admin)
const apps = []
const results = []
const stamp = Date.now().toString(36)
const config = { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: 'hd-track-safecall', appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID }
const context = 'Synthetic pendant: no heartbeat during a simulated maintenance window. Record checks and the next follow-up; no operational action is performed.'
function assert(value, message) { if (!value) throw new Error(message) }
async function actor(label, verified = true) {
  const uid = `hd-notebook-${stamp}-${label}`
  const email = `${uid}@demo.example.test`
  const password = randomBytes(28).toString('base64url')
  await adminAuth.createUser({ uid, email, password, emailVerified: verified, displayName: 'Synthetic notebook test operator' })
  const app = initializeApp(config, uid); apps.push(app)
  const auth = getAuth(app)
  await signInWithEmailAndPassword(auth, email, password)
  return { uid, db: getFirestore(app), auth }
}
async function denied(operation) { try { await operation() } catch (e) { if (e.code === 'permission-denied') return; throw e } throw new Error('Unexpected permission grant') }
async function check(id, ac, description, operation) {
  try { const details = await operation(); results.push({ id, ac, description, result: 'PASS', details }); console.log(`${id}: PASS — ${description}`) }
  catch (error) { results.push({ id, ac, description, result: 'FAIL', reason: error.code || error.message }); console.log(`${id}: FAIL — ${error.code || error.message}`) }
}
function caseRef(a) { return doc(a.db, 'followUpCases', a.uid) }
function noteRef(a, id) { return doc(a.db, 'followUpNotes', id) }
async function create(a) { await runTransaction(a.db, async t => { const ref = caseRef(a); if ((await t.get(ref)).exists()) return; t.set(ref, { ownerUid: a.uid, deviceLabel: 'SC-DEMO-01', context, noteCount: 0, lastNoteId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), _schemaVersion: 1 }) }) }
async function append(a, text, id = doc(collection(a.db, 'followUpNotes')).id, changes = {}) {
  await runTransaction(a.db, async t => {
    const ref = caseRef(a); const [c, n] = await Promise.all([t.get(ref), t.get(noteRef(a, id))]);
    if (n.exists()) { assert(n.data().text === text, 'Retry text mismatch'); return }
    t.set(noteRef(a, id), { ownerUid: a.uid, caseId: a.uid, text, createdAt: serverTimestamp(), _schemaVersion: 1, ...changes })
    t.update(ref, { noteCount: c.data().noteCount + 1, lastNoteId: id, updatedAt: serverTimestamp() })
  }); return id
}
async function count(a) { return (await getDocFromServer(caseRef(a))).data().noteCount }
try {
  const a = await actor('a'); const b = await actor('b'); const unverified = await actor('unverified', false)
  const guestApp = initializeApp(config, `guest-${stamp}`); apps.push(guestApp); const guest = getFirestore(guestApp)
  let first
  await check('T01', ['AC-01'], 'Create/read case twice without duplicate or reset', async () => { await create(a); await create(a); assert(await count(a) === 0, 'Count changed'); assert((await getDocFromServer(caseRef(a))).data().deviceLabel === 'SC-DEMO-01', 'Missing synthetic context'); return { caseExists: true, noteCount: 0 } })
  await check('T02', ['AC-02', 'AC-07'], 'Atomic note + case summary, independent server readback', async () => { first = await append(a, 'Checked maintenance window; review again at 17:00.'); const c = (await getDocFromServer(caseRef(a))).data(); const n = (await getDocFromServer(noteRef(a, first))).data(); assert(c.noteCount === 1 && c.lastNoteId === first && n.ownerUid === a.uid && n.createdAt.isEqual(c.updatedAt), 'Atomic readback mismatch'); return { count: c.noteCount, lastNoteMatches: true, matchingServerTimes: true, persistedText: n.text } })
  await check('T03', ['AC-03', 'AC-05'], 'Server rejects blank, 9, 501 and untrimmed notes with no partial writes', async () => { const before = await count(a); for (const text of [' '.repeat(10), '123456789', 'x'.repeat(501), ' padded note ']) { const id = doc(collection(a.db, 'followUpNotes')).id; await denied(() => append(a, text, id)); assert(!(await getDocFromServer(noteRef(a, id))).exists(), 'Rejected note exists') } assert(await count(a) === before, 'Rejected input changed case'); return { rejected: 4, summaryUnchanged: true, noPartialNotes: true } })
  await check('T04', ['AC-04'], 'Guest, unverified and other-owner access denied', async () => { await denied(() => getDocFromServer(doc(guest, 'followUpCases', a.uid))); await denied(() => getDocFromServer(doc(guest, 'followUpNotes', first))); await denied(() => getDocFromServer(doc(b.db, 'followUpCases', a.uid))); await denied(() => getDocFromServer(doc(b.db, 'followUpNotes', first))); await denied(() => getDocFromServer(caseRef(unverified))); await denied(() => create(unverified)); const batch = writeBatch(b.db); batch.update(doc(b.db, 'followUpCases', a.uid), { noteCount: 999 }); await denied(() => batch.commit()); return { denials: 7, originalCount: await count(a) } })
  await check('T05', ['AC-05'], 'Direct forgery and one-sided writes denied atomically', async () => { const before = await count(a); await denied(() => append(a, 'Forged owner text.', undefined, { ownerUid: b.uid })); await denied(() => append(a, 'Forged client timestamp.', undefined, { createdAt: Timestamp.fromMillis(0) })); await denied(() => append(a, 'Extra field attempt.', undefined, { role: 'admin' })); await denied(() => setDoc(doc(collection(a.db, 'followUpNotes')), { ownerUid: a.uid, caseId: a.uid, text: 'One sided note attempt.', createdAt: serverTimestamp(), _schemaVersion: 1 })); await denied(() => updateDoc(caseRef(a), { noteCount: before + 1, lastNoteId: doc(collection(a.db, 'followUpNotes')).id, updatedAt: serverTimestamp() })); await denied(() => updateDoc(caseRef(a), { context: 'Forged context' })); assert(await count(a) === before, 'Tampering changed count'); return { denials: 6, countUnchanged: true } })
  await check('T07', ['AC-07'], 'Notes are immutable; owner-filtered server history persists', async () => { await denied(() => updateDoc(noteRef(a, first), { text: 'Edited saved text.' })); await denied(() => deleteDoc(noteRef(a, first))); await denied(() => deleteDoc(caseRef(a))); const notes = await getDocsFromServer(query(collection(a.db, 'followUpNotes'), where('ownerUid', '==', a.uid))); assert(notes.size === 1, 'History changed'); return { editDeleteDenials: 3, persistedNotes: notes.size } })
  await check('T08', ['AC-02', 'AC-06', 'AC-07'], 'Concurrent conflict has no partial write; refresh/retry and same-ID retry recover safely', async () => {
    const before = await count(a)
    const ids = [doc(collection(a.db, 'followUpNotes')).id, doc(collection(a.db, 'followUpNotes')).id]
    const texts = ['Concurrent check one, next review due.', 'Concurrent check two, waiting for update.']
    const concurrent = await Promise.allSettled(ids.map((id, i) => append(a, texts[i], id)))
    const completed = concurrent.filter(x => x.status === 'fulfilled').length
    assert(await count(a) === before + completed, 'Concurrent failure left partial count')
    for (let i = 0; i < ids.length; i++) { await append(a, texts[i], ids[i]) }
    await append(a, texts[0], ids[0])
    assert(await count(a) === before + 2, 'Recovery/retry count mismatch')
    const notes = await getDocsFromServer(query(collection(a.db, 'followUpNotes'), where('ownerUid', '==', a.uid)))
    assert(notes.size === before + 2, 'Unexpected notes')
    return { concurrentAcknowledged: completed, recoverableConflicts: 2 - completed, addedAfterRecovery: 2, retryAdded: 0, countMatchesHistory: true }
  })
  await check('T09', ['AC-03'], 'Server accepts exact 10 and 500-character boundaries', async () => { const before = await count(a); await append(a, '1234567890'); await append(a, 'x'.repeat(500)); assert(await count(a) === before + 2, 'Boundary acceptance failed'); return { acceptedLengths: [10, 500] } })
} catch (error) { results.push({ id: 'SETUP', result: 'FAIL', reason: error.code || error.name }); console.log('SETUP: FAIL — ' + (error.code || error.name)) }
finally {
  writeFileSync('docs/hd-track/evidence/live-notebook-results.json', JSON.stringify({ timestamp: new Date().toISOString(), project: 'hd-track-safecall', environment: 'Real Firebase Spark; client SDK writes under deployed rules; synthetic actors', rulesSourceSha256: (await import('node:crypto')).createHash('sha256').update(readFileSync('firebase/firestore.rules')).digest('hex'), results }, null, 2) + '\n')
  for (const app of apps) { await terminate(getFirestore(app)); await deleteApp(app) }
  process.exitCode = results.every(x => x.result === 'PASS') ? 0 : 1
}

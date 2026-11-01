# Incident follow-up notebook specification

Specification locked on 1 November 2026 before implementation. This is an individual prototype extension; no client approval, user testing or benefit measurement is claimed.

## Feature decision

**Incident follow-up notebook**: an authenticated SafeCall duty coordinator opens a synthetic incident context, writes a short investigation/follow-up note, and can return later to the case and its persistent, timestamped history. This adds operator-written context rather than duplicating the team's NEW → ACKNOWLEDGED → ACTIONED status transition. The individual feature uses two Firestore collections and substantial security rules; it does not deploy Cloud Functions or Storage, keeping the new project on Spark.

## Rationale

SafeCall duty coordinators need to turn a silent-pendant assessment into an informed next action without repeating manual triage across several systems. The Telstra brief describes that manual work across tools and people, while the current team console records escalation stages without a persistent operator-written explanation of follow-up reasoning. The incident follow-up notebook lets a coordinator save what they checked and what still needs attention, then recover that context when returning to the case. This extends the brief's requirement for defensible, actionable network intelligence; reduced repeated triage is an intended benefit, not a measured outcome or a claimed client request.

## Distinctness evidence

Inspected team main `27a66021d1f416aaa418e877120aae3cc9e1b2b1` was inspected separately from the preserved local team checkout:

- `web/src/lib/results-api.ts` defines escalation status and stage timestamps; it has no operator-authored follow-up text/history contract.
- `web/src/components/IncidentView.tsx` renders `EscalationStepper`; its comment states lifecycle progress is live interaction state with no historical record.
- Searches of Results API source and web components found no saved operator-note/handover-note collection, route or editor. `recomputeNote` is transient UI feedback, not an authored persisted case note.
- Therefore, acknowledgement is rejected as the individual feature. A personal persistent follow-up notebook is distinct against the inspected code. This is based on inspected code, not a claim about undisclosed team work.

## Smallest scope

In scope: one authenticated case/notebook screen; an explicit user-triggered action to create a clearly labelled synthetic sample case; case summary, note input, save, newest-first history, server timestamps, owner isolation, atomic case-summary/note writes, empty/loading/error/success states and reload persistence. Use existing app shell and Firebase Auth/session flow.

Out of scope: acknowledgement/action lifecycle, changes to team services, real Telstra/public feeds, emergency dispatch or welfare checks, shared multi-operator handover, notifications/email, uploads, maps, role administration, editing/deleting notes, production personal data, rich text and search. A personal notebook does not claim to solve cross-operator collaboration. All demo data is synthetic.

## Qualification checklist

| Requirement                       | Implemented design                                                                                                                                                                       | Status                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Real client inspiration           | SafeCall duty coordinator, repeated manual triage and defensible next action                                                                                                             | Brief-linked rationale                                                 |
| Genuine extension                 | Authored persistent investigation notes; does not reimplement escalation stage buttons                                                                                                   | Inspected-team evidence above                                          |
| Interactive UI                    | Open sample case, enter and save note, inspect retained history                                                                                                                          | Implemented; real persistence and UI verified                          |
| Two collections read and write    | `followUpCases`: create/read case and update note summary; `followUpNotes`: create/read notes                                                                                            | Implemented; real persistence and UI verified                          |
| Substantial server-enforced rules | Auth/owner checks, exact field/type/length validation, immutable author/context, timestamp checks, and cross-document `getAfter` consistency requiring atomic note + case-summary change | Verified by real Spark tampering/atomicity tests                       |
| No charges                        | Auth + two Firestore collections on Spark, Next SSR host on an eligible free plan                                                                                                        | Spark and Hobby confirmed; automatic rules publication verified |
| Original boilerplate              | Existing Next.js/Firebase shell, auth, typed helpers, validation conventions                                                                                                             | Fork/provenance verified                                               |

## Formal use case UC-01

Actor: signed-in SafeCall duty coordinator using their isolated synthetic demo records.

Trigger: the coordinator wants to retain follow-up reasoning for a silent-pendant case.

Preconditions: verified email/password account, valid session, matching authenticated Firebase client, deployed feature rules; the case is owned by this user or is initialized through the explicit sample-case action.

Main flow:

1. Open the notebook. If no owned sample case exists, choose Create sample case; the system persists and displays its labelled synthetic context.
2. Read the case identity/context and existing note history from the two collections.
3. Enter plain-text follow-up reasoning and choose Save.
4. Validate the trimmed text, then commit a new note and matching case summary atomically under Firestore rules.
5. Show success only after the write is acknowledged; display the saved note and server time.
6. Reload/reopen the notebook and recover the same case and note history.

Alternate/error flows: invalid text stays editable with field-level feedback and no writes; unauthenticated or other-owner access is denied; a rejected/failed write shows no success, preserves draft text and leaves no partial note/summary. After an ambiguous network result, refresh history before offering retry; no exactly-once guarantee across separately initiated duplicate submissions is claimed.

## Functional specification

Inputs: authenticated identity (not user-supplied author ID), explicit sample-case action, owned case ID and trimmed plain-text note of 10–500 characters.

Outputs: persistent note with authenticated author and server time; atomic update of case note count and last-note reference; history and clear UI outcomes.

Data touched: `followUpCases/{caseId}` (ownerUid, synthetic device/context snapshot, noteCount, lastNoteId, createdAt, updatedAt, _schemaVersion); `followUpNotes/{noteId}` (ownerUid, caseId, text, createdAt, _schemaVersion). The exact implemented fields and access policy are in [FIRESTORE-SCHEMA.md](../FIRESTORE-SCHEMA.md). The inherited `users` collection supports authentication but does not count as one of the feature's two required collections.

Out of scope: the exclusions above. No operational action is executed and notes do not modify the correlator's verdict.

## Acceptance criteria and tests

| AC    | Observable requirement                                                                                                                                              | UC steps              | Test and evidence                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| AC-01 | The system shall create/read one explicitly requested, labelled synthetic sample case for the current coordinator; reopening shall not silently duplicate it        | 1–2                   | T01 sample initialization + reload; case readback + screenshots                     |
| AC-02 | The system shall save a valid 10–500-character trimmed note and atomically update its case count/last-note reference; both collections shall read back consistently | 3–5                   | T02 happy path; UI, persisted values and reload evidence                            |
| AC-03 | The system shall reject blank, fewer-than-10 and greater-than-500-character trimmed notes without changing either collection                                        | 3–4 + error           | T03 boundary/input cases; before/after data and validation screenshots              |
| AC-04 | The system shall deny reads/writes by an unauthenticated client and attempts against another user's case/notes                                                      | Preconditions + error | T04 no-auth and separate synthetic user; actual denial plus unchanged-data evidence |
| AC-05 | The system shall enforce author/ownership, timestamps and allowed fields on the server, denying direct forged or one-sided writes even outside the UI               | 4 + error             | T05 direct client tampering and partial atomic-write cases; denial and readback     |
| AC-06 | The system shall show empty/loading/error/success states, disable Save during a pending save and retain unsaved text after a recoverable failure                    | 1–5 + error           | T06 UI state evidence under controlled failure; no false-success output             |
| AC-07 | The system shall restore saved case/history after reload, display notes in a defined newest-first order and keep stored note text immutable                         | 2, 5–6                | T07 reload/order plus denied edit/delete; screenshots and persisted values          |

Execution: eight real Spark SDK cases and nineteen unit/component tests pass. Actual results, environment labels and screenshots are mapped in [TEST-PLAN.md](TEST-PLAN.md). UX framing, state wireframes and architecture match the implemented schema. Push/PR quality checks pass. Main run 41312330433 automatically published and read back rules at d9fb3a5. The initial Vercel build exposed a runtime import failure; RUNTIME-COMPATIBILITY.md records the correction and regression check. Final live acceptance is recorded in the submitted document.

## Final design clarifications

- Exactly one sample case per account: `followUpCases/{auth.uid}`. Device label and context are fixed synthetic strings and immutable. No operational lifecycle is changed.
- Notes use 20-character SDK-generated identifiers. The same request ID is reused inside transaction retries. A recovered already-committed request does not increment the summary again. A separately initiated identical note is allowed; this is not semantic deduplication.
- Text is trimmed by the UI/service; rules reject leading/trailing whitespace and enforce 10–500 characters. Plain text is rendered with React escaping. Server time is required for all creates/updates.
- Both sides of the transaction use getAfter checks. A new note requires an existing case, count +1 and lastNoteId pointing to that note. A case increment requires that same newly created note. No edits/deletes are allowed.
- History uses an owner-filtered query and client-side timestamp descending sort, then ID descending for timestamp ties. No custom index, background listener or pagination is required for this small synthetic notebook. Refresh and reload request current server data; no offline success is claimed.
- Failed/ambiguous saves preserve the draft and disable Save until Refresh history succeeds. Refresh reconciles the pending ID before allowing another attempt. Reconciliation clears the confirmed saved text while preserving any subsequently changed draft. Acknowledged saves clear the draft even if the subsequent history read fails.
- Loading and save controls have accessible status text. The notebook link is available on both desktop and narrow screens. Sign-in/registration reuse the boilerplate; Google provider is unavailable in this deployment.
- Tests use the real isolated Spark project, not production customer data or emulators. AC-04/05/07 include direct SDK attempts so browser validation alone cannot pass them.

Concurrent tabs can receive a recoverable rules denial when their count snapshot is stale. The UI retains the draft, requires Refresh history, then retries against fresh data with the same pending ID. Automatic completion of every concurrent call is not promised. T08 verifies no partial write and safe explicit recovery.

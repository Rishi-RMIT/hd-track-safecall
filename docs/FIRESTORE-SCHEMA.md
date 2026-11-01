# Firestore schema

The inherited `users/{uid}` profile stores uid, email, displayName, photoURL, role (`user`), createdAt, updatedAt and _schemaVersion (1). Profile writes are owner-scoped; roles cannot be promoted by a client.

## Incident follow-up notebook

Typed interfaces: `frontend/src/types/firestore.ts`. Typed collection helpers: `getFollowUpCasesCollection()` and `getFollowUpNotesCollection()` in `frontend/src/lib/firebase/firestore.ts`. Security authority: `firebase/firestore.rules`. All fields below are required; unknown fields are rejected. There is one synthetic case per verified account. No client hard or soft delete is permitted for these append-only feature records.

### followUpCases/{uid}

| Field          | Type / value                                  | Change policy                                          |
| -------------- | --------------------------------------------- | ------------------------------------------------------ |
| ownerUid       | string = authenticated UID = document ID      | Immutable                                              |
| deviceLabel    | string = `SC-DEMO-01`                         | Immutable                                              |
| context        | fixed synthetic sentence from `validation.ts` | Immutable                                              |
| noteCount      | integer, initially 0                          | Increment by exactly 1 with a new matching note        |
| lastNoteId     | null initially; then 20-character note ID     | Must identify newly created note in same atomic commit |
| createdAt      | Firestore Timestamp = request.time on create  | Immutable                                              |
| updatedAt      | Firestore Timestamp = request.time            | Changed with each note                                 |
| _schemaVersion | integer = 1                                   | Immutable                                              |

### followUpNotes/{noteId}

SDK-generated 20-character document ID. Each case has zero or more notes; ownerUid = caseId = case document ID. Every note belongs to exactly one case.

| Field          | Type / value                                  | Change policy |
| -------------- | --------------------------------------------- | ------------- |
| ownerUid       | string = authenticated UID                    | Immutable     |
| caseId         | string = authenticated UID / existing case ID | Immutable     |
| text           | trimmed plain-text string, 10–500 characters  | Immutable     |
| createdAt      | Firestore Timestamp = request.time            | Immutable     |
| _schemaVersion | integer = 1                                   | Immutable     |

Both collection writes are checked with getAfter. Case update requires a previously absent note whose owner/case/time match. Note create requires the existing case count to increase by one and point to this ID. One-sided writes, extra fields, forged authors/times, context edits, updates/deletes of notes, guest/unverified access and cross-owner access are denied.

Reads: get the case by UID; query notes where ownerUid equals UID. Server reads are used after save, refresh and reload. Notes sort in the browser by createdAt descending then ID descending. This single-field query uses Firestore's built-in index; `firebase/firestore.indexes.json` remains empty. No Storage or Cloud Functions are deployed. No server/Admin SDK feature write bypasses the rules.

Retry: allocate the note ID before starting a transaction. A previously committed same-ID/text request returns without adding a record. An ambiguous/conflicting save retains its draft; refresh reconciles that ID before retry. Concurrent tabs may require explicit refresh/retry. History is unpaginated for the bounded demo; production-scale retention/pagination is future scope.

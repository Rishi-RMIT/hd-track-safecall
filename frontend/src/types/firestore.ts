import type { Timestamp } from 'firebase/firestore'

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 *
 * When adding a new collection, use the /firebase-collection skill.
 */

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: 'user'
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export type CreateUserProfileInput = Omit<UserProfile, 'createdAt' | 'updatedAt'>

export interface FollowUpCase {
  ownerUid: string
  deviceLabel: string
  context: string
  noteCount: number
  lastNoteId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export interface FollowUpNote {
  ownerUid: string
  caseId: string
  text: string
  createdAt: Timestamp
  _schemaVersion: 1
}

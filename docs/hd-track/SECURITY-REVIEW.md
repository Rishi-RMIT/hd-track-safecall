# Feature security review

Reviewed against the implemented notebook contract and executed tests on 1 November 2026.

- Notebook data uses the client SDK. Firestore rules enforce verified Auth, ownership, exact fields, fixed synthetic context, server timestamps and append-only history.
- Both directions of getAfter consistency are checked. A new note requires a matching case increment/last ID; a case increment requires a newly created matching note. Real Spark tests denied direct forgery and one-sided writes without changing the summary.
- Text is plain text rendered with React escaping. Inputs are trimmed and bounded. The session endpoint rejects unverified tokens; protected pages verify the cookie. Profile/session failures finish loading and show feedback.
- Stable request IDs survive uncertain failures. Refresh reconciles saved requests before another save; a changed draft is preserved. Concurrent stale-count denials are documented recoverable errors.
- The dedicated Vercel identity has only Auth users.get/createSession. Its local test passed session creation/revocation checking and confirmed Firestore data reads were denied. The Rules publisher has five Rules API permissions via repository/branch-restricted short-lived federation. The broad local Admin key remains ignored and local.
- The individual checkout's origin and GitHub CLI default are Rishi-RMIT/hd-track-safecall. Upstream fetch remains available, its push URL is disabled, and main tracks origin/main. Changes to the public template and shared team repository are outside scope.

## Remaining dependency findings

The recorded audit has zero high/critical and twelve moderate findings. Affected paths are qs in undeployed backend test tooling; ip-address in the undeployed backend rate limiter; minimatch/glob in lint/build and Firebase Admin's transitive filesystem maintenance chain. The notebook accepts no user-controlled glob patterns, filesystem paths or IP classification rules, and the backend Cloud Function is not deployed. No reachable notebook exploit was identified in this scoped review. This is not a claim that the dependencies are risk-free; the full audit remains available for maintenance.

The high/critical gate remains enabled. Patched dependencies were checked with lint, typecheck, tests and production build. Do not suppress future failures to make deployment pass.

## Production import boundary

The first Vercel runtime failed while loading an authentication dependency's ESM import. The exact-version pnpm patch uses dynamic import within asynchronous signing-key work; it does not downgrade dependencies, relax verification or change permissions. A fresh-process regression test disables CommonJS-to-ESM require support, resolves a real generated public key and verifies a signature. See [RUNTIME-COMPATIBILITY.md](RUNTIME-COMPATIBILITY.md) for maintenance and reproduction.

# Acceptance test plan and evidence

Environment: isolated real Spark project `hd-track-safecall`; synthetic accounts only. Initial real run found stale concurrent-count denial in T08. The final contract permits recoverable conflict, preserves the draft and requires history refresh before retry. The original failure is retained in `live-notebook-initial-results.json`; the final recovery test is in `live-notebook-results.json`. No claim of automatic completion of every concurrent request is made.

| Case | AC / UC | Procedure and expected result | Evidence |
|---|---|---|---|
| T01 | AC-01, UC1–2 | Create sample twice and reopen; one immutable labelled case, count stays 0 | live results; ui-case-empty, ui-history-empty |
| T02 | AC-02, UC3–6 | Save valid note; read both collections independently; count +1, last ID and timestamps agree; reload recovers text | live results; ui-happy-path, ui-reload-persistence |
| T03 | AC-03, UC error | UI short text; direct blank/9/501/untrimmed writes; field feedback and no changes to either collection | live results; ui-validation |
| T04 | AC-04, precondition/error | Guest, unverified and another owner try reads/writes; all denied; original data unchanged | live results, security report screenshot |
| T05 | AC-05, UC4/error | Forged owner/time/field, note-only/case-only write and context edit; all denied atomically | live results, security report screenshot |
| T06 | AC-06, UC error | Deferred save disables controls; simulated persistence rejection retains draft; refresh reconciles committed ID without resubmission; initial read failure exposes recovery | mocked component tests in notebook.test.tsx; test report screenshot; failure harness screenshot if captured |
| T07 | AC-07, UC2/6 | Edit/delete note/case denied; server query returns unchanged history; UI reload restores saved text | live results; ui-reload-persistence |
| T08 | AC-02/06/07 | Concurrent distinct requests; count matches acknowledged writes; explicit recovery adds each missing request once; same-ID retry adds zero | final live results; initial failure retained |
| T09 | AC-03 | Direct client accepts exact 10 and 500 characters with correct increments | live results |

Automated local gates: lint, typecheck, all unit/component tests, formatter, placeholder validator, high/critical dependency audit and production frontend/backend build. Remote CI and live-host tests remain pending until supported by their actual URLs and results.

Reproduce component checks with `pnpm run test:all`. Reproduce real Spark integration checks with `node frontend/scripts/test-notebook-live.mjs` from the repo root after configuring the ignored root `.env` for the intended project. The integration runner creates three unique synthetic accounts and records; it never resets another notebook, prints credentials, or changes/deletes real data. It uses Admin only to create test Auth accounts and uses client SDK operations under deployed rules for all notebook data.

# Individual HD Track baseline

This branch starts from the original RMIT Garage boilerplate at `7c375abe22efb04c843625ebaaea7261d3f0e56f`. The fork preserves its history and credits. Individual feature implementation has not started.

## Local setup

Use Node 22 and pnpm 10. Run `pnpm install --frozen-lockfile`, configure the ignored root `.env` following `docs/ENV-VARS.md`, run `pnpm run env:sync`, then `pnpm run dev`. The selected isolated development project is `hd-track-safecall` (Spark), with Standard Firestore in Sydney and Email/Password Authentication. Credentials are local-only and are not in this repository.

## Verified baseline on 1 November 2026

- Lint, TypeScript, placeholder validation and production frontend/backend build pass.
- Existing tests pass: 5 backend and 6 frontend, with Firebase mocked.
- Eight additional real Firebase/local-server checks pass; see `evidence/baseline-smoke-results.json`. Browser sign-in and authenticated dashboard reload were also verified.
- Pre-existing formatting checks fail in 4 backend and 10 frontend files.
- Pre-existing dependency audit reports 8 critical, 22 high, 32 moderate and 5 low findings. The inherited README's two-high note is stale. Remediation and regression checks remain required.
- An unrelated ancestor lockfile causes a Next.js workspace-root warning; no unrelated file was changed.

## Deployment status

Initial boilerplate rules were published manually to the isolated development project to verify profile persistence. This is not evidence of automatic deployment. The service account can perform the tested authentication/data operations, but CLI rules/index deployment returns 403 at the Service Usage API check. Deployment identity permissions remain to be configured explicitly.

The inherited deploy file is named `.github/workflows/deploy.yml_notinuse`, so it does not execute. Vercel integration, repository deployment secrets, a successful pipeline and a live deployed feature URL have not been established. Google sign-in is not enabled; only Email/Password was verified.

Raw local logs and private coursework working records are not part of the public repository. Do not commit environment files, service-account JSON, session cookies or synthetic account passwords.

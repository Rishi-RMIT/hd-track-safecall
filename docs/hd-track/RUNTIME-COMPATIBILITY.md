# Authentication runtime compatibility

The first automatic Production build at merge d9fb3a5 succeeded, but `/notebook` and `/api/auth/session` returned HTTP 500. Vercel logs identified `ERR_REQUIRE_ESM`: `jwks-rsa@4.1.0`, imported by Firebase Admin Auth, synchronously required the ESM-only `jose@6` package. The same failure was reproduced locally with Node 22 and `--no-experimental-require-module`. A passing build had not exercised that runtime boundary.

The version-specific pnpm patch changes both `jose` imports to dynamic imports inside asynchronous work. Signing-key resolution stays asynchronous; the Passport adapter retains its callback interface. Package versions, JWT verification, ownership rules and credentials are unchanged. The inherited landing instructions are replaced with a short synthetic-notebook explanation and the existing sign-in/account actions.

`frontend/tests/unit/admin-runtime.test.ts` starts a fresh Node process with CommonJS-to-ESM require support disabled. It loads Firebase Admin Auth, resolves a generated public RSA JWK through the patched resolver, verifies a signature with the returned key, and checks the Passport callback rejects an invalid token without a network request. Private test key material exists only in memory and is never printed or retained. The test is included in the existing push/PR test gate. Execution evidence is `evidence/runtime-patch-results.json`; the initial reproduction is `evidence/runtime-before-patch.json`.

The patch is registered in `pnpm-workspace.yaml` and hashed in the lockfile, so frozen installs reproduce it. Keep the exact-version patch until an upstream release supports this runtime; review and remove it when upgrading rather than disabling verification or relying on a runtime flag. Final acceptance still requires the deployed notebook's session, save/read/reload and access-control tests.

References: [Auth0 issue 507](https://github.com/auth0/node-jwks-rsa/issues/507), [pnpm patch documentation](https://pnpm.io/10.x/cli/patch).

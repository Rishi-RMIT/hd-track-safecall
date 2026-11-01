# Repository isolation

Verified on 1 November 2026. Checkout: HD Track/Individual/garage-boilerplate-basic. Individual branch: feature/hd-track-readiness.

- origin fetch/push: https://github.com/Rishi-RMIT/hd-track-safecall.git
- upstream fetch: https://github.com/RMIT-Garage/garage-boilerplate-basic.git
- upstream push: disabled://upstream-push-blocked
- remote.pushDefault: origin
- main upstream: origin/main; main pushRemote: origin
- feature branch pushRemote: origin
- GitHub CLI default repository: Rishi-RMIT/hd-track-safecall
- PR #1 base: Rishi-RMIT/hd-track-safecall, main. Head: the same fork, feature/hd-track-readiness.

The configuration check preserved existing changes byte for byte and made no push. Origin/main was fetched read-only to establish the missing tracking reference. The public template and shared team repository must never receive writes, branches or PRs. Always specify the fork explicitly in GitHub commands and use origin for permitted feature pushes. No merge is approved.

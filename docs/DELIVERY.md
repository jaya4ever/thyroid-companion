# Web delivery and desktop verification

Workflow changes take effect after they reach `main`. A feature-branch push does not deploy the website or publish a desktop artifact. No workflow in this project creates GitHub Releases or installs software on a Mac.

## Website

`.github/workflows/pages.yml` handles relevant pushes to `main` and optional manual runs on `main`:

1. Install the lockfile dependencies with Node 22.
2. Run the full test suite, React TypeScript checks, ESLint, and the production Vite build.
3. Add `dist/build-info.json`, recording the source commit and SHA-256 hashes of the built files.
4. Upload only `dist/`, then deploy it through the `github-pages` environment.
5. Fetch the public build receipt, HTML, and assets. The run succeeds only when the served commit and file hashes match that build. Verification retries briefly for CDN propagation and fails if the live files remain stale.

The public URL remains **https://jaya4ever.github.io/thyroid-companion/**, and the Vite production base remains `/thyroid-companion/`.

### Check deployment status

Open [Deploy to GitHub Pages](https://github.com/jaya4ever/thyroid-companion/actions/workflows/pages.yml), choose the latest relevant `main` run, and check its commit SHA. Confirm both the **build** and **deploy** jobs succeeded, including **Verify live commit and served assets**. A green build job alone does not establish that the website deployed.

After the first deployment with these workflows, [build-info.json](https://jaya4ever.github.io/thyroid-companion/build-info.json) identifies the served source commit. It is not available on the older deployment audited below. If live verification fails after the deployment step succeeds, Pages may already have changed: check the served receipt and logs rather than assuming a rollback occurred.

Docs-only and desktop-only changes do not redeploy the website. Active deployments finish before a newer pending run starts; GitHub retains only the latest pending run in the concurrency group. There is no second deployment workflow or PR-triggered delivery run. A manual retry is available when needed; select `main`.

## Electron build artifacts

`.github/workflows/desktop.yml` runs independently on relevant `main` pushes or a manual `main` run. It uses the standard `macos-15` Apple Silicon runner and checks the actual architecture before proceeding.

It installs dependencies with Node 22, checks shared React and Electron TypeScript, runs desktop security and provenance tests and ESLint, packages the app and ZIP, verifies the local signature/architecture/archive, and smoke-tests navigation, charts, reload, renderer isolation, and PDF export.

Only after those checks pass, it uploads an Actions artifact named:

```text
thyroid-companion-macos-arm64-<full-source-commit>
```

The artifact contains the application ZIP and `desktop-build-info.json`. The receipt records the source commit, platform, architecture, and ZIP hashes. Artifacts expire after 14 days. This is a local ad-hoc signed verification build, **not a Developer ID signed/notarized installer, public release, or automatic updater**.

### Download an artifact

1. Sign in to GitHub and open [Verify Electron macOS](https://github.com/jaya4ever/thyroid-companion/actions/workflows/desktop.yml).
2. Select a successful `main` run and confirm its commit SHA.
3. In **Artifacts**, download `thyroid-companion-macos-arm64-<commit>`.
4. Extract the Actions download. Keep `desktop-build-info.json`, then extract the application ZIP inside it.
5. If desired, compare the application ZIP with the receipt using `shasum -a 256 "/path/to/application.zip"`.

### Update a Mac application manually

A successful cloud build does **not** update a local or installed app.

1. Quit Thyroid Companion with **Command-Q**. Closing its window alone may leave the process running. Unsaved demo edits will be lost.
2. Download the successful artifact for the source revision you want, as described above.
3. Keep a backup of the previous `.app` if you want to be able to return to it.
4. Move the extracted `Thyroid Companion.app` to your chosen local folder or Applications folder, replacing the older copy only when ready.
5. Open that copy and check navigation, charts, and a fictional PDF export. Keep the matching build receipt so you know which source revision you selected; the About version alone may not distinguish builds.

macOS may warn about an unnotarized build. Do not disable Gatekeeper globally. These artifacts are intended for developer verification; a public distribution flow still needs appropriate signing, notarization, and review. App builds remain Apple Silicon only, and health records remain temporary fictional data. Explicitly exported PDFs remain on disk.

## Permissions and execution rules

- Actions are pinned to reviewed commit SHAs. Checkout does not retain credentials, and dependency installation uses `npm ci`.
- Both workflows use Node 22 and job timeouts. Shared frontend changes can start both workflows because both targets use that code; README and documentation-folder edits avoid expensive builds; changes to the packaged attribution notices still rebuild the desktop artifact.
- Ordinary build jobs have read access. Only the Pages deploy job receives `pages: write` and `id-token: write`; no custom secret, Apple identity, or release token is required.
- Desktop runs cancel superseded builds. Website deployments are serialized to avoid older deployments overtaking newer ones.
- Build artifacts contain only the requested output ZIP and receipt. No exported reports, screenshots, environment files, dependencies, or signing keys are uploaded as separate artifact files.
- A skipped docs-only run means the latest deployed/build commit can legitimately differ from the newest repository commit. Compare relevant changes and receipts.

## Baseline audit — October 29, 2026

This audit predates activation of the automatic workflows in this change:

| Item | Observed revision/result |
| --- | --- |
| Remote `main` | `1eb6b451f44dc871c81948e1cf2b17dc40c69b1d` — Electron PR merge |
| Electron feature commit | `d5c54e33095485c762490a62208b340431a1331a` — same Git tree as remote `main` |
| Latest Pages workflow/deployment | `09e889040c4add2ff1b6d39ba881e04fc9df6ebd` — build, deploy job, and Pages deployment record succeeded |
| Workflow run | [40926256474](https://github.com/jaya4ever/thyroid-companion/actions/runs/40926256474) |
| Live website | HTTP 200; HTML and entry JavaScript/CSS matched the current-main web build byte for byte |
| Local project `.app` | 23 compiled files matched a fresh desktop build of the audited source; the package has no embedded Git revision |
| Compiled Electron main SHA-256 | `1fac54975a1a5631e297e263d9311fe728c4d45c0754b121f25363aacdf47f8d` — same in package and fresh desktop build output |
| Installed copy | No `Thyroid Companion.app` found directly in `/Applications` or `~/Applications`; copies elsewhere were not inferred |
| Desktop Actions builds | No desktop verification workflow existed yet |

The deployment history lagged the Electron merge, but the live web entry assets were already current because that merge did not change the React interface. The local package comparison establishes matching compiled output, not a reliable embedded source commit. Future receipts make those distinctions explicit.

## Local validation

```bash
npm run test
npm run typecheck
npm run desktop:typecheck
npm run lint
npm run build
npm run desktop:make
npm run desktop:smoke
```

Validate workflow syntax and action expressions with `actionlint`. No GitHub run needs to be triggered for local validation. Hosted-runner behavior still needs confirmation in the first approved remote run.

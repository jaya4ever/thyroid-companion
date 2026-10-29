# Security and Privacy

Security and privacy are development requirements for Thyroid Companion, not a final release step. This project is a frontend-only learning prototype and must use fictional demo health information only.

## Principles

- Never add real patient or personal health information to source files, sample data, tests, screenshots, issue reports, GitHub, or debugging output.
- Never commit passwords, API keys, access tokens, private keys, or other secrets. Keep local environment files untracked. Anything named `VITE_*` is public because Vite bundles it into browser code; it must never contain a secret.
- Use fictional, clearly labeled demo data. Do not present demo values as medical advice or use them to recommend treatment.
- Render user-controlled values as ordinary React text. Avoid `dangerouslySetInnerHTML`, direct HTML injection, and unsafe URL handling. Validate data at trust boundaries if a backend or imported data is added later.
- Keep dependencies current enough to receive security fixes. Review advisories and the impact of dependency updates before release.
- Add a short security-risk note to the change description when a new feature changes data collection, persistence, sharing, external requests, permissions, or the attack surface.
- Do not describe this application as completely secure, HIPAA compliant, Apple approved, or otherwise certified without an applicable independent verification.

## Current Limitations

- The app is a browser-only prototype. It has no backend, authentication, authorization, or server-side data storage.
- Demo health values and profile labels are bundled in the client and are fictional. Profile, weight, lab, medication, dose, and symptom changes live in shared React Context memory and disappear when the page is refreshed; they are not a private medical record.
- The stylesheet requests DM Sans and Manrope from Google Fonts. This sends a font request and ordinary connection metadata to Google; health records are not included in that request. No analytics or health-data API is configured.
- There is no security assessment or compliance verification. A passing build, lint run, or dependency audit does not prove the application is secure.
- This prototype is not intended to collect or store real health information.

## Future Design Requirements

Before adding real accounts or health data, document data flows, privacy requirements, threat scenarios, retention/deletion behavior, and incident response. Use established standards for the system's context, including the [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/) as a security requirements reference. Select and record the applicable ASVS version and verification level for each release; do not treat the standard as a certification.

Future authentication should use a well-maintained identity provider and established protocols such as OpenID Connect/OAuth 2.0 rather than custom password or token flows. Authorization must be enforced by trusted server-side components, using least privilege and deny-by-default rules; hiding controls in React is not authorization. Design data storage with data minimization, explicit retention and deletion, access logging that excludes sensitive values, and encryption in transit and at rest. Review applicable privacy and health-data laws with qualified counsel before collecting real data.

## Release Checklist

- [ ] Confirm source, fixtures, screenshots, logs, and documentation contain fictional data only; inspect staged changes before publishing.
- [ ] Confirm no secrets or private key material are staged. Verify local `.env` files remain ignored and `.env.example` contains placeholders or non-secret settings only.
- [ ] Review changes for unsafe HTML rendering, unsafe URL use, unintended data collection, excessive browser storage, and sensitive console or error output.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Run `npm audit` (or the package manager's equivalent), review every finding, and record any accepted risk with an owner and remediation date.
- [ ] Review new or changed dependency versions and remove unused dependencies where practical.
- [ ] For features involving accounts, APIs, persistence, sharing, or real health information, update the threat model and map applicable controls to the selected OWASP ASVS version before release.
- [ ] Verify accessibility, privacy disclosures, data retention/deletion, authorization, and incident response behavior for the actual release scope.
- [ ] Make no security or compliance certification claims unless the exact claim has been verified and approved.

## Electron Demo Branch

The Electron wrapper loads the same fictional-data React interface from a local Vite server during development and packaged files in production. Its renderer uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`, with no preload bridge. Navigation to other documents, new windows, webviews, and permission requests are blocked. A desktop-only CSP limits script and resource sources; the existing Google Fonts and Emotion styling remain supported.

The named renderer session is nonpersistent, and health records still reset on refresh or restart. This does not imply that Electron creates no runtime files. Only generated demo PDF downloads are accepted, using a native save dialog; exported files remain on disk at the selected location.

Local macOS packages use an ad-hoc signature with no device entitlements. They are not Developer ID signed, notarized, audited, or approved for clinical use or public distribution. Packaging does not upload the app or use an Apple account. No automatic updater or publisher is configured.

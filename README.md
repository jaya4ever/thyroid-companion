# Thyroid Companion

**[Live Web Demo — Try Thyroid Companion](https://jaya4ever.github.io/thyroid-companion/)**

![Thyroid Companion web dashboard with fictional health records](docs/screenshots/overview-dashboard-current.png)

A React and TypeScript portfolio application for organizing fictional health records, reviewing trends, and exporting PDF summaries. The same frontend runs as a **GitHub Pages web app** and an **Electron desktop app for Apple Silicon Macs**.

The project demonstrates typed shared state, reusable validation, responsive interfaces, automated testing, and separate web and desktop build configurations. The web demo requires no account or installation; the desktop version is currently a local development build, not a public download.

## Features

| Area | Capabilities |
| --- | --- |
| Dashboard | Weight, lab, medication, symptom, and daily nutrition/activity summaries |
| Profile and weight | Editable sample profile, weight history, BMI calculation, and charts |
| Lab results | Add, edit, delete, filter, and chart results with user-entered reference limits |
| Medications and symptoms | Medication schedules, explicitly recorded dose status, and seven self-reported symptom ratings |
| Nutrition and activity | Meal and nutrient records, hydration, activity duration, and optional distance |
| Trends | Charts and tables across 7-, 30-, and 90-day ranges |
| Reports | Select dates and sections, preview records, and export a multi-page PDF |

Journal is currently a placeholder. All records are fictional, and edits reset on refresh or restart.

## Technology and Architecture

| Area | Technologies |
| --- | --- |
| Shared interface | React, TypeScript, Chakra UI, Emotion |
| Build and routing | Vite, React Router with HashRouter |
| Visualization and export | Recharts, Lucide React, jsPDF, jsPDF-AutoTable |
| Desktop | Electron, Electron Forge, Forge's Vite plugin, macOS ZIP maker |
| Verification | Vitest, React Testing Library, ESLint, TypeScript, Playwright Core desktop smoke checks |
| Web hosting | GitHub Pages, GitHub Actions |

```text
Shared React + TypeScript application
├── Web: Vite build → GitHub Pages
└── macOS: Electron window → bundled React interface
           └── Electron Forge → Apple Silicon .app and ZIP
```

- **Shared state:** React Context supplies records and update actions across screens, keeping dashboard summaries synchronized.
- **Typed boundaries:** TypeScript defines record shapes; reusable helpers validate input and handle calculations, sorting, and report assembly.
- **Routing:** HashRouter stores the page after `#`, supporting both static web hosting and desktop HTML loaded from disk.
- **Loading:** feature screens and PDF libraries load on demand. Web assets use `/thyroid-companion/`; desktop assets use relative paths.
- **Data handling:** medication completion requires user input, lab comparisons use supplied reference limits and matching units, and missing nutrient values remain distinct from zero.

Key folders: `src/features/` for screens, `src/context/` for shared state, `src/types/` for data models, `src/health/` for reusable logic, and `electron/` for the desktop wrapper. Exact dependency versions are recorded in `package-lock.json`.

## Run the Web App

Use **Node.js 22.13+ in the Node 22 release line**, npm, and Git. No API keys or backend setup are required.

```bash
git clone https://github.com/jaya4ever/thyroid-companion.git
cd thyroid-companion
npm install
npm run dev
```

Open the local URL printed by Vite, usually **http://localhost:5173**. Vite may select another port if that one is occupied. Use `npm ci` instead of `npm install` for an installation that follows the lockfile exactly.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the web development server |
| `npm run build` | Build the website into `dist/` |
| `npm run preview` | Preview the production build after building |
| `npm run test` | Run all unit and component tests once |
| `npm run test:watch` | Run tests while developing |
| `npm run typecheck` | Check the React application's TypeScript |
| `npm run lint` | Run ESLint |

The Vite build and TypeScript checks are separate commands. `npm test` is equivalent to `npm run test`.

## macOS Desktop Application

The desktop implementation is currently on **`feat/electron-macos`**. Use that checkout for the commands below. It targets **Apple Silicon (`arm64`) Macs** and requires macOS, Apple's command-line tools, and Node.js 22.13+ for development and packaging. The packaged application includes its runtime, so opening it does not require Node.js.

**Electron** creates the native macOS window around the existing React interface. **Vite** serves it during development and builds local assets for production. **Electron Forge** packages those assets and the Electron runtime into an application bundle and ZIP.

The main process manages the window and downloads. The React renderer has **context isolation, Chromium sandboxing, and web security enabled**, with **Node integration disabled** and no preload bridge. Navigation to other documents, popups, webviews, and unnecessary permission requests are blocked. A desktop Content Security Policy limits resource sources.

Reports use the shared jsPDF implementation. Electron accepts the generated report download and presents a **native Save dialog** so the user chooses where the PDF goes. No report service receives the records. The packaged app uses the supplied butterfly icon; web branding is unchanged.

After installing dependencies:

| Command | Purpose |
| --- | --- |
| `npm run desktop:dev` | Start the Electron application with Vite |
| `npm run desktop:typecheck` | Check Electron TypeScript |
| `npm run desktop:package` | Build the Apple Silicon `.app` |
| `npm run desktop:make` | Build the `.app` and its ZIP |
| `npm run desktop:smoke` | Test packaged navigation, charts, renderer isolation, and PDF export |
| `npm run desktop:icons` | Regenerate the macOS icon sizes and `.icns` |

After packaging, double-click `out/Thyroid Companion-darwin-arm64/Thyroid Companion.app` in Finder. ZIP output is under `out/make/zip/darwin/arm64/`. Generated packages and smoke-test exports are ignored by Git.

**Release status:** the local build has an ad-hoc signature. It is **not Developer ID signed or notarized**, and is **not yet a public installer or distribution release**. Intel builds and automatic updates are not configured. Forge's Vite integration is experimental and its version is pinned.

If cloud-sync metadata interferes with local signature checks, set `THYROID_DESKTOP_OUT_DIR` to a folder outside cloud sync when packaging. The unchanged Node 20 web workflow was also checked successfully; it emits engine warnings for desktop-only tooling, which requires Node 22.

## Verification and Accessibility

The verified suite has **107 passing tests across 18 files**, covering calculations, validation, feature workflows, dashboard updates, trends, PDF generation, and desktop security policy. The packaged-app smoke check also exercises real navigation, chart rendering, reload, and multi-page PDF saving; it automates the save destination only during the test.

```bash
npm run test
npm run typecheck
npm run desktop:typecheck
npm run lint
npm run build
npm run desktop:make
npm run desktop:smoke
```

The interface includes labeled controls, validation messages, visible focus styles, status announcements, keyboard-focusable tables, and modal mobile navigation. Trend charts have companion data tables. Formal accessibility conformance has not been assessed; manual assistive-technology review remains planned work.

## Demo Data and Limitations

- **Fictional data only:** this is a portfolio prototype, not a clinical application or a source of diagnosis or treatment advice.
- **No backend or record persistence:** records live in React memory and reset on refresh or restart. There is no database or authentication. The Electron renderer session is nonpersistent; normal runtime files may still be created, and explicitly saved PDFs remain on disk.
- **External fonts:** the interface requests Google Fonts; health records are not included in those requests. No analytics or health-data API is configured.
- **Screenshots:** the image above shows the web interface. Older screenshots in `docs/screenshots/` show earlier navigation and are historical, not the latest desktop interface.

Next steps include refreshing feature screenshots, extending browser coverage, completing manual accessibility checks, and defining privacy requirements before introducing persistent storage. See [SECURITY.md](SECURITY.md) for security notes.

## Attribution and Development

No project-level license has been selected. Dependency, font, desktop-runtime, and asset notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

AI-assisted tools were used during implementation and documentation. Automated checks support engineering review and do not replace human review.

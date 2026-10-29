# Third-Party Notices

This file records licenses for third-party software and font families currently identified in the project. Package versions and dependency relationships are recorded in `package-lock.json`. This list is based on installed package metadata and files in the current workspace; it is not a substitute for a release-time software bill of materials review.

## Runtime Dependencies

The following direct packages are included in the client application:

- [Chakra UI](https://github.com/chakra-ui/chakra-ui) — MIT; Copyright (c) 2019 Chakra Systems Inc.
- [Emotion](https://github.com/emotion-js/emotion) — MIT; Copyright Emotion team and other contributors.
- [React and React DOM](https://github.com/facebook/react) — MIT; Copyright Meta Platforms, Inc. and affiliates.
- [React Router](https://github.com/remix-run/react-router) — MIT; Copyright React Training LLC (2015–2019), Remix Software Inc. (2020–2021), and Shopify Inc. (2022–2023).
- [Recharts](https://github.com/recharts/recharts) — MIT; Copyright (c) 2015-present recharts.
- [jsPDF](https://github.com/parallax/jsPDF) — MIT; Copyright (c) 2010–2025 James Hall and (c) 2015–2025 yWorks GmbH.
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) — MIT; Copyright (c) 2014 Simon Bengtsson.
- [Lucide React](https://github.com/lucide-icons/lucide) — ISC; Copyright (c) 2026 Lucide Icons and Contributors. The Lucide license also identifies a set of Feather-derived icons available under MIT; see the linked [upstream license](https://github.com/lucide-icons/lucide/blob/main/LICENSE) for the authoritative icon list and terms.

### MIT License

The following license text applies to the MIT-licensed packages listed above. Keep their copyright notices with any redistributed copies or substantial portions.

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### Lucide ISC License

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

For Feather-derived Lucide icons, the upstream license includes this additional MIT notice:

```text
The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts

The stylesheet requests these fonts from Google Fonts; the font binaries are not checked into this repository:

- **DM Sans** — Copyright 2014 The DM Sans Project Authors; SIL Open Font License 1.1. [Upstream source and license](https://github.com/google/fonts/tree/main/ofl/dmsans).
- **Manrope** — Copyright 2018 The Manrope Project Authors; SIL Open Font License 1.1. [Upstream source and license](https://github.com/google/fonts/tree/main/ofl/manrope).

The SIL Open Font License allows font software to be bundled with software when the required copyright notice and license are included. Do not sell font files by themselves or relicense modified font software under different terms. If font files are added to this repository later, include the full OFL text with them.

## Development Tooling

The lockfile also includes development-only tooling and transitive packages. In the inspected dependency tree, `caniuse-lite` declares CC-BY-4.0 and `argparse` declares the Python Software Foundation License 2.0; they are used under Browserslist/Babel and ESLint respectively, not imported by the browser application. Their package source and license files are available from [caniuse-lite](https://github.com/browserslist/caniuse-lite/blob/main/LICENSE) and [argparse](https://github.com/nodeca/argparse/blob/master/LICENSE). Review the full installed dependency tree again before distributing bundled artifacts.

## Unverified Local Assets

The following unused files remain in the local working tree, but their individual provenance and redistribution terms are not recorded here:

- `src/assets/hero.png`
- `public/icons.svg`
- `src/assets/react.svg`
- `src/assets/vite.svg`
- `public/favicon.svg`

The React/Vite graphics appear to be starter assets, but their exact source files were not verified. `hero.png` and the multi-brand icon sprite have no source record. None is referenced by application code. All five paths are explicitly excluded in `.gitignore`; they remain on the developer's Mac and are not intended for the repository commit. Confirm their rights before removing those ignore entries or distributing the files.

## Project License

No project-level license has been selected. These third-party notices cover only the listed dependencies and fonts; they do not grant a license to Thyroid Companion's application code.

## Electron Demo Branch Tooling

The desktop branch adds Electron (MIT, with bundled Chromium and other third-party components), Electron Forge and its Vite/ZIP tooling (MIT), Playwright Core (Apache-2.0), Babel parsing tooling (MIT), and Node.js type definitions (MIT). Consult each installed package's LICENSE and the Electron distribution's `LICENSE` and `LICENSES.chromium.html` before distributing a desktop build. Forge retains Electron's bundled notices in its package output; this local prototype is not a distribution release.

The butterfly icon is supplied by the project owner for the desktop app. The original remains unchanged, and the generated PNG/iconset/ICNS copies derive from it without a redesign. No additional reuse or redistribution rights are asserted here.

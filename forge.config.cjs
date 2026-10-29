const path = require('node:path');

module.exports = {
  outDir: process.env.THYROID_DESKTOP_OUT_DIR || 'out',
  packagerConfig: {
    name: 'Thyroid Companion',
    executableName: 'Thyroid Companion',
    appBundleId: 'com.thyroidcompanion.demo',
    appCategoryType: 'public.app-category.healthcare-fitness',
    icon: path.join(__dirname, 'assets/icons/thyroid-companion.icns'),
    asar: true,
    extraResource: [
      'node_modules/electron/dist/LICENSE',
      'node_modules/electron/dist/LICENSES.chromium.html',
      'THIRD_PARTY_NOTICES.md',
    ],
    // Local ad-hoc signing seals the renamed bundle; no Apple account is used.
    osxSign: {
      identity: '-',
      identityValidation: false,
      preAutoEntitlements: false,
      preEmbedProvisioningProfile: false,
      optionsForFile: () => ({ hardenedRuntime: false, entitlements: [] }),
    },
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['darwin'] }],
  plugins: [{
    name: '@electron-forge/plugin-vite',
    config: {
      build: [{ entry: 'electron/main.ts', config: 'vite.main.config.mjs', target: 'main' }],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mjs' }],
    },
  }],
};

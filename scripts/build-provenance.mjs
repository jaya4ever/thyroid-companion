import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function createManifest(directory, commit, onlyZip = false) {
  if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('A full Git commit SHA is required');
  const files = {};
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const relative = path.relative(directory, file).split(path.sep).join('/');
        if (relative === 'build-info.json' || relative === 'desktop-build-info.json') continue;
        if (onlyZip && !relative.endsWith('.zip')) continue;
        files[relative] = digest(await readFile(file));
      }
    }
  }
  await visit(directory);
  if (!Object.keys(files).length) throw new Error('No build files found');
  return { commit, files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) };
}

export async function verifyWebsite(site, expected, fetcher = fetch) {
  const base = new URL(site.endsWith('/') ? site : `${site}/`);
  async function get(file) {
    const url = new URL(file, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Invalid manifest path');
    url.searchParams.set('verify', `${expected.commit}-${Date.now()}`);
    const response = await fetcher(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const live = JSON.parse((await get('build-info.json')).toString());
  if (live.commit !== expected.commit || JSON.stringify(live.files) !== JSON.stringify(expected.files)) {
    throw new Error('The live deployment does not match the expected build');
  }
  const entries = Object.entries(expected.files);
  for (let offset = 0; offset < entries.length; offset += 4) {
    await Promise.all(entries.slice(offset, offset + 4).map(async ([file, sha]) => {
      if (digest(await get(file)) !== sha) throw new Error(`Live file hash mismatch: ${file}`);
    }));
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'web' || mode === 'desktop') {
    const desktop = mode === 'desktop';
    const directory = desktop ? (process.env.THYROID_DESKTOP_OUT_DIR || 'out') : 'dist';
    const manifest = await createManifest(directory, process.env.GITHUB_SHA, desktop);
    const result = desktop ? { platform: 'darwin', arch: 'arm64', ...manifest } : manifest;
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, desktop ? 'desktop-build-info.json' : 'build-info.json'), JSON.stringify(result, null, 2) + '\n');
    if (!desktop && process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, `manifest=${JSON.stringify(manifest)}\n`);
    }
    console.log(`Recorded ${mode} build from ${manifest.commit}`);
  } else if (mode === 'verify-web') {
    const expected = JSON.parse(process.env.EXPECTED_WEB_BUILD_INFO || '{}');
    if (!/^[a-f0-9]{40}$/.test(expected.commit || '') || !expected.files?.['index.html']) throw new Error('Missing expected web build information');
    const attempts = 12;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await verifyWebsite(process.env.SITE_URL, expected);
        console.log(`Verified live HTML and all build assets from ${expected.commit}`);
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
        console.log(`Waiting for Pages/CDN update (${attempt}/${attempts}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  } else throw new Error('Use web, desktop, or verify-web');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

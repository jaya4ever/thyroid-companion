// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createManifest, verifyWebsite } from './build-provenance.mjs';

const commit = 'a'.repeat(40);
const folders = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })));
});
async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'thyroid-provenance-'));
  folders.push(directory);
  await writeFile(path.join(directory, 'index.html'), 'demo app');
  return { directory, manifest: await createManifest(directory, commit) };
}
function server(manifest, html = 'demo app') {
  return async url => new Response(url.pathname.endsWith('build-info.json') ? JSON.stringify(manifest) : html);
}

describe('delivery provenance', () => {
  it('records build hashes without including a stale receipt, and requires a commit', async () => {
    const { directory, manifest } = await fixture();
    await writeFile(path.join(directory, 'build-info.json'), 'stale');
    expect(await createManifest(directory, commit)).toEqual(manifest);
    await expect(createManifest(directory, 'main')).rejects.toThrow('full Git commit');
  });
  it('verifies actual served bytes and rejects an old deployment or changed asset', async () => {
    const { manifest } = await fixture();
    await verifyWebsite('https://example.com/thyroid-companion/', manifest, server(manifest));
    await expect(verifyWebsite('https://example.com/', manifest, server({ ...manifest, commit: 'b'.repeat(40) }))).rejects.toThrow('expected build');
    await expect(verifyWebsite('https://example.com/', manifest, server(manifest, 'old app'))).rejects.toThrow('hash mismatch');
  });
  it('does not accept failed HTTP responses or paths outside the site', async () => {
    const { manifest } = await fixture();
    await expect(verifyWebsite('https://example.com/', manifest, async () => new Response('', { status: 404 }))).rejects.toThrow('HTTP 404');
    const unsafe = { commit, files: { '../private': 'bad' } };
    await expect(verifyWebsite('https://example.com/app/', unsafe, server(unsafe))).rejects.toThrow('Invalid manifest path');
  });
  it('records only ZIPs in the desktop receipt and rejects empty builds', async () => {
    const { directory } = await fixture();
    await expect(createManifest(directory, commit, true)).rejects.toThrow('No build files');
    await writeFile(path.join(directory, 'demo.zip'), 'zip fixture');
    expect(Object.keys((await createManifest(directory, commit, true)).files)).toEqual(['demo.zip']);
  });
});

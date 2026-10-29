import { _electron as electron } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const executablePath = process.argv[2] || path.resolve('out/Thyroid Companion-darwin-arm64/Thyroid Companion.app/Contents/MacOS/Thyroid Companion');
const resultsDirectory = path.resolve('desktop-test-results');
await mkdir(resultsDirectory, { recursive: true });
const launchEnvironment = { ...process.env };
delete launchEnvironment.ELECTRON_RUN_AS_NODE;
const application = await electron.launch({ executablePath, env: launchEnvironment, timeout: 30000 });
const errors = [];
try {
  const page = await application.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('heading', { name: 'A little more in tune.' }).waitFor({ state: 'visible' });
  assert.match(page.url(), /^file:.*\/index\.html/);
  const security = await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const preferences = window.webContents.getLastWebPreferences();
    return {
      contextIsolation: preferences.contextIsolation,
      nodeIntegration: preferences.nodeIntegration,
      sandbox: preferences.sandbox,
      webSecurity: preferences.webSecurity,
      persistent: window.webContents.session.isPersistent(),
    };
  });
  assert.deepEqual(security, { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, persistent: false });
  assert.deepEqual(await page.evaluate(() => ({ node: typeof globalThis.require, process: typeof globalThis.process })), { node: 'undefined', process: 'undefined' });
  console.log('PASS packaged loading, isolated renderer, sandbox, and temporary session');

  const navigation = page.locator('.sidebar').getByRole('navigation');
  for (const [link, heading] of [
    ['My Profile', 'My Profile'], ['Lab results', 'Lab results'],
    ['Medications', 'Medications'], ['Symptoms', 'Symptom check-ins'],
    ['Nutrition', 'Nutrition'], ['Activity', 'Activity'], ['Trends', 'Trends'],
  ]) {
    await navigation.getByRole('link', { name: link, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true, level: 1 }).waitFor({ state: 'visible' });
    console.log(`PASS packaged navigation: ${link}`);
  }
  await page.locator('.recharts-wrapper svg').first().waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(resultsDirectory, 'trends.png') });
  console.log('PASS lazy-loaded chart rendering');

  await navigation.getByRole('link', { name: 'Reports', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('button', { name: 'Download PDF', exact: true }).isEnabled(), true);
  const exportPath = path.join(resultsDirectory, `demo-report-${Date.now()}.pdf`);
  await application.evaluate(({ BrowserWindow }, savePath) => {
    BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) => {
      // Test-only automation replaces the save dialog, never the production code.
      globalThis.__desktopDownload = { filename: item.getFilename(), options: item.getSaveDialogOptions() };
      item.setSavePath(savePath);
    });
  }, exportPath);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const deadline = Date.now() + 20000;
  let saved = false;
  while (Date.now() < deadline) {
    try {
      saved = (await readFile(exportPath)).subarray(0, 5).toString() === '%PDF-';
      if (saved) break;
    } catch { /* Download may still be in progress. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(saved, true, 'The PDF download must complete');
  const pdf = (await readFile(exportPath)).toString('latin1');
  assert.ok((pdf.match(/\/Type \/Page\b/g) || []).length > 1, 'PDF must contain multiple pages');
  const download = await application.evaluate(() => globalThis.__desktopDownload);
  assert.match(download.filename, /^thyroid-companion-report-.*\.pdf$/);
  assert.deepEqual(download.options.filters, [{ name: 'PDF document', extensions: ['pdf'] }]);
  await page.screenshot({ path: path.join(resultsDirectory, 'report-preview.png') });
  console.log(`PASS multi-page PDF export and native save configuration: ${exportPath}`);

  await navigation.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.locator('.recharts-wrapper svg').first().waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(resultsDirectory, 'dashboard.png') });
  await page.reload();
  await page.getByRole('heading', { name: 'A little more in tune.' }).waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  console.log('PASS dashboard chart, packaged reload, and no renderer exceptions');
} finally {
  await application.close();
}

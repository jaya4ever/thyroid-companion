/** Keep the renderer browser-only: it does not need Node or a preload bridge. */
export const rendererPreferences = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  webviewTag: false,
} as const;

export function isAppNavigation(candidate: string, entry: string): boolean {
  try {
    const target = new URL(candidate);
    const expected = new URL(entry);
    return target.protocol === expected.protocol && target.host === expected.host &&
      target.pathname === expected.pathname && target.search === expected.search;
  } catch {
    return false;
  }
}

export function isReportDownload(url: string, filename: string): boolean {
  return /^(blob:|data:application\/pdf[;,])/i.test(url) &&
    /^thyroid-companion-report-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.pdf$/.test(filename);
}

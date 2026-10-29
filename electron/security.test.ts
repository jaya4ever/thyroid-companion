// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isAppNavigation, isReportDownload, rendererPreferences } from './security';

describe('desktop renderer boundaries', () => {
  it('keeps browser isolation, sandboxing, and web security enabled', () => {
    expect(rendererPreferences).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, webviewTag: false });
  });
  it('allows packaged HashRouter navigation to the same document', () => {
    expect(isAppNavigation('file:///Applications/Demo.app/renderer/index.html#/reports', 'file:///Applications/Demo.app/renderer/index.html')).toBe(true);
  });
  it('allows development hash routes without allowing other origins or documents', () => {
    const entry = 'http://localhost:5173/';
    expect(isAppNavigation(`${entry}#/labs`, entry)).toBe(true);
    for (const url of ['https://example.com/', 'http://localhost:5174/', `${entry}other.html`, 'javascript:alert(1)', 'invalid']) {
      expect(isAppNavigation(url, entry)).toBe(false);
    }
  });
  it('blocks other local files and changed query strings', () => {
    const entry = 'file:///app/index.html';
    expect(isAppNavigation('file:///etc/passwd', entry)).toBe(false);
    expect(isAppNavigation(`${entry}?redirect=other`, entry)).toBe(false);
  });
  it('accepts only generated PDF report downloads', () => {
    const name = 'thyroid-companion-report-2026-10-01-to-2026-10-29.pdf';
    expect(isReportDownload('blob:file:///report-id', name)).toBe(true);
    expect(isReportDownload('data:application/pdf;base64,JVBER', name)).toBe(true);
    expect(isReportDownload('https://example.com/report.pdf', name)).toBe(false);
    expect(isReportDownload('blob:file:///report-id', '../../report.pdf')).toBe(false);
    expect(isReportDownload('data:text/html,test', name)).toBe(false);
  });
});

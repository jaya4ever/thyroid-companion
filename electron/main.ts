import { app, BrowserWindow, dialog, Menu, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isAppNavigation, isReportDownload, rendererPreferences } from './security';

let mainWindow: BrowserWindow | null = null;

function configureRendererSession(): void {
  const rendererSession = session.fromPartition('thyroid-demo');
  rendererSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  rendererSession.setPermissionCheckHandler(() => false);
  rendererSession.on('will-download', (event, item) => {
    if (!isReportDownload(item.getURL(), item.getFilename())) {
      event.preventDefault();
      return;
    }
    // Preserve jsPDF's browser download while letting macOS ask where to save it.
    item.setSaveDialogOptions({
      title: 'Save fictional demo report',
      defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: [{ name: 'PDF document', extensions: ['pdf'] }],
    });
  });
}

function createWindow(): void {
  const rendererSession = session.fromPartition('thyroid-demo');
  const window = new BrowserWindow({
    title: 'Thyroid Companion',
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: '#f8f9f5',
    show: false,
    webPreferences: { ...rendererPreferences, session: rendererSession },
  });
  mainWindow = window;
  const rendererFile = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
  const entry = MAIN_WINDOW_VITE_DEV_SERVER_URL || pathToFileURL(rendererFile).href;
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppNavigation(url, entry)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isAppNavigation(url, entry)) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { mainWindow = null; });
  window.webContents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      dialog.showErrorBox('Thyroid Companion could not open', description);
    }
  });
  const loaded = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    : window.loadFile(rendererFile);
  void loaded.catch((error: Error) => {
    dialog.showErrorBox('Thyroid Companion could not open', error.message);
  });
}

void app.whenReady().then(() => {
  configureRendererSession();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ]));
  createWindow();
  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

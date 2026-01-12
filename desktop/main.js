const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_NAME = 'COTS Architect';

const pad = (value) => String(value).padStart(2, '0');

const formatTimestamp = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

const getSessionsDir = () => path.join(app.getPath('documents'), 'COTS-Architect', 'Sessions');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

let sessionInfo = null;

const startSession = () => {
  const now = new Date();
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  const fileName = `session_${formatTimestamp(now)}.json`;
  const filePath = path.join(sessionsDir, fileName);

  sessionInfo = {
    startedAt: now.toISOString(),
    fileName,
    path: filePath,
    directory: sessionsDir
  };

  return sessionInfo;
};

const saveSession = (payload) => {
  if (!sessionInfo) startSession();
  if (!sessionInfo) return { ok: false, error: 'Unable to initialize session storage' };

  try {
    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.writeFileSync(sessionInfo.path, json, 'utf8');
    return { ok: true, path: sessionInfo.path };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.once('ready-to-show', () => window.show());

  if (process.env.COTS_DEBUG === '1' || process.env.CERADON_DEBUG === '1') {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  window.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      window.webContents.openDevTools({ mode: 'detach' });
      event.preventDefault();
    }
  });

  const indexPath = path.join(__dirname, '..', 'index.html');
  window.loadFile(indexPath);
};

app.setName(APP_NAME);
app.setAppUserModelId('com.cots.architect');

app.whenReady().then(() => {
  startSession();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('session:info', () => sessionInfo || startSession());
ipcMain.handle('session:save', (event, payload) => saveSession(payload));

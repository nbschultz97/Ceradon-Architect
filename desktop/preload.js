const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopSession', {
  info: () => ipcRenderer.invoke('session:info'),
  save: (data) => ipcRenderer.invoke('session:save', data),
  isDesktop: true
});

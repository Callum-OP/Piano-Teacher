const { contextBridge, ipcRenderer } = require('electron');

// Check if app is packaged
contextBridge.exposeInMainWorld('env', {
    isPackaged: ipcRenderer.sendSync('get-is-packaged')
});
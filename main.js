const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true
    }
  });

  // This loads index.html
  win.loadFile('index.html'); 
}

app.whenReady().then(createWindow);

// Standard Mac/Windows behavior for closing apps
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
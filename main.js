const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');

// Allow audio
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

ipcMain.on('get-is-packaged', (event) => {
    event.returnValue = app.isPackaged;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // This loads index.html
  win.loadFile(path.join(__dirname, 'build/index.html')); 
}

app.whenReady().then(createWindow);

// Standard behavior for closing apps
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log("App is quitting.");
});
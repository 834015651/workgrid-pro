
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // 🔴 允许跨域加载本地资源
        }
    });

    // 调试模式
   //win.webContents.openDevTools();
    win.setMenu(null);
    // 强制使用绝对路径加载
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('正在加载页面:', indexPath);
    
    win.loadFile(indexPath);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🛠️ 开始执行白屏修复补丁...");

// 1. 修改 package.json：强制关闭 ASAR 压缩，显式包含 dist 目录
const pkgPath = path.join(__dirname, 'package.json');
try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // 强制添加 build 配置
    pkg.build = {
        ...pkg.build,
        "asar": false,  // 🔴 关键：关闭压缩，直接暴露文件
        "files": [
            "dist/**/*",
            "main.js",
            "package.json",
            "node_modules/**/*"
        ],
        "directories": {
            "output": "release"
        }
    };
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log("✅ package.json 配置已更新：关闭 asar 压缩模式");
} catch (e) {
    console.error("❌ 修改 package.json 失败:", e);
}

// 2. 重写 main.js：使用最稳健的 CommonJS 写法 (避免路径解析错误)
const mainJsContent = `
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
    win.webContents.openDevTools();
    
    // 强制使用绝对路径加载
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('正在加载页面:', indexPath);
    
    win.loadFile(indexPath);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`;

try {
    fs.writeFileSync(path.join(__dirname, 'main.js'), mainJsContent);
    console.log("✅ main.js 已重写：使用稳定版路径逻辑");
} catch (e) {
    console.error("❌ 重写 main.js 失败:", e);
}

console.log("\n🎉 修复完成！请立即在终端运行: node fix_pack.js 然后 npm run pack");
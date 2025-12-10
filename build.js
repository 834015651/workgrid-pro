import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 错误处理
process.on('uncaughtException', (err) => {
    console.error(`\n❌ [错误] 脚本中断: ${err.message}`);
    process.exit(1);
});

console.log(`\n==============================================`);
console.log(` 🚀 WorkGrid Pro 绿色免安装版构建`);
console.log(` ==============================================`);

const run = (cmd) => {
    try { execSync(cmd, { stdio: 'inherit' }); } 
    catch (e) { console.log(`   ⚠️ 提示: ${e.message.split('\n')[0]}`); }
};

// 1. 强制清理缓存 (解决 symbolic link 报错)
console.log(`\n[1/6] 清理系统缓存...`);
try {
    const userHome = process.env.USERPROFILE;
    const cachePath = path.join(userHome, 'AppData', 'Local', 'electron-builder', 'Cache');
    if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`   ✅ 已清理 Electron 缓存`);
    }
    const releaseDir = path.join(__dirname, 'release');
    if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true, force: true });
} catch (e) {}

// 2. 修复 App.tsx (解决输入崩溃 + Excel 样式)
console.log(`\n[2/6] 修复代码逻辑...`);
const appPath = path.join(__dirname, 'App.tsx');
if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf8');
    let modified = false;

    // 替换 Excel 库
    if (content.includes("from 'xlsx';")) {
        content = content.replace("from 'xlsx';", "from 'xlsx-js-style';");
        modified = true;
    }
    // 修复输入崩溃 Bug
    if (content.includes("emp.name.toLowerCase()") && !content.includes("emp.name &&")) {
        content = content.replace(/emp\.name\.toLowerCase\(\)/g, "(emp.name||'').toLowerCase()");
        modified = true;
    }
    if (modified) {
        fs.writeFileSync(appPath, content, 'utf8');
        console.log(`   ✨ 代码已自动修复`);
    }
}

// 3. 修改 package.json (配置为免安装模式)
console.log(`\n[3/6] 配置打包参数...`);
const pkgPath = path.join(__dirname, 'package.json');
if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // 1. 换成 xlsx-js-style
    if (pkg.dependencies) {
        delete pkg.dependencies.xlsx;
        pkg.dependencies["xlsx-js-style"] = "1.2.0";
    }

    // 2. 补全开发工具
    if (!pkg.devDependencies) pkg.devDependencies = {};
    pkg.devDependencies["electron-builder"] = "^24.13.3";
    pkg.devDependencies["tailwindcss"] = "^3.4.1";
    pkg.devDependencies["postcss"] = "^8.4.35";
    pkg.devDependencies["autoprefixer"] = "^10.4.18";

    // 3. 关键：修改命令为 --dir (只生成文件夹)
    pkg.scripts.pack = "electron-builder --dir --x64";

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(`   ✅ 已切换为“绿色免安装”模式`);
}

// 4. 补全配置
const configFiles = {
    'postcss.config.js': `export default { plugins: { tailwindcss: {}, autoprefixer: {}, }, }`,
    'tailwind.config.js': `export default { content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./*.{js,ts,jsx,tsx}"], theme: { extend: {}, }, plugins: [], }`,
    'main.js': `import { app, BrowserWindow } from 'electron'; import path from 'path'; import { fileURLToPath } from 'url'; const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename); function createWindow() { const win = new BrowserWindow({ width: 1280, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } }); win.setMenu(null); win.loadFile(path.join(__dirname, 'dist', 'index.html')); } app.whenReady().then(createWindow); app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });`
};
for (const [name, content] of Object.entries(configFiles)) {
    fs.writeFileSync(path.join(__dirname, name), content, 'utf8');
}

// 5. 安装依赖
console.log(`\n[4/6] 安装依赖...`);
try { execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'ignore' }); } catch(e){}
run('npm install --legacy-peer-deps');

// 6. 编译与打包
console.log(`\n[5/6] 编译网页...`);
try { execSync('npm run build', { stdio: 'inherit' }); } 
catch (e) { console.error(`❌ 编译失败`); process.exit(1); }

console.log(`\n[6/6] 生成软件...`);
try { execSync('npm run pack', { stdio: 'inherit' }); } 
catch (e) { console.error(`❌ 打包失败`); process.exit(1); }

console.log(`\n✅✅✅ 全部成功！`);
console.log(`👉 请去这个文件夹找软件: release\\win-unpacked`);
console.log(`👉 里面有个 WorkGrid Pro.exe，双击就能用！`);
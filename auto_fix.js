import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// 模拟 __dirname (ESM 环境必备)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("========================================");
console.log("   WorkGrid Pro 智能修复系统 (ESM版)");
console.log("========================================");

// 1. 定义要修复的文件内容
const filesToFix = {
    'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.sticky-col { position: sticky; z-index: 10; background-color: white; }`,
    'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>工时管理系统</title>
  </head>
  <body class="bg-gray-50 text-slate-800 antialiased">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`
};

// 2. 写入配置文件
console.log("\n[1/5] 正在修复配置文件...");
for (const [filename, content] of Object.entries(filesToFix)) {
    fs.writeFileSync(path.join(__dirname, filename), content, 'utf8');
    console.log(`  - ${filename} 已生成/修复`);
}

// 3. 智能修复代码逻辑
console.log("\n[2/5] 正在扫描并修复代码...");

// 修复 App.tsx (Excel 导入问题)
const appPath = path.join(__dirname, 'App.tsx');
if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');
    if (appContent.includes("import XLSX from 'xlsx'")) {
        appContent = appContent.replace("import XLSX from 'xlsx'", "import * as XLSX from 'xlsx'");
        fs.writeFileSync(appPath, appContent, 'utf8');
        console.log("  - [App.tsx] 修复了 XLSX 导入错误");
    }
}

// 修复 index.tsx (样式引入问题)
const indexPath = path.join(__dirname, 'index.tsx');
if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    if (!indexContent.includes("import './index.css'")) {
        // 在 imports 区域插入
        indexContent = "import './index.css';\n" + indexContent;
        fs.writeFileSync(indexPath, indexContent, 'utf8');
        console.log("  - [index.tsx] 添加了样式引用");
    }
}

// 4. 执行命令 (安装、编译、打包)
console.log("\n[3/5] 正在安装依赖 (这可能需要几分钟)...");
try {
    // 设置加速源
    execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'ignore' });
    execSync('npm config set electron_mirror https://npmmirror.com/mirrors/electron/', { stdio: 'ignore' });
    execSync('npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/', { stdio: 'ignore' });
    
    // 安装
    execSync('npm install', { stdio: 'inherit' }); 
} catch (e) {
    console.error("❌ 安装失败！请检查网络。");
    process.exit(1);
}

console.log("\n[4/5] 正在编译网页...");
try {
    execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
    console.error("❌ 编译失败！请检查上方报错。");
    process.exit(1);
}

console.log("\n[5/5] 正在打包 EXE...");
try {
    execSync('npm run pack', { stdio: 'inherit' });
} catch (e) {
    console.error("❌ 打包失败！");
    process.exit(1);
}

console.log("\n✅✅✅ 全部完成！请去 release 文件夹查看软件。");
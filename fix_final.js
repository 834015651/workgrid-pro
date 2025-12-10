import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚑 正在执行最终修复...");

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// 1. 将 main.js 重命名为 main.cjs (告诉系统这是老式脚本)
const oldMain = path.join(__dirname, 'main.js');
const newMain = path.join(__dirname, 'main.cjs');

if (fs.existsSync(oldMain)) {
    fs.renameSync(oldMain, newMain);
    console.log("✅ 文件已重命名: main.js -> main.cjs");
} else if (fs.existsSync(newMain)) {
    console.log("✅ main.cjs 已存在，跳过重命名");
} else {
    console.log("⚠️ 未找到 main.js，可能已经改过了");
}

// 2. 更新 package.json 指向新文件
pkg.main = "main.cjs";

// 3. 告诉打包工具把 main.cjs 打包进去，而不是 main.js
if (pkg.build && pkg.build.files) {
    const files = pkg.build.files;
    // 移除 main.js
    const index = files.indexOf('main.js');
    if (index !== -1) files.splice(index, 1);
    // 加入 main.cjs
    if (!files.includes('main.cjs')) files.push('main.cjs');
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log("✅ package.json 配置已更新");

console.log("\n🎉 修复完毕！请立即运行: npm run pack");
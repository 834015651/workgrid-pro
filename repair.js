import fs from 'fs';
import { execSync } from 'child_process';

console.log("========================================");
console.log("   WorkGrid Pro 智能修复系统 (Node版)");
console.log("========================================");

// 1. 定义需要强制生成的文件
const files = {
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
.sticky-col { position: sticky; z-index: 10; background-color: white; }`
};

// 2. 写入配置文件
console.log("\n[1/4] 正在修复配置文件...");
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(name, content, 'utf8');
  console.log(`  - ${name} 已生成`);
}

// 3. 修复 index.tsx (确保引入样式)
console.log("\n[2/4] 正在检查代码引用...");
if (fs.existsSync('index.tsx')) {
  let content = fs.readFileSync('index.tsx', 'utf8');
  if (!content.includes("import './index.css'")) {
    content = "import './index.css';\n" + content;
    fs.writeFileSync('index.tsx', content, 'utf8');
    console.log("  - index.tsx 已修复 (添加样式引用)");
  }
}

// 4. 执行安装和打包命令
console.log("\n[3/4] 正在安装依赖 (请耐心等待)...");
try {
  // 设置加速源
  execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'ignore' });
  
  // 安装
  execSync('npm install', { stdio: 'inherit' }); 
} catch (e) {
  console.error("❌ 安装出错，请检查网络。");
  process.exit(1);
}

console.log("\n[4/4] 正在打包...");
try {
  execSync('npm run build', { stdio: 'inherit' });
  execSync('npm run pack', { stdio: 'inherit' });
} catch (e) {
  console.error("❌ 打包出错！");
  process.exit(1);
}

console.log("\n✅✅✅ 全部成功！请去 release 文件夹查看软件。");
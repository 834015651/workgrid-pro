const fs = require('fs');
const path = require('path');

// ================= 配置区域 =================
// 1. 定义要删除的文件和文件夹路径
const filesToDelete = [
  path.join(__dirname, 'src', 'main_with_logs.tsx'), // 影子入口文件
  path.join(__dirname, 'src', 'modules', 'ConstructionLog') // 模块文件夹
];

// 2. 定义 index.html 的可能位置 (Vite 在根目录, CRA 在 public 目录)
const possibleHtmlPaths = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'public', 'index.html')
];
// ===========================================

console.log('🗑️  开始移除“施工日志”模块...');

// --- 步骤 1: 还原 index.html ---
let htmlRestored = false;
for (const htmlPath of possibleHtmlPaths) {
  if (fs.existsSync(htmlPath)) {
    try {
      let content = fs.readFileSync(htmlPath, 'utf-8');
      
      // 检查是否包含影子入口
      if (content.includes('src/main_with_logs.tsx')) {
        console.log(`📄 发现被修改的 HTML: ${htmlPath}`);
        
        // 替换回原入口
        const newContent = content.replace('src/main_with_logs.tsx', 'src/index.tsx');
        fs.writeFileSync(htmlPath, newContent, 'utf-8');
        
        console.log('✅ index.html 已成功还原指向 src/index.tsx');
        htmlRestored = true;
      } else {
        console.log(`ℹ️  ${path.basename(htmlPath)} 未被修改或已还原，跳过。`);
      }
    } catch (err) {
      console.error(`❌ 读取/修改 HTML 失败: ${err.message}`);
    }
  }
}

// --- 步骤 2: 删除相关文件和文件夹 ---
filesToDelete.forEach(targetPath => {
  if (fs.existsSync(targetPath)) {
    try {
      // 递归强制删除 (兼容文件和文件夹)
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`✅ 已删除: ${targetPath.replace(__dirname, '')}`);
    } catch (err) {
      console.error(`❌ 删除失败: ${targetPath} - ${err.message}`);
    }
  } else {
    console.log(`ℹ️  文件不存在，无需删除: ${targetPath.replace(__dirname, '')}`);
  }
});

console.log('\n✨ 卸载完成！软件已恢复到未安装日志模块的状态。');
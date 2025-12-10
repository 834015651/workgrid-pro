import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.join(__dirname, 'package.json');

try {
    // 1. 读取 package.json
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;

    // 2. 拆分版本号 (例如 "1.0.2" -> [1, 0, 2])
    const parts = oldVersion.split('.').map(Number);

    // 3. 版本号自增逻辑 (最后一位 +1)
    // 逻辑：只增加最后一位修订号，适合频繁迭代
    parts[2] += 1;

    const newVersion = parts.join('.');
    pkg.version = newVersion;

    // 4. 写回文件
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    console.log(`\n   ✅ 版本号已更新: v${oldVersion} -> v${newVersion}`);

} catch (e) {
    console.error("   ❌ 版本号更新失败:", e.message);
    process.exit(1);
}
@echo off
:: 防止乱码
chcp 65001 >nul
color 0A
title WorkGridPro - 强制同步 V4

echo ========================================================
echo   请务必先关闭 VSCode 再运行此脚本！
echo   请务必先关闭 VSCode 再运行此脚本！
echo   请务必先关闭 VSCode 再运行此脚本！
echo ========================================================
echo.
echo 按任意键开始...
pause >nul

:: 1. 强制清理旧仓库
echo.
echo [1/5] 正在清理旧的 Git 记录...
if exist ".git" (
    attrib -h -s -r ".git" /s /d
    rd /s /q ".git"
)

:: 2. 重建忽略文件
echo.
echo [2/5] 正在生成 .gitignore (屏蔽大文件)...
(
    echo node_modules/
    echo dist/
    echo release/
    echo build/
    echo .env.local
    echo .vscode/
    echo .idea/
    echo *.exe
    echo *.zip
    echo *.dmg
    echo *.log
    echo *.rar
) > .gitignore

:: 3. 初始化并关联
echo.
echo [3/5] 正在初始化新仓库...
git init
git branch -M main
git remote add origin https://github.com/834015651/workgrid-pro.git

:: 4. 提交
echo.
echo [4/5] 正在添加文件 (只包含纯代码)...
git add .
git commit -m "Reset: V4 Clean Upload"

:: 5. 推送
echo.
echo [5/5] 正在上传...
echo       (如果卡住，请检查加速器)
git push -u origin main --force

echo.
echo ========================================================
echo               执行结束
echo ========================================================
pause
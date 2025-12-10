@echo off
cd /d "%~dp0"
title WorkGrid Pro 最终发布打包
chcp 65001 >nul
cls
color 0A

echo ========================================================
echo       WorkGrid Pro 最终发布版打包 (强力清理模式)
echo ========================================================
echo.

:: 1. 强力清理 (删除所有可能的缓存)
echo [1/4] 正在清理所有缓存文件...
if exist release rd /s /q release
if exist dist rd /s /q dist
if exist node_modules\.vite rd /s /q node_modules\.vite
echo - 清理完成。
echo.

:: 2. 重新安装依赖 (防止依赖包损坏)
:: echo [2/4] 检查依赖环境...
:: call npm install
:: echo - 依赖检查完成。
:: echo.

:: 3. 编译网页
echo [2/4] 正在编译 React 前端代码 (Vite)...
call npm run build
if errorlevel 1 (
    color 0C
    echo [错误] 前端编译失败！
    pause
    exit
)
echo - 编译成功！
echo.

:: 4. 生成安装包
echo [3/4] 正在生成 Windows 安装包...
echo - 这需要一点时间，请耐心等待...
call npm run dist
if errorlevel 1 (
    color 0C
    echo [错误] 打包失败！
    pause
    exit
)

echo.
echo [4/4] 打包完成！
echo ========================================================
echo   ✅ 安装包已生成！
echo   ⚠️ 注意：请发给别人测试，或者在自己的电脑上
echo      删除 %AppData%\workgrid-pro 文件夹后再测试，
echo      才能看到“新用户”的视角。
echo ========================================================
echo.

start explorer "release"
pause
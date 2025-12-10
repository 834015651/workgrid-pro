@echo off
chcp 65001 >nul
color 0A
title WorkGridPro - 正在启动...

:: 切换到当前目录
cd /d "%~dp0"

echo ========================================================
echo       WorkGridPro 考勤管理系统 - 一键启动助手
echo ========================================================
echo.

:: 1. 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [错误] 未检测到 Node.js 环境！
    echo 请先去 https://nodejs.org 下载并安装 Node.js。
    echo.
    pause
    exit
)

:: 2. 检查是否安装了依赖包 (node_modules)
if not exist "node_modules" (
    echo [提示] 检测到是第一次运行（或缺少依赖），正在自动安装...
    echo 这可能需要几分钟，请耐心等待...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [错误] 依赖安装失败，请检查网络或配置。
        pause
        exit
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
)

:: 3. 启动软件
echo [信息] 正在唤醒浏览器...
echo [信息] 请不要关闭此黑色窗口，关闭窗口会停止服务。
echo.

:: 根据你的项目类型，这里通常是 npm start
call npm run dev

:: 如果意外退出，暂停显示错误信息
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [错误] 启动失败，请检查报错信息。
    pause
)
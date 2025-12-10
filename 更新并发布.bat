@echo off
chcp 65001 >nul
color 0A
title 正在更新 WorkGrid 到云端...

echo ========================================================
echo          正在准备更新 WorkGrid (工时统计系统)...
echo ========================================================
echo.

:: 1. 确保在当前目录
cd /d "%~dp0"

:: 2. 强制添加所有变动
echo [1/3] 正在收集文件更改 (git add)...
git add .

:: 3. 提交更改
set /p commit_msg="请输入更新说明 (直接回车默认: 优化体验): "
if "%commit_msg%"=="" set commit_msg=优化体验

echo.
echo [2/3] 正在提交更改 (git commit)...
git commit -m "%commit_msg%"

:: 4. 推送到 GitHub
echo.
echo [3/3] 正在推送到云端并触发 Vercel 部署 (git push)...
git push origin main

echo.
echo ========================================================
echo      SUCCESS! Vercel 正在后台自动部署更新...
echo      (请等待约 1-2 分钟后在手机上刷新查看)
echo ========================================================
echo.
pause
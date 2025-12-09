@echo off
chcp 65001 >nul 2>&1
cls
echo ========================================
echo      重要事件备忘录 - 开发服务器
echo ========================================
echo.
echo 正在启动...
echo.

cd /d "%~dp0"
npm run dev

pause




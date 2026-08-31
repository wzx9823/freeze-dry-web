@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo [错误] 未检测到 Node.js，请先安装 https://nodejs.org 并重启命令行 & pause & exit /b)
echo 正在启动冻干工艺优化 PWA 本地服务...
echo 本机浏览器打开 http://127.0.0.1:8765/
echo 手机访问：连同一 WiFi，浏览器打开 http://电脑局域网IP:8765/ ，然后"添加到主屏幕"
node "%~dp0serve.js"

@echo off
cd /d "F:\冻干工艺优化系统\pwa"
echo ============================================
echo  推送到 GitHub Pages 仓库
echo  wzx9823/freeze-dry-web  (本地 master -> 远程 main)
echo ============================================
git push github +master:main
if %errorlevel%==0 (
  echo.
  echo [OK] 推送成功！Pages 伺服 main 分支，约 1-2 分钟自动生效
  echo  访问： https://wzx9823.github.io/freeze-dry-web/
) else (
  echo.
  echo [失败] 常见原因：
  echo  1) 需要 GitHub Personal Access Token（不是账号密码）
  echo     生成：github.com → Settings → Developer settings
  echo            → Personal access tokens → 勾选 repo 权限
  echo  2) 本机无法连接 github.com（网络/代理问题）
  echo     可改用 GitHub Desktop 或配置代理后重试
)
echo.
pause

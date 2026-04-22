@echo off
echo 正在查找占用端口3002的进程...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002"') do (
    echo 找到进程ID: %%a，正在终止...
    taskkill /PID %%a /F
)
echo.
echo 完成！现在可以重新启动后端了。
pause

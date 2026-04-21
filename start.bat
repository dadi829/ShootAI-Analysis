@echo off
echo ========================================
echo  🎯 气步枪打靶数据分析系统
echo ========================================
echo.

echo [1/2] 启动后端API服务器...
start "后端服务器" cmd /k "cd backend && npm install && npm start"

echo 等待5秒让服务器启动...
timeout /t 5 /nobreak > nul

echo.
echo [2/2] 启动前端开发服务器...
start "前端开发" cmd /k "npm install && npm run dev"

echo.
echo ✅ 两个服务都已启动！
echo.
echo 🌐 前端访问地址: http://localhost:3000
echo 🔧 后端API地址: http://localhost:3001
echo.
echo 💡 如果需要配置API密钥，请编辑 backend\.env 文件
echo.
pause

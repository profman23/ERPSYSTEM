@echo off
echo ====================================
echo Starting Veterinary ERP System
echo ====================================
echo.

echo [1/3] Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Client...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo.
echo ====================================
echo System Started Successfully!
echo ====================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5000
echo Test API: http://localhost:3000/api/v1/test
echo.
echo Press any key to exit (this will NOT stop the servers)
pause >nul

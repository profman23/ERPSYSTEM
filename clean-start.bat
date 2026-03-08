@echo off
echo ====================================
echo Cleaning and Starting System
echo ====================================
echo.

echo [1/2] Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2/2] Starting servers...
start "Backend Server" cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak >nul

start "Frontend Client" cmd /k "cd client && npm run dev"

echo.
echo ====================================
echo System Started!
echo ====================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5000
echo.
echo Wait 10-15 seconds for everything to load...
echo.
pause

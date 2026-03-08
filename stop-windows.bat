@echo off
echo ====================================
echo Stopping Veterinary ERP System
echo ====================================
echo.

echo Stopping Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ====================================
echo All servers stopped!
echo ====================================
echo.
pause

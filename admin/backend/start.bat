@echo off
echo ==========================================
echo   MediNest Super Admin Panel
echo ==========================================
echo.
echo Starting SuperAdmin Backend on port 4002...
start "SuperAdmin Backend" cmd /k "cd /d %~dp0 && node server.js"
echo.
echo Waiting for backend to start...
timeout /t 2 /nobreak >nul
echo.
echo Opening SuperAdmin Panel...
start "" "%~dp0index.html"
echo.
echo ==========================================
echo   SuperAdmin is running!
echo   Backend: http://localhost:4002
echo   Panel:   superadmin/index.html
echo ==========================================
echo.
pause

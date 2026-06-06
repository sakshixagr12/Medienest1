@echo off
echo =======================================================
echo          Starting Jirova Care Development Servers
echo =======================================================

echo Installing missing dependencies if any...
call npm install

echo.
echo Launching Dashboard (Frontend + Backend) and Admin (Frontend + Backend) concurrently...
echo You can stop all servers by pressing Ctrl+C in this window.
echo.

npm run dev

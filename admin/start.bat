@echo off
echo ===================================================
echo   MedieNest SuperAdmin Standalone Launcher
echo ===================================================
cd /d "%~dp0"

echo ⏳ Checking and installing backend dependencies...
cmd /c "cd backend && npm install"

echo ⏳ Checking and installing frontend dependencies...
cmd /c "cd frontend && npm install"

echo Starting SuperAdmin Backend (Port 4002) and Frontend (Port 3001)...
npx concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"

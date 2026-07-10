@echo off
REM Smart Waste Management - Development Startup Script (Batch)
REM This script starts both Backend and Frontend in parallel

echo.
echo 🚀 Starting Smart Waste Management Development Environment...
echo.

REM Create logs directory
if not exist "logs" mkdir logs

REM Check if ports are available using netstat
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000"') do (
    echo ⚠️  Port 8000 already in use. Please stop existing process.
    set PORT_IN_USE=1
)

if not defined PORT_IN_USE (
    echo 📡 Starting Backend on Port 8000...
    start "Backend" cmd /k "cd web\Backend && python -m uvicorn app.main:app --reload --port 8000"
    echo ✓ Backend started in new window
    timeout /t 2 /nobreak > nul
)

echo 🎨 Starting Frontend on Port 3000...
start "Frontend" cmd /k "cd web && npm install && npm run dev"
echo ✓ Frontend started in new window

echo.
echo ✅ Development environment started!
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
echo ℹ️  Close the windows to stop the services
echo.
pause

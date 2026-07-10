# Smart Waste Management - Development Startup Script (PowerShell)
# This script starts both Backend and Frontend in parallel

Write-Host "🚀 Starting Smart Waste Management Development Environment..." -ForegroundColor Cyan

# Create logs directory
if (!(Test-Path -Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
}

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -ErrorAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Check if Backend port 8000 is in use
if (Test-Port 8000) {
    Write-Host "⚠️  Port 8000 already in use. Please stop existing process or use different port." -ForegroundColor Yellow
} else {
    Write-Host "📡 Starting Backend (Port 8000)..." -ForegroundColor Green
    $backendJob = Start-Job -ScriptBlock {
        Set-Location "web/Backend"
        python -m uvicorn app.main:app --reload --port 8000
    }
    Write-Host "✓ Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
}

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Check if Frontend port 3000 is in use
if (Test-Port 3000) {
    Write-Host "⚠️  Port 3000 already in use. Please stop existing process or use different port." -ForegroundColor Yellow
} else {
    Write-Host "🎨 Starting Frontend (Port 3000)..." -ForegroundColor Green
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "web"
        npm install
        npm run dev
    }
    Write-Host "✓ Frontend started (Job ID: $($frontendJob.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Development environment started!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏹️  To stop all jobs:" -ForegroundColor Yellow
Write-Host "   Get-Job | Stop-Job" -ForegroundColor Gray
Write-Host ""

# Keep script running
Get-Job | Wait-Job

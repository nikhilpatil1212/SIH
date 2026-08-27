Write-Host "Starting Dhruv Sarthi Antarctic AI Nav Engine Backend on port 8000..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

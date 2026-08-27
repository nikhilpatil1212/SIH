@echo off
echo Starting Dhruv Sarthi Antarctic AI Nav Engine Backend...
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

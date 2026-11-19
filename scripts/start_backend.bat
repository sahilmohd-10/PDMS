@echo off
echo Starting HIRS FastAPI Backend Server on port 8000...
cd /d "%~dp0\.."
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
pause

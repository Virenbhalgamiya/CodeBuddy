@echo off
echo Starting Virtual Teaching Assistant...
echo.

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
)

echo.
echo Starting backend server...
cd ../backend
start "Backend Server" cmd /k "npm run dev"

echo.
echo Starting frontend server...
cd ../frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo Virtual Teaching Assistant is starting...
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 
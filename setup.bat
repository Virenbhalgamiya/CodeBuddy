@echo off
echo Setting up Virtual Teaching Assistant...
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
echo Creating environment file...
cd ../backend
if not exist .env (
    copy env.example .env
    echo Created .env file. Please edit it and add your Groq API key.
    echo Get your API key from: https://console.groq.com/keys
) else (
    echo .env file already exists.
)

echo.
echo Starting servers...
cd ../backend
start "Backend Server" cmd /k "npm run dev"

cd ../frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo Virtual Teaching Assistant is starting...
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo.
echo Don't forget to:
echo 1. Get your Groq API key from https://console.groq.com/keys
echo 2. Add the API key to backend/.env file
echo 3. Restart the backend server after adding the API key
echo.
echo Press any key to close this window...
pause > nul 
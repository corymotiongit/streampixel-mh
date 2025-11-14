@echo off
REM Start script for StreamPixel-MH server (Windows)

echo Starting StreamPixel-MH Cirrus Signaling Server...
echo ==========================================

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js 14.0.0 or higher
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Default port
set HTTP_PORT=%1
if "%HTTP_PORT%"=="" set HTTP_PORT=8080

echo Starting server on port %HTTP_PORT%...
echo Press Ctrl+C to stop
echo.

REM Start the server
node cirrus.js --HttpPort %HTTP_PORT%

echo.
echo Server stopped
pause

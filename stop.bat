@echo off
REM Stop script for StreamPixel-MH server (Windows)

echo Stopping StreamPixel-MH Cirrus Signaling Server...

REM Kill Node.js processes running cirrus.js
taskkill /F /FI "WINDOWTITLE eq cirrus.js*" >nul 2>&1
taskkill /F /FI "IMAGENAME eq node.exe" /FI "MEMUSAGE gt 10000" >nul 2>&1

echo Server stopped successfully
pause

@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or later is required. Install from https://nodejs.org/
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo Git for Windows is required. Install from https://git-scm.com/
  pause
  exit /b 1
)
echo.
echo Installing desktop dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo.
echo Setting up official ChatGPT integration...
call npm run setup:chatgpt
if errorlevel 1 goto failed
echo.
echo Running tests...
call npm test
if errorlevel 1 goto failed
echo.
echo Building Windows installer...
call npm run build:win
if errorlevel 1 goto failed
echo.
echo Finished. Your installer is in the release folder.
pause
exit /b 0
:failed
echo.
echo Build failed. See the error messages above.
pause
exit /b 1

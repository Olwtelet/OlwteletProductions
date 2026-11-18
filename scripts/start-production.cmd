@echo off
rem Starts the production server of the Olwtelet Productions site on http://localhost:3000 in its own console window.
rem Double-click this file (or run it from any terminal). The server runs until this window is closed or Ctrl+C is pressed.
rem It does not depend on any Claude Code session: background tasks started by an assistant session end with that
rem session (observed on 2026-11-07/08: "exit code 4" with a clean server log), a server started here does not.
cd /d "%~dp0.."
title Olwtelet Productions - production server (http://localhost:3000)
if not exist ".next\BUILD_ID" (
  echo No production build found in .next - running "npm run build" first...
  call npm run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)
echo Starting the production server on http://localhost:3000 (close this window to stop it)...
call npm start
echo.
echo The server stopped (exit code %errorlevel%). If the port was busy, close the other server or run: npx next start -p 3001
pause

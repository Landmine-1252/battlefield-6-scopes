@echo off
setlocal

cd /d "%~dp0"
set "BF6_PORT=8000"
set "BF6_PYTHON="

py -3 --version >nul 2>nul
if not errorlevel 1 set "BF6_PYTHON=py -3"

if not defined BF6_PYTHON (
    python --version >nul 2>nul
    if not errorlevel 1 set "BF6_PYTHON=python"
)

if not defined BF6_PYTHON goto :python_missing

where node >nul 2>nul
if not errorlevel 1 (
    echo Updating the scope list from image filenames...
    node scripts\generate-manifest.mjs
    if errorlevel 1 goto :manifest_error
)

echo.
echo Battlefield 6 Scopes
echo Open http://localhost:%BF6_PORT% in your browser.
echo Press Ctrl+C to stop the server.
echo.
%BF6_PYTHON% -m http.server %BF6_PORT%
goto :end

:python_missing
echo Python 3 was not found. Install Python and make sure it is available on PATH.
pause
goto :end

:manifest_error
echo.
echo The image manifest could not be updated.
pause

:end
endlocal

@echo off
chcp 65001 >nul
cd /d "%~dp0.."
call venv\Scripts\activate
if "%~1"=="" (python pipeline.py --site) else (python pipeline.py %*)
echo.
echo Results are in the "output" folder.
pause

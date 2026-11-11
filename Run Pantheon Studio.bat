@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "APP=%~dp0apps\desktop\src-tauri\target\release\pantheon-studio.exe"
if exist "%APP%" (
  start "Pantheon Studio" "%APP%"
  exit /b 0
)
echo Chua co file mo app tai:
echo %APP%
echo.
echo Hay mo "Build Pantheon Studio.bat" de tao app va tu dong khoi dong.
echo Sau do, ban co the mo file nay de chay app truc tiep.
echo.
pause
exit /b 1

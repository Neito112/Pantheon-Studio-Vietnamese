@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Pantheon Studio - Build app

echo ============================================================
echo   DANG BUILD APP PANTHEON STUDIO
echo ============================================================
echo.

where python >nul 2>&1
if errorlevel 1 goto missing_python
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
where cargo >nul 2>&1
if errorlevel 1 goto missing_rust
where uv >nul 2>&1
if errorlevel 1 goto missing_uv

echo Yeu cau: Python 3.12, Node 22, Rust/Cargo, Visual Studio C++ Build Tools va uv.
echo Build lan dau co the mat vai phut va can Internet de tai dependency.
echo.
python scripts\build.py
set "BUILD_EXIT=%ERRORLEVEL%"
echo.
if not "%BUILD_EXIT%"=="0" goto build_failed
set "APP=%~dp0apps\desktop\src-tauri\target\release\pantheon-studio.exe"
if not exist "%APP%" goto missing_app
echo Build app thanh cong: "%APP%"
echo Dang mo Pantheon Studio...
start "Pantheon Studio" "%APP%"
if exist "dist\2.0.2\artifacts\windows-x86_64" start "" explorer "%~dp0dist\2.0.2\artifacts\windows-x86_64"
echo App da khoi dong. File installer .exe (neu can) nam rieng trong dist\2.0.2\artifacts\windows-x86_64.
echo.
pause
exit /b 0

:missing_python
echo Thieu Python 3.12. Hay cai tai https://www.python.org/downloads/
goto failed_pause
:missing_node
echo Thieu Node.js 22/npm. Hay cai tai https://nodejs.org/
goto failed_pause
:missing_rust
echo Thieu Rust/Cargo. Cai Rust tai https://rustup.rs/ va Visual Studio C++ Build Tools.
goto failed_pause
:missing_uv
echo Thieu uv. Huong dan: https://docs.astral.sh/uv/getting-started/installation/
goto failed_pause
:missing_app
echo Build tra ve thanh cong nhung khong tim thay app exe o:
echo %APP%
echo Hay kiem tra log build va cau hinh target.
goto failed_pause
:build_failed
echo Build that bai, ma loi %BUILD_EXIT%. Cuon len xem loi chi tiet.
goto failed_pause
:failed_pause
echo.
pause
exit /b 1

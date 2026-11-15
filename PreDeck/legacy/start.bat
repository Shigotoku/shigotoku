@echo off
chcp 65001 > nul
title PreDeck - プレゼン練習アプリ

echo.
echo  ================================================
echo    PreDeck  起動中...
echo  ================================================
echo.

cd /d "%~dp0"

set PYTHON_DIR=%~dp0python
set PYTHON_EXE=%PYTHON_DIR%\python.exe

:: インストール済みか確認
if not exist "%PYTHON_EXE%" (
  echo [エラー] インストールが完了していません。
  echo  先に install.bat を実行してください。
  echo.
  pause
  exit /b 1
)

if not exist "%PYTHON_DIR%\.libs_installed" (
  echo [エラー] インストールが完了していません。
  echo  先に install.bat を実行してください。
  echo.
  pause
  exit /b 1
)

echo  ブラウザで http://localhost:8000 を開きます...
echo  終了するには Ctrl+C を押してください
echo.

:: ブラウザを少し待ってから開く
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:8000"

:: サーバー起動
"%PYTHON_EXE%" main.py

pause

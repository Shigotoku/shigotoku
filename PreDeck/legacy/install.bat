@echo off
chcp 65001 > nul
title PreDeck - インストール

echo.
echo  ================================================
echo    PreDeck  初回インストール
echo  ================================================
echo.
echo  このスクリプトは初回のみ実行してください。
echo  完了後は start.bat でアプリを起動できます。
echo.

cd /d "%~dp0"

set PYTHON_DIR=%~dp0python
set PYTHON_EXE=%PYTHON_DIR%\python.exe
set PYTHON_VERSION=3.11.9
set PYTHON_ZIP=%~dp0python-embed.zip

:: =============================================
:: 既にインストール済みの確認
:: =============================================
:: 両方のWhisperエンジンが揃っていれば早期終了。
:: 片方だけしか入っていない場合は不足分の Step を実行する。
if exist "%PYTHON_DIR%\.whisper_installed" if exist "%PYTHON_DIR%\.faster_whisper_installed" (
  echo [確認] すでにインストール済みです。
  echo  start.bat でアプリを起動してください。
  echo.
  pause
  exit /b 0
)

:: =============================================
:: Step 1: Python 同梱版のダウンロード
:: =============================================
if not exist "%PYTHON_EXE%" (
  echo [Step 1/4] Python %PYTHON_VERSION% をダウンロードしています...
  echo  (Windows 64bit 埋め込み版)
  echo.
  powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip' -OutFile '%PYTHON_ZIP%'"
  if errorlevel 1 (
    echo [エラー] ダウンロードに失敗しました。インターネット接続を確認してください。
    pause
    exit /b 1
  )

  echo [Step 1/4] 解凍中...
  powershell -Command "Expand-Archive -Path '%PYTHON_ZIP%' -DestinationPath '%PYTHON_DIR%' -Force"
  if errorlevel 1 (
    echo [エラー] 解凍に失敗しました。
    pause
    exit /b 1
  )
  del "%PYTHON_ZIP%"

  :: site-packages を有効化
  powershell -Command "(Get-Content '%PYTHON_DIR%\python311._pth') -replace '#import site', 'import site' | Set-Content '%PYTHON_DIR%\python311._pth'"

  echo [Step 1/4] 完了。
  echo.
) else (
  echo [Step 1/4] Python はインストール済みです。スキップ。
  echo.
)

:: =============================================
:: Step 2: pip のインストール
:: =============================================
if not exist "%PYTHON_DIR%\Scripts\pip.exe" (
  echo [Step 2/4] pip をインストール中...
  powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%PYTHON_DIR%\get-pip.py'"
  "%PYTHON_EXE%" "%PYTHON_DIR%\get-pip.py" --no-warn-script-location
  if errorlevel 1 (
    echo [エラー] pip のインストールに失敗しました。
    pause
    exit /b 1
  )
  del "%PYTHON_DIR%\get-pip.py"
  echo [Step 2/4] 完了。
  echo.
) else (
  echo [Step 2/4] pip はインストール済みです。スキップ。
  echo.
)

:: =============================================
:: Step 3: 基本ライブラリのインストール
:: =============================================
if not exist "%PYTHON_DIR%\.libs_installed" (
  echo [Step 3/4] 基本ライブラリをインストールしています...
  echo  (fastapi, uvicorn, httpx, PyMuPDF, comtypes など)
  echo.
  "%PYTHON_EXE%" -m pip install fastapi "uvicorn[standard]" python-multipart httpx PyMuPDF python-dotenv comtypes
  if errorlevel 1 (
    echo [エラー] 基本ライブラリのインストールに失敗しました。
    echo インターネット接続を確認してください。
    pause
    exit /b 1
  )
  echo. > "%PYTHON_DIR%\.libs_installed"
  echo [Step 3/4] 完了。
  echo.
) else (
  echo [Step 3/4] 基本ライブラリはインストール済みです。スキップ。
  echo.
)

:: =============================================
:: Step 4: openai-whisper のインストール
:: =============================================
if not exist "%PYTHON_DIR%\.whisper_installed" (
  echo [Step 4/5] openai-whisper をインストールしています...
  echo  ※ PyTorch を含むため時間がかかります（5〜20分程度）
  echo  ※ このウィンドウを閉じないでください
  echo.
  "%PYTHON_EXE%" -m pip install openai-whisper
  if errorlevel 1 (
    echo.
    echo [警告] openai-whisper のインストールに失敗しました。
    echo  faster-whisper が入っていればそちらで動作します。
    echo.
  ) else (
    echo. > "%PYTHON_DIR%\.whisper_installed"
    echo [Step 4/5] 完了。
    echo.
  )
) else (
  echo [Step 4/5] openai-whisper はインストール済みです。スキップ。
  echo.
)

:: =============================================
:: Step 5: faster-whisper のインストール（推奨・約4倍速）
:: =============================================
if not exist "%PYTHON_DIR%\.faster_whisper_installed" (
  echo [Step 5/5] faster-whisper をインストールしています...
  echo  ※ CTranslate2 ベースの高速実装（推奨）
  echo  ※ openai-whisper と並んで使用可能、設定で切り替えできます
  echo.
  "%PYTHON_EXE%" -m pip install faster-whisper
  if errorlevel 1 (
    echo.
    echo [警告] faster-whisper のインストールに失敗しました。
    echo  openai-whisper が入っていればそちらで動作します。
    echo.
  ) else (
    echo. > "%PYTHON_DIR%\.faster_whisper_installed"
    echo [Step 5/5] 完了。
    echo.
  )
) else (
  echo [Step 5/5] faster-whisper はインストール済みです。スキップ。
  echo.
)

:: =============================================
:: 完了
:: =============================================
echo.
echo  ================================================
echo    インストール完了！
echo    start.bat をダブルクリックしてアプリを起動してください。
echo  ================================================
echo.
pause

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$PYTHON_DIR = Join-Path $Root 'python'
$PYTHON_EXE = Join-Path $PYTHON_DIR 'python.exe'
$PYTHON_VERSION = '3.11.9'
$PYTHON_ZIP = Join-Path $Root 'python-embed.zip'

Write-Host "Downloading Python $PYTHON_VERSION..."
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip" -OutFile $PYTHON_ZIP

Write-Host "Extracting Python..."
Expand-Archive -Path $PYTHON_ZIP -DestinationPath $PYTHON_DIR -Force
Remove-Item $PYTHON_ZIP

Write-Host "Enabling site-packages..."
(Get-Content "$PYTHON_DIR\python311._pth") -replace '#import site', 'import site' | Set-Content "$PYTHON_DIR\python311._pth"

Write-Host "Installing pip..."
Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile "$PYTHON_DIR\get-pip.py"
& $PYTHON_EXE "$PYTHON_DIR\get-pip.py" --no-warn-script-location
Remove-Item "$PYTHON_DIR\get-pip.py"

Write-Host "Installing base libraries..."
& $PYTHON_EXE -m pip install fastapi "uvicorn[standard]" python-multipart httpx PyMuPDF python-dotenv comtypes
New-Item -Path "$PYTHON_DIR\.libs_installed" -ItemType File -Force

Write-Host "Installing openai-whisper..."
& $PYTHON_EXE -m pip install openai-whisper
New-Item -Path "$PYTHON_DIR\.whisper_installed" -ItemType File -Force

Write-Host "Installing faster-whisper..."
& $PYTHON_EXE -m pip install faster-whisper
New-Item -Path "$PYTHON_DIR\.faster_whisper_installed" -ItemType File -Force

Write-Host "Setup complete!"

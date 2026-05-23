# GitHub Actions 自動デプロイの初回セットアップ
# このスクリプトは対話式です。PowerShell ウィンドウで実行してください。

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DeployDir = Join-Path $RepoRoot "deploy"
$GhExe = "C:\Users\tokun\AppData\Local\Temp\gh-cli\bin\gh.exe"

if (-not (Test-Path $GhExe)) {
    $GhExe = "gh"
}

Write-Host ""
Write-Host "=== Shigotoku GitHub Actions セットアップ ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Firebase CI トークンを取得します..." -ForegroundColor Yellow
Write-Host "      ブラウザが開いたら meditoku.jp@gmail.com でログインしてください。"
Write-Host ""

Push-Location $DeployDir
$loginOutput = firebase login:ci 2>&1 | Out-String
Pop-Location

$firebaseToken = ($loginOutput -split "`n" | Where-Object { $_ -match "^1//" } | Select-Object -Last 1).Trim()
if (-not $firebaseToken) {
    Write-Host "Firebase トークンの取得に失敗しました。" -ForegroundColor Red
    Write-Host $loginOutput
    Read-Host "Enter で終了"
    exit 1
}

Write-Host "Firebase トークンを取得しました。" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] GitHub Secret (FIREBASE_TOKEN) を登録します..." -ForegroundColor Yellow
Write-Host "      Shigotoku アカウントの GitHub 認証が必要です。"
Write-Host ""

$credInput = @"
protocol=https
host=github.com
username=Shigotoku
path=Shigotoku/shigotoku

"@

$cred = $credInput | git -C $RepoRoot credential fill
$ghToken = ($cred | Select-String '^password=').Line.Substring(9)
$env:GH_TOKEN = $ghToken

& $GhExe secret set FIREBASE_TOKEN --repo Shigotoku/shigotoku --body $firebaseToken
& $GhExe secret list --repo Shigotoku/shigotoku

Write-Host ""
Write-Host "[3/3] デプロイワークフローを再実行します..." -ForegroundColor Yellow
& $GhExe workflow run "Deploy to Firebase" --repo Shigotoku/shigotoku --ref main

Write-Host ""
Write-Host "完了しました。" -ForegroundColor Green
Write-Host "Actions: https://github.com/Shigotoku/shigotoku/actions"
Write-Host ""
Read-Host "Enter で終了"

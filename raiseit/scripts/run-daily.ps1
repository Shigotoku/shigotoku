# 毎朝の自動実行: 全サイトについて 取得 → SNS取込 → レポート生成。ログは logs/ に保存。
# 登録: scripts\register-task.ps1   /  対象サイトは config\sites.json
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force logs | Out-Null
$log = "logs\daily-$(Get-Date -Format yyyy-MM-dd).log"
function Run($cmd) { "[$(Get-Date -Format HH:mm:ss)] $cmd" | Add-Content $log; cmd /c "$cmd >> $log 2>&1" }
$sites = node scripts\list-sites.mjs
foreach ($site in $sites) {
  $site = $site.Trim(); if (-not $site) { continue }
  "=== site: $site ===" | Add-Content $log
  Run "npm run fetch:gsc -- --site $site --days 7"
  Run "npm run fetch:ga4 -- --site $site --days 7"
  Run "npm run fetch:src -- --site $site --days 7"
  Run "npm run fetch:events -- --site $site --days 7"
  if ((Get-Date).DayOfWeek -eq 'Monday') { Run "npm run fetch:psi -- --site $site" }
  Run "npm run import:social -- --site $site"
  Run "npm run report -- --site $site"
}
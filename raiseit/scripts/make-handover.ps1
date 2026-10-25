# 引き渡し用zipを作る(秘密情報・取得済みデータ・node_modules を除外)
# 実行: powershell -File scripts\make-handover.ps1
$root = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path $env:TEMP 'raiseit-handover'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory $tmp | Out-Null
robocopy $root $tmp /E /XD node_modules data reports logs credentials .git /XF .env *.key service-account*.json config\sites.json /NFL /NDL /NJH /NJS | Out-Null
Remove-Item (Join-Path $tmp 'config\sites.json') -Force -ErrorAction SilentlyContinue
$zip = Join-Path (Split-Path -Parent $root) 'raiseit-handover.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $zip
# 念のため秘密情報の混入チェック
$hit = Get-ChildItem $tmp -Recurse -File | Where-Object { $_.Name -ne 'make-handover.ps1' } | Select-String -Pattern 'AIza[0-9A-Za-z_-]{30,}|PSI_API_KEY=\S+|BEGIN PRIVATE KEY' -List
if ($hit) { Write-Host '警告: 秘密情報らしき文字列があります:' ($hit.Path -join ', ') -ForegroundColor Red; Remove-Item $zip -Force; exit 1 }
Write-Host "作成しました: $zip"

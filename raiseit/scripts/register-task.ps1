# Windows タスクスケジューラに毎朝7:30の実行を登録(PCが起動していない場合は起動後に実行)。
$script = Join-Path $PSScriptRoot 'run-daily.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 7:30am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'RaiseIt-Daily' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host '登録しました: RaiseIt-Daily (毎朝 7:30)'

[CmdletBinding()]
param(
    [switch]$IgnoreSchedule,
    [switch]$ApplyTaskSuggestions,
    [int]$DependencyInstallTimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskPath = Join-Path $repoRoot "TASKS.md"
$inspectScriptPath = Join-Path $PSScriptRoot "inspect-repo.ps1"
$ensureDependenciesScriptPath = Join-Path $PSScriptRoot "ensure-project-dependencies.ps1"
$environmentValidationScriptPath = Join-Path $PSScriptRoot "environment-validation.ps1"
. $environmentValidationScriptPath

$kstZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Korea Standard Time")
$kstNow = [System.TimeZoneInfo]::ConvertTime([System.DateTimeOffset]::UtcNow, $kstZone)
$weekdayList = @(
    [System.DayOfWeek]::Monday,
    [System.DayOfWeek]::Tuesday,
    [System.DayOfWeek]::Wednesday,
    [System.DayOfWeek]::Thursday,
    [System.DayOfWeek]::Friday
)
$isWeekday = $weekdayList -contains $kstNow.DayOfWeek
$totalMinutes = ($kstNow.Hour * 60) + $kstNow.Minute
$startMinutes = (8 * 60) + 10
$stopMinutes = 17 * 60

if (-not $IgnoreSchedule) {
    if (-not $isWeekday) {
        throw "Outside configured working days"
    }
    if ($totalMinutes -lt $startMinutes -or $totalMinutes -gt $stopMinutes) {
        throw "Outside configured working hours"
    }
}

& $ensureDependenciesScriptPath -InstallTimeoutSeconds $DependencyInstallTimeoutSeconds

if (Test-ShouldRunEnvValidation -RepoRoot $repoRoot) {
    $envValidationCommand = Get-EnvironmentValidationCommand
    cmd.exe /d /c $envValidationCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Environment validation failed"
    }
}

if ($ApplyTaskSuggestions) {
    & $inspectScriptPath -ApplyTaskSuggestions
}
else {
    & $inspectScriptPath
}

$taskLines = Get-Content -Path $taskPath
$firstOpenTaskLine = $taskLines | Where-Object { $_ -match '^\[ \]\s.+' } | Select-Object -First 1
$firstOpenTask = if ($firstOpenTaskLine) { $firstOpenTaskLine.Trim() } else { "[ ] none" }

Write-Output "Workday loop can start now"
Write-Output "Current KST time: $($kstNow.ToString("yyyy-MM-dd HH:mm:ss"))"
Write-Output "First open task: $firstOpenTask"

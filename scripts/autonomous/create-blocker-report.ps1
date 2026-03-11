[CmdletBinding()]
param(
    [string]$TaskTitle = "",
    [string]$Reason = "Stalled progress",
    [int]$StalledMinutes = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskPath = Join-Path $repoRoot "TASKS.md"
$reportDir = Join-Path $repoRoot "docs\reports"

if (-not (Test-Path $taskPath)) {
    throw "TASKS.md is missing"
}
if (-not (Test-Path $reportDir)) {
    New-Item -Path $reportDir -ItemType Directory | Out-Null
}

$cleanTaskTitle = $TaskTitle.Trim()
$cleanReason = $Reason.Trim()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportName = "blocker-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md"
$reportPath = Join-Path $reportDir $reportName

$reportLines = @(
    "# Blocker Report",
    "",
    "- Timestamp: $timestamp",
    "- Task: " + ($(if ([string]::IsNullOrWhiteSpace($cleanTaskTitle)) { "unknown" } else { $cleanTaskTitle })),
    "- Stalled minutes: $StalledMinutes",
    "- Reason: $cleanReason",
    "- Action: stop current task and switch to next task",
    ""
)

Set-Content -Path $reportPath -Value ($reportLines -join "`r`n")

$taskLines = @(Get-Content -Path $taskPath)
if (-not [string]::IsNullOrWhiteSpace($cleanTaskTitle)) {
    $updated = $false
    for ($i = 0; $i -lt $taskLines.Count; $i++) {
        if (-not $updated -and $taskLines[$i] -match '^\[ \]\s+' + [regex]::Escape($cleanTaskTitle) + '$') {
            $taskLines[$i] = "[x] $cleanTaskTitle (stopped after ${StalledMinutes}m: $cleanReason)"
            $updated = $true
        }
    }
    Set-Content -Path $taskPath -Value $taskLines

    $followUpTasks = @(
        "[ ] blocker follow-up: analyze root cause for $cleanTaskTitle",
        "[ ] blocker follow-up: implement alternate path for $cleanTaskTitle"
    )

    $taskRaw = Get-Content -Path $taskPath -Raw
    $newFollowUps = @()
    foreach ($item in $followUpTasks) {
        if ($taskRaw -notmatch [regex]::Escape($item)) {
            $newFollowUps += $item
        }
    }
    if ($newFollowUps.Count -gt 0) {
        Add-Content -Path $taskPath -Value ("`r`n" + ($newFollowUps -join "`r`n"))
    }
}

Write-Output "Blocker report saved: $reportPath"

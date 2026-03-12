[CmdletBinding()]
param(
    [int]$MaxNewTasks = 5,
    [switch]$Force,
    [string]$RepoRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = if ($RepoRoot) {
    (Resolve-Path $RepoRoot).Path
}
else {
    (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$planPath = Join-Path $repoRoot "PLAN.md"
$taskPath = Join-Path $repoRoot "TASKS.md"

if (-not (Test-Path $planPath)) {
    throw "PLAN.md is missing"
}
if (-not (Test-Path $taskPath)) {
    throw "TASKS.md is missing"
}

$taskLines = Get-Content -Path $taskPath
$hasOpenTask = @($taskLines | Where-Object { $_ -match '^\[ \]\s.+' }).Count -gt 0
if ($hasOpenTask -and -not $Force) {
    Write-Output "Open tasks already exist. Plan seeding skipped"
    exit 0
}

$planLines = Get-Content -Path $planPath
$milestones = @()
$insideStage = $false

foreach ($line in $planLines) {
    if ($line -match '^##\s+\d+단계\s*$') {
        $insideStage = $true
        continue
    }

    if ($line -match '^##\s+') {
        $insideStage = $false
        continue
    }

    if ($insideStage -and $line -match '^\s*-\s+목표:\s+(.+?)\s*$') {
        $milestones += $Matches[1].Trim()
        $insideStage = $false
    }
}

if ($milestones.Count -eq 0) {
    Write-Output "No plan milestones found. Plan seeding skipped"
    exit 0
}

$newTasks = @()
foreach ($milestone in $milestones) {
    $escapedMilestone = [regex]::Escape($milestone)
    $sliceMatches = @(
        $taskLines |
            ForEach-Object {
                if ($_ -match "^\[[ x]\]\s+plan-driven task: $escapedMilestone \[slice (\d+)\]$") {
                    [int]$Matches[1]
                }
            } |
            Where-Object { $_ -is [int] }
    )

    $baseWithoutSliceExists = @($taskLines | Where-Object { $_ -match "^\[[ x]\]\s+plan-driven task: $escapedMilestone$" }).Count -gt 0
    $maxSlice = if ($sliceMatches.Count -gt 0) { ($sliceMatches | Measure-Object -Maximum).Maximum } elseif ($baseWithoutSliceExists) { 1 } else { 0 }
    $nextSlice = $maxSlice + 1

    $candidate = "[ ] plan-driven task: $milestone [slice $nextSlice]"
    if ($taskLines -notcontains $candidate) {
        $newTasks += $candidate
    }
    if ($newTasks.Count -ge $MaxNewTasks) {
        break
    }
}

if ($newTasks.Count -eq 0) {
    Write-Output "No new plan-driven tasks to add"
    exit 0
}

Add-Content -Path $taskPath -Value ("`r`n" + ($newTasks -join "`r`n"))
Write-Output "Plan-driven tasks added: $($newTasks.Count)"

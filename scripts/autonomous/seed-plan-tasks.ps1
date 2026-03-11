[CmdletBinding()]
param(
    [int]$MaxNewTasks = 5,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
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
$milestones = @(
    $planLines |
        Where-Object { $_ -match '^\s*-\s.+' } |
        ForEach-Object { $_.Trim() -replace '^\-\s+', '' }
)

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

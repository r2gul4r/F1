[CmdletBinding()]
param(
    [ValidateSet("feat", "fix", "refactor", "docs")]
    [string]$CommitType = "docs",
    [switch]$SkipPush,
    [switch]$Shutdown
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$changelogPath = Join-Path $repoRoot "CHANGELOG.md"
$securityScriptPath = Join-Path $PSScriptRoot "security-check.ps1"

function Invoke-GitChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

if (-not (Test-Path $changelogPath)) {
    throw "CHANGELOG.md is missing"
}

Set-Location $repoRoot

$kstZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Korea Standard Time")
$kstNow = [System.TimeZoneInfo]::ConvertTime([System.DateTimeOffset]::UtcNow, $kstZone)
$today = $kstNow.ToString("yyyy-MM-dd")
$timestamp = $kstNow.ToString("yyyy-MM-dd HH:mm:ss")
$dayHeader = "## $today"
$summaryLine = "- ${CommitType}: end-of-day summary at $timestamp"

$changelogRaw = Get-Content -Path $changelogPath -Raw
if ($changelogRaw -notmatch [regex]::Escape($dayHeader)) {
    Add-Content -Path $changelogPath -Value ("`r`n$dayHeader`r`n$summaryLine")
}
else {
    Add-Content -Path $changelogPath -Value $summaryLine
}

Invoke-GitChecked -Arguments @("add", "-A") -FailureMessage "git add failed"
$stagedFiles = @(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0) {
    throw "git diff --cached failed"
}
$hasChanges = -not [string]::IsNullOrWhiteSpace(($stagedFiles -join ""))

if (-not $hasChanges) {
    Write-Output "No changes to commit"
    if ($Shutdown) {
        Stop-Computer -Force
    }
    exit 0
}

$commitMessage = "${CommitType}: end-of-day sync $today"
& $securityScriptPath -StagedOnly
Invoke-GitChecked -Arguments @("commit", "-m", $commitMessage) -FailureMessage "git commit failed"

if (-not $SkipPush) {
    Invoke-GitChecked -Arguments @("push") -FailureMessage "git push failed"
}

if ($Shutdown) {
    Stop-Computer -Force
}

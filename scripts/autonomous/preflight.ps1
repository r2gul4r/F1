[CmdletBinding()]
param(
    [int]$DependencyInstallTimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ensureDependenciesScriptPath = Join-Path $PSScriptRoot "ensure-project-dependencies.ps1"
$environmentValidationScriptPath = Join-Path $PSScriptRoot "environment-validation.ps1"
. $environmentValidationScriptPath

& $ensureDependenciesScriptPath -InstallTimeoutSeconds $DependencyInstallTimeoutSeconds

Set-Location $repoRoot
$preflightCommand = Get-PreflightValidationCommand -RepoRoot $repoRoot
cmd.exe /d /c $preflightCommand

if ($LASTEXITCODE -ne 0) {
    $failureMessage = Get-EnvironmentValidationFailureMessage -RepoRoot $repoRoot -BaseMessage "Preflight validation failed"
    throw $failureMessage
}

Write-Output "Autonomous preflight passed"

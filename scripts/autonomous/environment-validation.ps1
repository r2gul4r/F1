[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-ShouldRunEnvValidation {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    return Test-Path (Join-Path $RepoRoot ".env")
}

function Get-EnvironmentValidationCommand {
    return "pnpm validate:env"
}

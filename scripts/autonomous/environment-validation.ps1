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

function Get-LocalEnvBootstrapCommand {
    return "pnpm env:bootstrap:local"
}

function Test-ShouldSuggestLocalEnvBootstrap {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $envPath = Join-Path $RepoRoot ".env"
    if (-not (Test-Path $envPath)) {
        return $false
    }

    $requiredKeys = @("INTERNAL_API_TOKEN", "OAUTH_PROXY_TOKEN", "WATCH_TOKEN_SECRET")
    $placeholderSet = @(
        "replace-this-token",
        "replace-with-strong-internal-token-32chars",
        "replace-with-strong-oauth-proxy-token-32chars",
        "replace-with-strong-watch-token-secret-32chars",
        "change-me",
        "your-token-here",
        "token"
    )

    $valueMap = @{}
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            return
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -le 0) {
            return
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()
        $valueMap[$key] = $value
    }

    foreach ($key in $requiredKeys) {
        if (-not $valueMap.ContainsKey($key)) {
            return $true
        }

        $normalized = $valueMap[$key].Trim().Trim("'`"").ToLowerInvariant()
        if ($normalized.Length -eq 0 -or ($placeholderSet -contains $normalized)) {
            return $true
        }
    }

    return $false
}

function Get-EnvironmentValidationFailureMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$BaseMessage
    )

    if (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $RepoRoot) {
        return "$BaseMessage. Try: $(Get-LocalEnvBootstrapCommand)"
    }

    return $BaseMessage
}

function Get-PreflightValidationCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    if (Test-ShouldRunEnvValidation -RepoRoot $RepoRoot) {
        return "pnpm validate:preflight"
    }

    return "pnpm validate:structure"
}

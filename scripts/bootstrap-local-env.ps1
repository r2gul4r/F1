[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:SecretPlaceholders = @{
    INTERNAL_API_TOKEN = @(
        "replace-this-token",
        "replace-with-strong-internal-token-32chars",
        "change-me",
        "your-token-here",
        "token"
    )
    OAUTH_PROXY_TOKEN = @(
        "replace-this-token",
        "replace-with-strong-oauth-proxy-token-32chars",
        "change-me",
        "your-token-here",
        "token"
    )
    WATCH_TOKEN_SECRET = @(
        "replace-this-token",
        "replace-with-strong-watch-token-secret-32chars",
        "change-me",
        "your-token-here",
        "token"
    )
}

function New-StrongToken {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Test-IsPlaceholderSecret {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [string]$Value
    )

    if (-not $Value) {
        return $true
    }

    $normalized = $Value.Trim().Trim("'`"").ToLowerInvariant()
    if ($normalized.Length -eq 0) {
        return $true
    }

    $placeholders = $script:SecretPlaceholders[$Key]
    if ($null -eq $placeholders) {
        return $false
    }

    return $placeholders -contains $normalized
}

function Invoke-LocalEnvBootstrap {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [switch]$Quiet
    )

    $examplePath = Join-Path $RepoRoot ".env.example"
    $envPath = Join-Path $RepoRoot ".env"

    if (-not (Test-Path $examplePath)) {
        throw ".env.example is missing"
    }

    $created = $false
    if (-not (Test-Path $envPath)) {
        Copy-Item -Path $examplePath -Destination $envPath
        $created = $true
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    Get-Content $envPath | ForEach-Object {
        $lines.Add($_)
    }

    $updatedKeySet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $seenKeySet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)

    for ($index = 0; $index -lt $lines.Count; $index += 1) {
        $line = $lines[$index]
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -le 0) {
            continue
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        if (-not $script:SecretPlaceholders.ContainsKey($key)) {
            continue
        }

        $null = $seenKeySet.Add($key)
        $value = $line.Substring($separatorIndex + 1).Trim()
        if (Test-IsPlaceholderSecret -Key $key -Value $value) {
            $lines[$index] = "$key=$(New-StrongToken)"
            $null = $updatedKeySet.Add($key)
        }
    }

    foreach ($key in $script:SecretPlaceholders.Keys) {
        if ($seenKeySet.Contains($key)) {
            continue
        }

        $lines.Add("$key=$(New-StrongToken)")
        $null = $updatedKeySet.Add($key)
    }

    Set-Content -Path $envPath -Value $lines

    $updatedKeys = @($updatedKeySet | Sort-Object)
    $result = [pscustomobject]@{
        EnvPath = $envPath
        Created = $created
        UpdatedKeys = $updatedKeys
    }

    if (-not $Quiet) {
        $mode = if ($created) { "created" } else { "reused" }
        $updatedSummary = if ($updatedKeys.Count -gt 0) { $updatedKeys -join ", " } else { "none" }
        Write-Output ".env $mode at $envPath"
        Write-Output "secrets updated: $updatedSummary"
    }

    return $result
}

if ($MyInvocation.InvocationName -ne ".") {
    Invoke-LocalEnvBootstrap -RepoRoot $RepoRoot -Quiet:$Quiet | Out-Null
}

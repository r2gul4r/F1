[CmdletBinding()]
param(
    [switch]$SkipCompose,
    [switch]$SkipRealtimeHealth,
    [switch]$SkipWebWatch,
    [switch]$SkipLogs,
    [switch]$SkipMetrics,
    [string]$MetricsToken,
    [string]$EnvFilePath,
    [string]$RealtimeHealthUrl = "http://localhost:4001/healthz",
    [string]$WebWatchUrl = "http://localhost:3000/watch/current",
    [string]$MetricsUrl = "http://localhost:4001/metrics",
    [string[]]$ComposeServices = @("postgres", "redis", "realtime", "worker", "web")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertFrom-ComposeStatusLines {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Lines
    )

    $statusMap = @{}

    foreach ($rawLine in $Lines) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $parts = @()
        if ($line.Contains("`t")) {
            $parts = @($line -split "`t", 2)
        }
        else {
            $parts = @($line -split "\s{2,}", 2)
        }

        if ($parts.Count -lt 2) {
            continue
        }

        $service = $parts[0].Trim()
        $status = $parts[1].Trim()

        if ([string]::IsNullOrWhiteSpace($service) -or [string]::IsNullOrWhiteSpace($status)) {
            continue
        }

        $statusMap[$service] = $status
    }

    return $statusMap
}

function Test-ComposeStatusMap {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$StatusMap
    )

    $healthyServices = @("postgres", "redis", "realtime", "web")
    foreach ($service in $healthyServices) {
        if (-not $StatusMap.ContainsKey($service)) {
            throw "Compose smoke check failed"
        }

        if ($StatusMap[$service] -notmatch "\(healthy\)") {
            throw "Compose smoke check failed"
        }
    }

    if (-not $StatusMap.ContainsKey("worker")) {
        throw "Compose smoke check failed"
    }

    if ($StatusMap["worker"] -notmatch "^Up\b") {
        throw "Compose smoke check failed"
    }

    return $true
}

function Resolve-MetricsToken {
    param(
        [string]$CandidateToken,
        [hashtable]$Environment,
        [string]$EnvFilePath
    )

    if (-not [string]::IsNullOrWhiteSpace($CandidateToken)) {
        return $CandidateToken.Trim()
    }

    $source = $Environment
    if ($null -eq $source) {
        $source = @{
            INTERNAL_API_TOKEN = $env:INTERNAL_API_TOKEN
        }
    }

    if ($source.ContainsKey("INTERNAL_API_TOKEN")) {
        $token = [string]$source["INTERNAL_API_TOKEN"]
        if (-not [string]::IsNullOrWhiteSpace($token)) {
            return $token.Trim()
        }
    }

    $tokenFromEnvFile = Get-EnvFileValue -Path $EnvFilePath -Key "INTERNAL_API_TOKEN"
    if (-not [string]::IsNullOrWhiteSpace($tokenFromEnvFile)) {
        return $tokenFromEnvFile
    }

    return $null
}

function Resolve-EnvFilePath {
    param(
        [string]$CandidatePath
    )

    if (-not [string]::IsNullOrWhiteSpace($CandidatePath)) {
        return $CandidatePath
    }

    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    return (Join-Path $repoRoot ".env")
}

function Get-EnvFileValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    if (-not (Test-Path $Path)) {
        return $null
    }

    $resolvedValue = $null

    foreach ($lineRaw in (Get-Content $Path)) {
        $line = $lineRaw.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            continue
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -le 0) {
            continue
        }

        $lineKey = $line.Substring(0, $separatorIndex).Trim()
        if ($lineKey -ne $Key) {
            continue
        }

        $lineValue = $line.Substring($separatorIndex + 1).Trim().Trim("'`"")
        if (-not [string]::IsNullOrWhiteSpace($lineValue)) {
            $resolvedValue = $lineValue
        }
    }

    return $resolvedValue
}

function Get-MetricsCheckDecision {
    param(
        [switch]$SkipMetrics,
        [string]$ResolvedToken
    )

    if ($SkipMetrics) {
        return [pscustomobject]@{
            ShouldSkip = $true
            Reason = "switch"
        }
    }

    if ([string]::IsNullOrWhiteSpace($ResolvedToken)) {
        return [pscustomobject]@{
            ShouldSkip = $true
            Reason = "token-missing"
        }
    }

    return [pscustomobject]@{
        ShouldSkip = $false
        Reason = "enabled"
    }
}

function Invoke-HttpGetSmokeCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [hashtable]$Headers,
        [string]$ExpectedJsonStatus
    )

    $requestHeaders = $Headers
    if ($null -eq $requestHeaders) {
        $requestHeaders = @{}
    }

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -Headers $requestHeaders -TimeoutSec 10 -ErrorAction Stop
    }
    catch {
        throw "$Name smoke check failed"
    }

    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "$Name smoke check failed"
    }

    if (-not [string]::IsNullOrWhiteSpace($ExpectedJsonStatus)) {
        Assert-ExpectedJsonStatus -BodyContent $response.Content -ExpectedStatus $ExpectedJsonStatus -FailureMessage "$Name smoke check failed"
    }

    Write-Output ("http:{0} {1}" -f $Name, $response.StatusCode)
}

function Assert-ExpectedJsonStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BodyContent,
        [Parameter(Mandatory = $true)]
        [string]$ExpectedStatus,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    try {
        $payload = $BodyContent | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw $FailureMessage
    }

    if (-not ($payload.PSObject.Properties.Name -contains "status")) {
        throw $FailureMessage
    }

    $statusValue = [string]$payload.status
    if ($statusValue -ne $ExpectedStatus) {
        throw $FailureMessage
    }
}

function Test-CommandAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName,
        [hashtable]$CommandMap
    )

    if ($null -ne $CommandMap) {
        return $CommandMap.ContainsKey($CommandName)
    }

    return ($null -ne (Get-Command -Name $CommandName -ErrorAction SilentlyContinue))
}

function Assert-DockerAvailable {
    param(
        [hashtable]$CommandMap
    )

    if (-not (Test-CommandAvailable -CommandName "docker" -CommandMap $CommandMap)) {
        throw "Deployment smoke check failed"
    }
}

function Invoke-ComposeStatusCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Services
    )

    try {
        $rawOutput = & docker compose ps --format "{{.Service}}`t{{.Status}}" @Services 2>&1
    }
    catch {
        throw "Compose smoke check failed"
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Compose smoke check failed"
    }

    $statusLines = @()
    foreach ($line in $rawOutput) {
        $statusLines += [string]$line
    }

    $statusMap = ConvertFrom-ComposeStatusLines -Lines $statusLines
    Test-ComposeStatusMap -StatusMap $statusMap | Out-Null

    foreach ($service in @("postgres", "redis", "realtime", "worker", "web")) {
        if ($statusMap.ContainsKey($service)) {
            Write-Output ("compose:{0} {1}" -f $service, $statusMap[$service])
        }
    }
}

function Invoke-ComposeLogsCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Services,
        [int]$Tail = 120
    )

    try {
        $rawOutput = & docker compose logs @Services --tail=$Tail 2>&1
    }
    catch {
        throw "Compose logs check failed"
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Compose logs check failed"
    }

    Write-Output "logs:tail-start"
    foreach ($line in $rawOutput) {
        Write-Output ([string]$line)
    }
    Write-Output "logs:tail-end"
    Write-Output "logs:checked"
}

function Invoke-MetricsCheck {
    param(
        [Parameter(Mandatory = $true)]
        [switch]$SkipMetrics,
        [string]$Token,
        [Parameter(Mandatory = $true)]
        [string]$MetricsUrl
    )

    $decision = Get-MetricsCheckDecision -SkipMetrics:$SkipMetrics -ResolvedToken $Token
    if ($decision.ShouldSkip) {
        Write-Output ("metrics:skipped ({0})" -f $decision.Reason)
        return
    }

    Invoke-HttpGetSmokeCheck -Name "metrics" -Url $MetricsUrl -Headers @{ "x-internal-token" = $Token } | Out-Null
    Write-Output "metrics:checked"
}

function Invoke-DeploymentSmokeCheck {
    param(
        [Parameter(Mandatory = $true)]
        [switch]$SkipCompose,
        [Parameter(Mandatory = $true)]
        [switch]$SkipRealtimeHealth,
        [Parameter(Mandatory = $true)]
        [switch]$SkipWebWatch,
        [Parameter(Mandatory = $true)]
        [switch]$SkipLogs,
        [Parameter(Mandatory = $true)]
        [switch]$SkipMetrics,
        [string]$MetricsToken,
        [string]$EnvFilePath,
        [Parameter(Mandatory = $true)]
        [string]$RealtimeHealthUrl,
        [Parameter(Mandatory = $true)]
        [string]$WebWatchUrl,
        [Parameter(Mandatory = $true)]
        [string]$MetricsUrl,
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeServices
    )

    if ((-not $SkipCompose) -or (-not $SkipLogs)) {
        Assert-DockerAvailable
    }

    if (-not $SkipCompose) {
        Invoke-ComposeStatusCheck -Services $ComposeServices | Out-Null
    }
    else {
        Write-Output "compose:skipped"
    }

    if (-not $SkipRealtimeHealth) {
        Invoke-HttpGetSmokeCheck -Name "realtime-health" -Url $RealtimeHealthUrl -ExpectedJsonStatus "ok" | Out-Null
    }
    else {
        Write-Output "realtime-health:skipped"
    }

    if (-not $SkipWebWatch) {
        Invoke-HttpGetSmokeCheck -Name "web-watch" -Url $WebWatchUrl | Out-Null
    }
    else {
        Write-Output "web-watch:skipped"
    }

    if (-not $SkipLogs) {
        Invoke-ComposeLogsCheck -Services $ComposeServices | Out-Null
    }
    else {
        Write-Output "logs:skipped"
    }

    $resolvedEnvFilePath = Resolve-EnvFilePath -CandidatePath $EnvFilePath
    $resolvedToken = Resolve-MetricsToken -CandidateToken $MetricsToken -EnvFilePath $resolvedEnvFilePath
    Invoke-MetricsCheck -SkipMetrics:$SkipMetrics -Token $resolvedToken -MetricsUrl $MetricsUrl | Out-Null

    Write-Output "Deployment smoke check passed"
}

if ($MyInvocation.InvocationName -ne ".") {
    Invoke-DeploymentSmokeCheck `
        -SkipCompose:$SkipCompose `
        -SkipRealtimeHealth:$SkipRealtimeHealth `
        -SkipWebWatch:$SkipWebWatch `
        -SkipLogs:$SkipLogs `
        -SkipMetrics:$SkipMetrics `
        -MetricsToken $MetricsToken `
        -EnvFilePath $EnvFilePath `
        -RealtimeHealthUrl $RealtimeHealthUrl `
        -WebWatchUrl $WebWatchUrl `
        -MetricsUrl $MetricsUrl `
        -ComposeServices $ComposeServices
}

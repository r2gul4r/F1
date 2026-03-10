[CmdletBinding()]
param(
    [string]$RequiredPnpmVersion = "10.6.0",
    [int]$InstallTimeoutSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Add-PathSegmentIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathSegment
    )

    if (-not (Test-Path $PathSegment)) {
        return
    }

    $currentSegments = @($env:PATH -split ";")
    if ($currentSegments -contains $PathSegment) {
        return
    }

    $env:PATH = "$PathSegment;$($env:PATH)"
}

function Assert-NativeCommandSuccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Invoke-CmdWithTimeout {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandLine,
        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/d /c $CommandLine"
    $startInfo.UseShellExecute = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $null = $process.Start()

    $didExit = $process.WaitForExit($TimeoutSeconds * 1000)

    if (-not $didExit) {
        try {
            $process.Kill()
        }
        catch {
        }
        throw "$FailureMessage (timeout after ${TimeoutSeconds}s)"
    }

    if ($process.ExitCode -ne 0) {
        throw "$FailureMessage (exit code $($process.ExitCode))"
    }
}

$commonPathSegments = @(
    "$env:ProgramFiles\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm"
)

foreach ($segment in $commonPathSegments) {
    if (-not [string]::IsNullOrWhiteSpace($segment)) {
        Add-PathSegmentIfMissing -PathSegment $segment
    }
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw "Node.js is missing. Install Node.js LTS and rerun automation"
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        throw "npm is missing. Node.js installation is incomplete"
    }

    $installCommand = "npm install -g pnpm@$RequiredPnpmVersion --no-fund --no-audit --loglevel=error --fetch-timeout=20000"
    Invoke-CmdWithTimeout `
        -CommandLine $installCommand `
        -TimeoutSeconds $InstallTimeoutSeconds `
        -FailureMessage "Automatic pnpm installation failed"
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
    throw "pnpm is still unavailable after install attempt"
}

$nodeVersion = (& node -v).Trim()
Assert-NativeCommandSuccess -FailureMessage "Node version check failed"
$pnpmVersion = (& pnpm -v).Trim()
Assert-NativeCommandSuccess -FailureMessage "pnpm version check failed"

Write-Output "Node toolchain ready"
Write-Output "Node version: $nodeVersion"
Write-Output "pnpm version: $pnpmVersion"

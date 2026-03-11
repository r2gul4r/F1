[CmdletBinding()]
param(
    [int]$InstallTimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$toolchainFallbackScriptPath = Join-Path $PSScriptRoot "toolchain-fallback.ps1"
. $toolchainFallbackScriptPath

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

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ensureToolchainScriptPath = Join-Path $PSScriptRoot "ensure-node-toolchain.ps1"

& $ensureToolchainScriptPath

Set-Location $repoRoot

$hasPnpm = [bool](Get-Command pnpm -ErrorAction SilentlyContinue)
$hasNodeModules = Test-Path (Join-Path $repoRoot "node_modules")
$toolchainMode = Get-ToolchainMode -HasPnpm $hasPnpm -HasNodeModules $hasNodeModules

if ($toolchainMode.Mode -eq "fallback") {
    if (-not $hasNodeModules) {
        throw "Dependency state is unavailable"
    }

    Write-Output "Project dependencies ready"
    Write-Output "Dependency mode: fallback"
    exit 0
}

$installCommand = "pnpm install --frozen-lockfile --prefer-offline --reporter=append-only"
Invoke-CmdWithTimeout `
    -CommandLine $installCommand `
    -TimeoutSeconds $InstallTimeoutSeconds `
    -FailureMessage "Dependency install failed"

Write-Output "Project dependencies ready"
Write-Output "Dependency mode: pnpm"

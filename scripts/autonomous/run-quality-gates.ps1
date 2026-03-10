[CmdletBinding()]
param(
    [int]$TypecheckTimeoutSeconds = 900,
    [int]$TestTimeoutSeconds = 1200,
    [int]$SecurityTimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
$ensureDependenciesScriptPath = Join-Path $PSScriptRoot "ensure-project-dependencies.ps1"
$securityScriptPath = Join-Path $PSScriptRoot "security-check.ps1"

& $ensureDependenciesScriptPath

Set-Location $repoRoot

Invoke-CmdWithTimeout `
    -CommandLine "pnpm typecheck" `
    -TimeoutSeconds $TypecheckTimeoutSeconds `
    -FailureMessage "Typecheck gate failed"

Invoke-CmdWithTimeout `
    -CommandLine "pnpm test" `
    -TimeoutSeconds $TestTimeoutSeconds `
    -FailureMessage "Test gate failed"

$securityCommand = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$securityScriptPath`" -StagedOnly"
Invoke-CmdWithTimeout `
    -CommandLine $securityCommand `
    -TimeoutSeconds $SecurityTimeoutSeconds `
    -FailureMessage "Security gate failed"

Write-Output "All quality gates passed"

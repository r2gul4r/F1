[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ToolchainMode {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$HasPnpm,
        [Parameter(Mandatory = $true)]
        [bool]$HasNodeModules
    )

    if ($HasPnpm) {
        return [pscustomobject]@{
            Mode = "pnpm"
        }
    }

    if ($HasNodeModules) {
        return [pscustomobject]@{
            Mode = "fallback"
        }
    }

    throw "Toolchain is unavailable"
}

function Get-FallbackTypecheckCommands {
    return @(
        "node_modules\\.bin\\tsc.cmd -p packages/shared/tsconfig.json",
        "node_modules\\.bin\\tsc.cmd -p apps/realtime/tsconfig.json --noEmit",
        "node_modules\\.bin\\tsc.cmd -p apps/worker/tsconfig.json --noEmit",
        "node_modules\\.bin\\tsc.cmd -p apps/web/tsconfig.json --noEmit"
    )
}

function Get-FallbackTestCommands {
    return ,('powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Pester -Path ./scripts/autonomous/tests -EnableExit"')
}

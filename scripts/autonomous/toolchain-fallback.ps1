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

function Get-StructureValidationCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Mode
    )

    if ($Mode -eq "pnpm") {
        return "pnpm validate:structure"
    }

    if ($Mode -eq "fallback") {
        return "node_modules\\.bin\\tsc.cmd -p packages/shared/tsconfig.json && node .\\scripts\\validate-project-structure.mjs"
    }

    throw "Unknown toolchain mode"
}

function Get-FallbackTestCommands {
    return ,('powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Pester -Path ./scripts/autonomous/tests -EnableExit"')
}

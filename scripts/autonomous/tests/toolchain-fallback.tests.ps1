. "$PSScriptRoot/../toolchain-fallback.ps1"

Describe "Toolchain fallback journey" {
    It "uses fallback mode when pnpm is missing but node_modules exists" {
        $result = Get-ToolchainMode -HasPnpm $false -HasNodeModules $true
        $result.Mode | Should Be "fallback"
    }

    It "fails with opaque message when pnpm and node_modules are both missing" {
        { Get-ToolchainMode -HasPnpm $false -HasNodeModules $false } | Should Throw "Toolchain is unavailable"
    }

    It "provides deterministic typecheck command sequence for fallback mode" {
        $commands = Get-FallbackTypecheckCommands
        @($commands).Count | Should Be 4
        $commands[0] | Should Be "node_modules\\.bin\\tsc.cmd -p packages/shared/tsconfig.json"
        $commands[3] | Should Be "node_modules\\.bin\\tsc.cmd -p apps/web/tsconfig.json --noEmit"
    }

    It "uses pester-based test command in fallback mode" {
        $commands = Get-FallbackTestCommands
        @($commands).Count | Should Be 1
        @($commands)[0] | Should Be 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Pester -Path ./scripts/autonomous/tests -EnableExit"'
    }
}

. "$PSScriptRoot/../environment-validation.ps1"

Describe "Environment validation preflight" {
    It "runs env validation only when .env exists" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            (Test-ShouldRunEnvValidation -RepoRoot $tempRoot) | Should Be $false
            New-Item -ItemType File -Path (Join-Path $tempRoot ".env") | Out-Null
            (Test-ShouldRunEnvValidation -RepoRoot $tempRoot) | Should Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "uses validate:env command as preflight" {
        (Get-EnvironmentValidationCommand) | Should Be "pnpm validate:env"
    }

    It "uses validate:preflight when .env exists" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            New-Item -ItemType File -Path (Join-Path $tempRoot ".env") | Out-Null
            (Get-PreflightValidationCommand -RepoRoot $tempRoot) | Should Be "pnpm validate:preflight"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "uses validate:structure when .env is absent" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            (Get-PreflightValidationCommand -RepoRoot $tempRoot) | Should Be "pnpm validate:structure"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

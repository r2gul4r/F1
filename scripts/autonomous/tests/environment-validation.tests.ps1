Describe "Environment validation preflight" {
    BeforeAll {
        . "$PSScriptRoot/../environment-validation.ps1"
    }

    It "runs env validation only when .env exists" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            (Test-ShouldRunEnvValidation -RepoRoot $tempRoot) | Should -Be $false
            New-Item -ItemType File -Path (Join-Path $tempRoot ".env") | Out-Null
            (Test-ShouldRunEnvValidation -RepoRoot $tempRoot) | Should -Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "uses validate:env command as preflight" {
        (Get-EnvironmentValidationCommand) | Should -Be "pnpm validate:env"
    }

    It "uses validate:preflight when .env exists" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            New-Item -ItemType File -Path (Join-Path $tempRoot ".env") | Out-Null
            (Get-PreflightValidationCommand -RepoRoot $tempRoot) | Should -Be "pnpm validate:preflight"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "uses validate:structure when .env is absent" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            (Get-PreflightValidationCommand -RepoRoot $tempRoot) | Should -Be "pnpm validate:structure"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "suggests local env bootstrap when placeholder secrets remain" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "INTERNAL_API_TOKEN=replace-with-strong-internal-token-32chars"
                "OAUTH_PROXY_TOKEN=oauth-proxy-token-for-test-123456"
                "WATCH_TOKEN_SECRET=watch-token-secret-for-test-123456"
            )

            (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $tempRoot) | Should -Be $true
            (Get-EnvironmentValidationFailureMessage -RepoRoot $tempRoot -BaseMessage "Environment validation failed") |
                Should -Be "Environment validation failed. Try: pnpm env:bootstrap:local"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "suggests local env bootstrap when one required secret key is missing" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "INTERNAL_API_TOKEN=internal-token-for-test-123456"
                "WATCH_TOKEN_SECRET=watch-token-secret-for-test-123456"
            )

            (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $tempRoot) | Should -Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "suggests local env bootstrap when quoted placeholder secrets remain" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "INTERNAL_API_TOKEN='replace-with-strong-internal-token-32chars'"
                "OAUTH_PROXY_TOKEN='oauth-proxy-token-for-test-123456'"
                "WATCH_TOKEN_SECRET='watch-token-secret-for-test-123456'"
            )

            (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $tempRoot) | Should -Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "does not suggest local env bootstrap when secrets are already valid" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "INTERNAL_API_TOKEN=internal-token-for-test-123456"
                "OAUTH_PROXY_TOKEN=oauth-proxy-token-for-test-123456"
                "WATCH_TOKEN_SECRET=watch-token-secret-for-test-123456"
            )

            (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $tempRoot) | Should -Be $false
            (Get-EnvironmentValidationFailureMessage -RepoRoot $tempRoot -BaseMessage "Environment validation failed") |
                Should -Be "Environment validation failed"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "does not suggest local env bootstrap when quoted secrets are already valid" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "INTERNAL_API_TOKEN='internal-token-for-test-123456'"
                "OAUTH_PROXY_TOKEN='oauth-proxy-token-for-test-123456'"
                "WATCH_TOKEN_SECRET='watch-token-secret-for-test-123456'"
            )

            (Test-ShouldSuggestLocalEnvBootstrap -RepoRoot $tempRoot) | Should -Be $false
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

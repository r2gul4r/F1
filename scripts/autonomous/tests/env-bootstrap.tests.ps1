. "$PSScriptRoot/../../bootstrap-local-env.ps1"

Describe "Local env bootstrap" {
    function Convert-EnvFileToMap {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Path
        )

        $map = @{}
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if ($line.Length -eq 0 -or $line.StartsWith("#")) {
                return
            }

            $separatorIndex = $line.IndexOf("=")
            if ($separatorIndex -le 0) {
                return
            }

            $key = $line.Substring(0, $separatorIndex).Trim()
            $value = $line.Substring($separatorIndex + 1).Trim()
            $map[$key] = $value
        }

        return $map
    }

    It "creates .env from example and replaces placeholder secrets" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env.example") -Value @(
                "DATA_SOURCE=mock"
                "AI_PROVIDER=disabled"
                "INTERNAL_API_TOKEN=replace-with-strong-internal-token-32chars"
                "OAUTH_PROXY_TOKEN=replace-with-strong-oauth-proxy-token-32chars"
                "WATCH_TOKEN_SECRET=replace-with-strong-watch-token-secret-32chars"
            )

            Invoke-LocalEnvBootstrap -RepoRoot $tempRoot -Quiet | Out-Null

            $envPath = Join-Path $tempRoot ".env"
            Test-Path $envPath | Should Be $true

            $map = Convert-EnvFileToMap -Path $envPath

            $map["DATA_SOURCE"] | Should Be "mock"
            $map["AI_PROVIDER"] | Should Be "disabled"
            $map["INTERNAL_API_TOKEN"] | Should Not Be "replace-with-strong-internal-token-32chars"
            $map["OAUTH_PROXY_TOKEN"] | Should Not Be "replace-with-strong-oauth-proxy-token-32chars"
            $map["WATCH_TOKEN_SECRET"] | Should Not Be "replace-with-strong-watch-token-secret-32chars"
            $map["INTERNAL_API_TOKEN"].Length -ge 24 | Should Be $true
            $map["OAUTH_PROXY_TOKEN"].Length -ge 24 | Should Be $true
            $map["WATCH_TOKEN_SECRET"].Length -ge 24 | Should Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "preserves valid user secrets and replaces only placeholder values" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env.example") -Value @(
                "DATA_SOURCE=mock"
                "AI_PROVIDER=disabled"
                "INTERNAL_API_TOKEN=replace-with-strong-internal-token-32chars"
                "OAUTH_PROXY_TOKEN=replace-with-strong-oauth-proxy-token-32chars"
                "WATCH_TOKEN_SECRET=replace-with-strong-watch-token-secret-32chars"
            )

            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "DATA_SOURCE=mock"
                "AI_PROVIDER=disabled"
                "INTERNAL_API_TOKEN=already-valid-internal-token-abcdefghijklmnopqrstuvwxyz"
                "OAUTH_PROXY_TOKEN=replace-with-strong-oauth-proxy-token-32chars"
                "WATCH_TOKEN_SECRET=already-valid-watch-secret-abcdefghijklmnopqrstuvwxyz"
            )

            Invoke-LocalEnvBootstrap -RepoRoot $tempRoot -Quiet | Out-Null

            $map = Convert-EnvFileToMap -Path (Join-Path $tempRoot ".env")

            $map["INTERNAL_API_TOKEN"] | Should Be "already-valid-internal-token-abcdefghijklmnopqrstuvwxyz"
            $map["WATCH_TOKEN_SECRET"] | Should Be "already-valid-watch-secret-abcdefghijklmnopqrstuvwxyz"
            $map["OAUTH_PROXY_TOKEN"] | Should Not Be "replace-with-strong-oauth-proxy-token-32chars"
            $map["OAUTH_PROXY_TOKEN"].Length -ge 24 | Should Be $true
            $map["DATA_SOURCE"] | Should Be "mock"
            $map["AI_PROVIDER"] | Should Be "disabled"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "appends missing secret key while preserving existing valid keys" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            Set-Content -Path (Join-Path $tempRoot ".env.example") -Value @(
                "DATA_SOURCE=mock"
                "AI_PROVIDER=disabled"
                "INTERNAL_API_TOKEN=replace-with-strong-internal-token-32chars"
                "OAUTH_PROXY_TOKEN=replace-with-strong-oauth-proxy-token-32chars"
                "WATCH_TOKEN_SECRET=replace-with-strong-watch-token-secret-32chars"
            )

            Set-Content -Path (Join-Path $tempRoot ".env") -Value @(
                "DATA_SOURCE=mock"
                "AI_PROVIDER=disabled"
                "INTERNAL_API_TOKEN=already-valid-internal-token-abcdefghijklmnopqrstuvwxyz"
                "WATCH_TOKEN_SECRET=already-valid-watch-secret-abcdefghijklmnopqrstuvwxyz"
            )

            Invoke-LocalEnvBootstrap -RepoRoot $tempRoot -Quiet | Out-Null

            $envPath = Join-Path $tempRoot ".env"
            $map = Convert-EnvFileToMap -Path $envPath
            $oauthEntries = @((Get-Content $envPath) | Where-Object { $_ -match '^OAUTH_PROXY_TOKEN=' })

            $map["INTERNAL_API_TOKEN"] | Should Be "already-valid-internal-token-abcdefghijklmnopqrstuvwxyz"
            $map["WATCH_TOKEN_SECRET"] | Should Be "already-valid-watch-secret-abcdefghijklmnopqrstuvwxyz"
            $map["OAUTH_PROXY_TOKEN"] | Should Not Be $null
            $map["OAUTH_PROXY_TOKEN"].Length -ge 24 | Should Be $true
            @($oauthEntries).Count | Should Be 1
            $map["DATA_SOURCE"] | Should Be "mock"
            $map["AI_PROVIDER"] | Should Be "disabled"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

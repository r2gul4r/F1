Describe "Deployment smoke check helpers" {
    BeforeAll {
        . "$PSScriptRoot/../smoke-check.ps1"
    }

    It "parses compose service status lines with tab delimiters" {
        $statusMap = ConvertFrom-ComposeStatusLines -Lines @(
            "postgres`tUp 32 seconds (healthy)"
            "redis`tUp 30 seconds (healthy)"
            "realtime`tUp 20 seconds (healthy)"
            "worker`tUp 18 seconds"
            "web`tUp 15 seconds (healthy)"
        )

        $statusMap["postgres"] | Should -Be "Up 32 seconds (healthy)"
        $statusMap["worker"] | Should -Be "Up 18 seconds"
    }

    It "accepts compose status map when required healthy services and worker up are present" {
        {
            Test-ComposeStatusMap -StatusMap @{
                postgres = "Up 30 seconds (healthy)"
                redis    = "Up 30 seconds (healthy)"
                realtime = "Up 20 seconds (healthy)"
                worker   = "Up 20 seconds"
                web      = "Up 15 seconds (healthy)"
            }
        } | Should -Not -Throw
    }

    It "rejects compose status map when a required service is not healthy" {
        {
            Test-ComposeStatusMap -StatusMap @{
                postgres = "Up 30 seconds (healthy)"
                redis    = "Up 30 seconds (healthy)"
                realtime = "Up 20 seconds (healthy)"
                worker   = "Up 20 seconds"
                web      = "Up 15 seconds"
            }
        } | Should -Throw
    }

    It "accepts compose status map when only requested subset services are present" {
        {
            Test-ComposeStatusMap -StatusMap @{
                realtime = "Up 20 seconds (healthy)"
                web      = "Up 15 seconds (healthy)"
            } -RequiredServices @("realtime", "web")
        } | Should -Not -Throw
    }

    It "rejects compose status map when requested worker service is not up" {
        {
            Test-ComposeStatusMap -StatusMap @{
                worker = "Exited (1)"
            } -RequiredServices @("worker")
        } | Should -Throw
    }

    It "prefers explicit metrics token over environment token" {
        $resolved = Resolve-MetricsToken -CandidateToken "manual-token" -Environment @{
            INTERNAL_API_TOKEN = "env-token"
        }

        $resolved | Should -Be "manual-token"
    }

    It "uses environment token when explicit metrics token is absent" {
        $resolved = Resolve-MetricsToken -Environment @{
            INTERNAL_API_TOKEN = "env-token"
        }

        $resolved | Should -Be "env-token"
    }

    It "returns skip decision when metrics token is missing" {
        $decision = Get-MetricsCheckDecision -ResolvedToken $null

        $decision.ShouldSkip | Should -Be $true
        $decision.Reason | Should -Be "token-missing"
    }

    It "returns skip decision when SkipMetrics switch is set" {
        $decision = Get-MetricsCheckDecision -SkipMetrics -ResolvedToken "env-token"

        $decision.ShouldSkip | Should -Be $true
        $decision.Reason | Should -Be "switch"
    }

    It "enables metrics check when token is present and SkipMetrics is not set" {
        $decision = Get-MetricsCheckDecision -ResolvedToken "env-token"

        $decision.ShouldSkip | Should -Be $false
        $decision.Reason | Should -Be "enabled"
    }

    It "falls back to .env INTERNAL_API_TOKEN when process environment token is absent" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            $envFilePath = Join-Path $tempRoot ".env"
            Set-Content -Path $envFilePath -Value @(
                "INTERNAL_API_TOKEN=from-env-file-token"
            )

            $resolved = Resolve-MetricsToken -Environment @{} -EnvFilePath $envFilePath
            $resolved | Should -Be "from-env-file-token"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "reads quoted INTERNAL_API_TOKEN values from .env" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            $envFilePath = Join-Path $tempRoot ".env"
            Set-Content -Path $envFilePath -Value @(
                "# comment"
                "INTERNAL_API_TOKEN='quoted-env-file-token'"
            )

            (Get-EnvFileValue -Path $envFilePath -Key "INTERNAL_API_TOKEN") | Should -Be "quoted-env-file-token"
            (Resolve-MetricsToken -Environment @{} -EnvFilePath $envFilePath) | Should -Be "quoted-env-file-token"
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "accepts realtime health body when status is ok" {
        {
            Assert-ExpectedJsonStatus -BodyContent '{"status":"ok"}' -ExpectedStatus "ok" -FailureMessage "realtime-health smoke check failed"
        } | Should -Not -Throw
    }

    It "rejects realtime health body when status is not ok" {
        {
            Assert-ExpectedJsonStatus -BodyContent '{"status":"degraded"}' -ExpectedStatus "ok" -FailureMessage "realtime-health smoke check failed"
        } | Should -Throw
    }

    It "fails with stable opaque message when docker command is missing" {
        {
            Assert-DockerAvailable -CommandMap @{}
        } | Should -Throw "Deployment smoke check failed"
    }
}

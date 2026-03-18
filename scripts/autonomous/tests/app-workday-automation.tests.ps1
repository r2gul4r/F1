Describe "App workday automation" {
    BeforeAll {
        . "$PSScriptRoot/../app-workday-automation.ps1"
    }

    It "treats weekday morning KST as active window" {
        $now = [DateTimeOffset]::Parse("2026-03-17T00:30:00Z")
        (Test-IsWithinWorkdayWindow -NowUtc $now) | Should -Be $true
    }

    It "treats after 17:00 KST as inactive window" {
        $now = [DateTimeOffset]::Parse("2026-03-17T08:01:00Z")
        (Test-IsWithinWorkdayWindow -NowUtc $now) | Should -Be $false
    }

    It "finds the newest matching session file for repo root" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            $sessionsRoot = Join-Path $tempRoot "sessions"
            New-Item -ItemType Directory -Path $sessionsRoot | Out-Null

            $oldFile = Join-Path $sessionsRoot "old.jsonl"
            $newFile = Join-Path $sessionsRoot "new.jsonl"

            '{"timestamp":"2026-03-17T00:00:00Z","type":"session_meta","payload":{"id":"old-session","cwd":"C:\\repoA"}}' |
                Set-Content -Path $oldFile
            Start-Sleep -Milliseconds 10
            '{"timestamp":"2026-03-17T00:01:00Z","type":"session_meta","payload":{"id":"new-session","cwd":"C:\\repoA"}}' |
                Set-Content -Path $newFile

            $result = Get-LatestSessionMetadataForRepo -SessionsRoot $sessionsRoot -RepoRoot "C:\repoA"

            $result.SessionId | Should -Be "new-session"
            $result.SessionFilePath | Should -Be $newFile
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "ignores session files for other repos" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            $sessionsRoot = Join-Path $tempRoot "sessions"
            New-Item -ItemType Directory -Path $sessionsRoot | Out-Null
            $sessionFile = Join-Path $sessionsRoot "session.jsonl"

            '{"timestamp":"2026-03-17T00:01:00Z","type":"session_meta","payload":{"id":"other-session","cwd":"C:\\repoB"}}' |
                Set-Content -Path $sessionFile

            $result = Get-LatestSessionMetadataForRepo -SessionsRoot $sessionsRoot -RepoRoot "C:\repoA"

            $result | Should -Be $null
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "writes and reads app workday state immutably" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            $statePath = Join-Path $tempRoot "state.json"
            $state = @{
                repoRoot = "C:\repoA"
                sessionId = "session-1"
                sessionFilePath = "C:\sessions\session-1.jsonl"
                active = $true
                activatedAt = "2026-03-17T00:00:00Z"
                lastContinueAt = $null
            }

            Save-AppWorkdayState -StatePath $statePath -State $state
            $loaded = Read-AppWorkdayState -StatePath $statePath

            $loaded.sessionId | Should -Be "session-1"
            $loaded.repoRoot | Should -Be "C:\repoA"
            $loaded.active | Should -Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

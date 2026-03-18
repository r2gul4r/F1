[CmdletBinding()]
param(
    [ValidateSet("Activate", "Continue", "Deactivate", "InstallTask", "UninstallTask", "Status")]
    [string]$Action = "Status",
    [string]$RepoRoot,
    [string]$CodexHome = $env:CODEX_HOME,
    [string]$TaskName = "F1CodexAppWorkdayContinue",
    [int]$RepetitionMinutes = 5,
    [int]$LockTimeoutMinutes = 25
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($CodexHome)) {
    $CodexHome = Join-Path $env:USERPROFILE ".codex"
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDirectory = if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        Split-Path -Path $MyInvocation.MyCommand.Path -Parent
    }
    else {
        $PSScriptRoot
    }
    $RepoRoot = (Resolve-Path (Join-Path $scriptDirectory "..\..")).Path
}

function Get-AppWorkdayStatePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    Join-Path $RepoRoot ".codex-run\app-workday-state.json"
}

function Get-AppWorkdayLockPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    Join-Path $RepoRoot ".codex-run\app-workday-loop.lock"
}

function Get-CodexSessionsRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CodexHome
    )

    Join-Path $CodexHome "sessions"
}

function Get-CodexCliPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CodexHome
    )

    Join-Path $CodexHome ".sandbox-bin\codex.exe"
}

function Get-AppWorkdayAutomationRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CodexHome,
        [Parameter(Mandatory = $true)]
        [string]$TaskName
    )

    Join-Path (Join-Path $CodexHome "automations") $TaskName
}

function Test-IsWithinWorkdayWindow {
    param(
        [Parameter(Mandatory = $true)]
        [DateTimeOffset]$NowUtc
    )

    $kstZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Korea Standard Time")
    $kstNow = [System.TimeZoneInfo]::ConvertTime($NowUtc, $kstZone)
    $weekdayList = @(
        [System.DayOfWeek]::Monday,
        [System.DayOfWeek]::Tuesday,
        [System.DayOfWeek]::Wednesday,
        [System.DayOfWeek]::Thursday,
        [System.DayOfWeek]::Friday
    )
    if ($weekdayList -notcontains $kstNow.DayOfWeek) {
        return $false
    }

    $totalMinutes = ($kstNow.Hour * 60) + $kstNow.Minute
    $startMinutes = (8 * 60) + 10
    $stopMinutes = 17 * 60
    return $totalMinutes -ge $startMinutes -and $totalMinutes -lt $stopMinutes
}

function Read-SessionMeta {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SessionFilePath
    )

    $firstLine = Get-Content -Path $SessionFilePath -Head 1 -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($firstLine)) {
        return $null
    }

    $entry = $firstLine | ConvertFrom-Json -ErrorAction Stop
    if ($entry.type -ne "session_meta") {
        return $null
    }

    return $entry.payload
}

function Get-LatestSessionMetadataForRepo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SessionsRoot,
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    if (-not (Test-Path $SessionsRoot)) {
        return $null
    }

    $files = Get-ChildItem -Path $SessionsRoot -Recurse -File -Filter "*.jsonl" |
        Sort-Object LastWriteTime -Descending

    foreach ($file in $files) {
        $sessionMeta = Read-SessionMeta -SessionFilePath $file.FullName
        if ($null -eq $sessionMeta) {
            continue
        }

        if ($sessionMeta.cwd -ne $RepoRoot) {
            continue
        }

        return @{
            SessionId = $sessionMeta.id
            SessionFilePath = $file.FullName
            UpdatedAt = $file.LastWriteTimeUtc.ToString("o")
        }
    }

    return $null
}

function Save-AppWorkdayState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatePath,
        [Parameter(Mandatory = $true)]
        [hashtable]$State
    )

    $parentDirectory = Split-Path -Path $StatePath -Parent
    if (-not (Test-Path $parentDirectory)) {
        New-Item -ItemType Directory -Path $parentDirectory -Force | Out-Null
    }

    $State |
        ConvertTo-Json -Depth 5 |
        Set-Content -Path $StatePath -Encoding UTF8
}

function Read-AppWorkdayState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatePath
    )

    if (-not (Test-Path $StatePath)) {
        return $null
    }

    $jsonObject = Get-Content -Path $StatePath -Raw | ConvertFrom-Json
    return @{
        repoRoot = $jsonObject.repoRoot
        sessionId = $jsonObject.sessionId
        sessionFilePath = $jsonObject.sessionFilePath
        active = [bool]$jsonObject.active
        activatedAt = $jsonObject.activatedAt
        lastContinueAt = $jsonObject.lastContinueAt
    }
}

function Remove-AppWorkdayState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatePath
    )

    if (Test-Path $StatePath) {
        Remove-Item -Path $StatePath -Force
    }
}

function New-AppWorkdayResumePrompt {
    @(
        "이어서 다음 미완료 슬라이스를 진행해.",
        "사용자 응답을 기다리지 말고 17:00 KST 전까지 계속 작업해.",
        "슬라이스 하나가 끝나도 멈추지 말고 다음 미완료 슬라이스로 넘어가.",
        "이미 끝난 슬라이스를 반복하지 말고 TASKS.md 기준으로 다음 코어 문제를 선택해.",
        "공유 계약 변경이 필요하면 먼저 그 단계부터 잠가."
    ) -join "`n"
}

function Test-AppWorkdayLockAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath,
        [Parameter(Mandatory = $true)]
        [int]$LockTimeoutMinutes
    )

    if (-not (Test-Path $LockPath)) {
        return $true
    }

    $lockInfo = Get-Item -Path $LockPath
    $ageMinutes = ([DateTimeOffset]::UtcNow - $lockInfo.LastWriteTimeUtc).TotalMinutes
    return $ageMinutes -ge $LockTimeoutMinutes
}

function Set-AppWorkdayLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath
    )

    $parentDirectory = Split-Path -Path $LockPath -Parent
    if (-not (Test-Path $parentDirectory)) {
        New-Item -ItemType Directory -Path $parentDirectory -Force | Out-Null
    }

    [DateTimeOffset]::UtcNow.ToString("o") | Set-Content -Path $LockPath -Encoding UTF8
}

function Remove-AppWorkdayLock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LockPath
    )

    if (Test-Path $LockPath) {
        Remove-Item -Path $LockPath -Force
    }
}

function Install-AppWorkdayScheduledTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$CodexHome,
        [Parameter(Mandatory = $true)]
        [string]$TaskName,
        [Parameter(Mandatory = $true)]
        [int]$RepetitionMinutes
    )

    $automationRoot = Get-AppWorkdayAutomationRoot -CodexHome $CodexHome -TaskName $TaskName
    if (-not (Test-Path $automationRoot)) {
        New-Item -ItemType Directory -Path $automationRoot -Force | Out-Null
    }

    $normalizedRepoRoot = $RepoRoot.Replace("\", "/")
    $scriptPath = (Join-Path $RepoRoot "scripts\autonomous\app-workday-automation.ps1").Replace("\", "/")
    $automationToml = @(
        'version = 1'
        "id = `"$TaskName`""
        'name = "F1 App Workday Continue"'
        "prompt = `"Run powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -Action Continue -RepoRoot $normalizedRepoRoot`n`nRules`n1. Keep the report concise and in Korean`n2. If no active app workday session exists, say so briefly`n3. If the continue command fails, include the exact failing command and a short error summary`""
        'status = "ACTIVE"'
        "rrule = `"FREQ=MINUTELY;INTERVAL=$RepetitionMinutes;BYDAY=MO,TU,WE,TH,FR`""
        'execution_environment = "local"'
        "cwds = [`"$normalizedRepoRoot`"]"
        "created_at = $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
        "updated_at = $([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
    ) -join "`n"
    $memoryText = @(
        '# F1 App Workday Continue'
        ''
        '- This automation resumes the currently active app workday session for F1'
        '- The active session is tracked in `.codex-run/app-workday-state.json` inside the repo'
        '- It should keep the same session moving until 17:00 KST'
    ) -join "`n"

    Set-Content -Path (Join-Path $automationRoot "automation.toml") -Value $automationToml -Encoding UTF8
    Set-Content -Path (Join-Path $automationRoot "memory.md") -Value $memoryText -Encoding UTF8
}

function Uninstall-AppWorkdayScheduledTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CodexHome,
        [Parameter(Mandatory = $true)]
        [string]$TaskName
    )

    $automationRoot = Get-AppWorkdayAutomationRoot -CodexHome $CodexHome -TaskName $TaskName
    if (Test-Path $automationRoot) {
        Remove-Item -Path $automationRoot -Recurse -Force
    }
}

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
$statePath = Get-AppWorkdayStatePath -RepoRoot $resolvedRepoRoot
$lockPath = Get-AppWorkdayLockPath -RepoRoot $resolvedRepoRoot
$sessionsRoot = Get-CodexSessionsRoot -CodexHome $CodexHome
$codexCliPath = Get-CodexCliPath -CodexHome $CodexHome

switch ($Action) {
    "Activate" {
        $sessionMeta = Get-LatestSessionMetadataForRepo -SessionsRoot $sessionsRoot -RepoRoot $resolvedRepoRoot
        if ($null -eq $sessionMeta) {
            throw "Current app session was not found"
        }

        $state = @{
            repoRoot = $resolvedRepoRoot
            sessionId = $sessionMeta.SessionId
            sessionFilePath = $sessionMeta.SessionFilePath
            active = $true
            activatedAt = [DateTimeOffset]::UtcNow.ToString("o")
            lastContinueAt = $null
        }
        Save-AppWorkdayState -StatePath $statePath -State $state
        Write-Output "App workday automation activated"
        Write-Output "sessionId: $($sessionMeta.SessionId)"
        break
    }
    "Continue" {
        $state = Read-AppWorkdayState -StatePath $statePath
        if ($null -eq $state -or -not $state.active) {
            Write-Output "No active app workday session"
            break
        }

        if (-not (Test-IsWithinWorkdayWindow -NowUtc ([DateTimeOffset]::UtcNow))) {
            Remove-AppWorkdayState -StatePath $statePath
            Remove-AppWorkdayLock -LockPath $lockPath
            Write-Output "Outside workday window"
            break
        }

        if (-not (Test-AppWorkdayLockAvailable -LockPath $lockPath -LockTimeoutMinutes $LockTimeoutMinutes)) {
            Write-Output "Another continue run is still active"
            break
        }

        if (-not (Test-Path $state.sessionFilePath)) {
            Remove-AppWorkdayState -StatePath $statePath
            Write-Output "Tracked session file no longer exists"
            break
        }

        $sessionFile = Get-Item -Path $state.sessionFilePath
        $recentSessionWriteSeconds = ([DateTimeOffset]::UtcNow - $sessionFile.LastWriteTimeUtc).TotalSeconds
        if ($recentSessionWriteSeconds -lt 150) {
            Write-Output "Session was updated recently, skip auto-continue"
            break
        }

        if (-not (Test-Path $codexCliPath)) {
            throw "Codex CLI was not found"
        }

        Set-AppWorkdayLock -LockPath $lockPath
        try {
            $resumePrompt = New-AppWorkdayResumePrompt
            & $codexCliPath exec resume $state.sessionId $resumePrompt --output-last-message (Join-Path $resolvedRepoRoot ".codex-run\app-workday-last-message.txt")
            if ($LASTEXITCODE -ne 0) {
                throw "App workday continue command failed"
            }

            $nextState = @{
                repoRoot = $state.repoRoot
                sessionId = $state.sessionId
                sessionFilePath = $state.sessionFilePath
                active = $true
                activatedAt = $state.activatedAt
                lastContinueAt = [DateTimeOffset]::UtcNow.ToString("o")
            }
            Save-AppWorkdayState -StatePath $statePath -State $nextState
            Write-Output "App workday session continued"
        }
        finally {
            Remove-AppWorkdayLock -LockPath $lockPath
        }
        break
    }
    "Deactivate" {
        Remove-AppWorkdayState -StatePath $statePath
        Remove-AppWorkdayLock -LockPath $lockPath
        Write-Output "App workday automation deactivated"
        break
    }
    "InstallTask" {
        Install-AppWorkdayScheduledTask -RepoRoot $resolvedRepoRoot -CodexHome $CodexHome -TaskName $TaskName -RepetitionMinutes $RepetitionMinutes
        Write-Output "App workday automation installed"
        break
    }
    "UninstallTask" {
        Uninstall-AppWorkdayScheduledTask -CodexHome $CodexHome -TaskName $TaskName
        Write-Output "App workday automation removed"
        break
    }
    "Status" {
        $state = Read-AppWorkdayState -StatePath $statePath
        if ($null -eq $state) {
            Write-Output "No active app workday session"
            break
        }

        $state |
            ConvertTo-Json -Depth 5 |
            Write-Output
        break
    }
}

$scriptPath = Join-Path $PSScriptRoot "..\seed-plan-tasks.ps1"

Describe "Plan seed task generation" {
    It "seeds only stage goals from PLAN" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            @'
# Plan

## 제품 목표
- 대시보드를 만든다
- 가독성을 높인다

## 1단계
- 목표: 수집과 실시간 전달 경로를 안정화한다
- 범위:
- something

## 2단계
- 목표: 전략 대시보드 MVP를 완성한다
- 범위:
- another
'@ | Set-Content -Path (Join-Path $tempRoot "PLAN.md")

            @'
# Tasks

## Queue
[x] done
'@ | Set-Content -Path (Join-Path $tempRoot "TASKS.md")

            powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -RepoRoot $tempRoot | Out-Null
            $content = Get-Content -Path (Join-Path $tempRoot "TASKS.md")

            (@($content | Where-Object { $_ -match '^\[ \] plan-driven task:' })).Count | Should Be 2
            (@($content) -contains "[ ] plan-driven task: 수집과 실시간 전달 경로를 안정화한다 [slice 1]") | Should Be $true
            (@($content) -contains "[ ] plan-driven task: 전략 대시보드 MVP를 완성한다 [slice 1]") | Should Be $true
            (@($content) -contains "[ ] plan-driven task: 대시보드를 만든다 [slice 1]") | Should Be $false
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "increments slice number for existing stage goal task" {
        $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $tempRoot | Out-Null

        try {
            @'
# Plan

## 1단계
- 목표: 수집과 실시간 전달 경로를 안정화한다
'@ | Set-Content -Path (Join-Path $tempRoot "PLAN.md")

            @'
# Tasks

## Queue
[x] plan-driven task: 수집과 실시간 전달 경로를 안정화한다 [slice 1]
'@ | Set-Content -Path (Join-Path $tempRoot "TASKS.md")

            powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -RepoRoot $tempRoot | Out-Null
            $content = Get-Content -Path (Join-Path $tempRoot "TASKS.md")

            (@($content) -contains "[ ] plan-driven task: 수집과 실시간 전달 경로를 안정화한다 [slice 2]") | Should Be $true
        }
        finally {
            Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

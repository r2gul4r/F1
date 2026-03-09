[CmdletBinding()]
param(
    [switch]$StagedOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

$targetFiles = @()
if ($StagedOnly) {
    $targetFiles = @(git diff --cached --name-only --diff-filter=ACMRT)
}
else {
    $targetFiles = @(git ls-files)
}

if ($targetFiles.Count -eq 0) {
    Write-Output "Security check skipped because there are no target files"
    exit 0
}

$codeExtensions = @(
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".yml", ".yaml", ".ps1", ".env", ".sql"
)

$scanFiles = @()
foreach ($path in $targetFiles) {
    if ([string]::IsNullOrWhiteSpace($path)) {
        continue
    }
    $absolutePath = Join-Path $repoRoot $path
    if (-not (Test-Path $absolutePath)) {
        continue
    }
    $extension = [System.IO.Path]::GetExtension($absolutePath).ToLowerInvariant()
    if ($codeExtensions -contains $extension) {
        $scanFiles += $absolutePath
    }
}

if ($scanFiles.Count -eq 0) {
    Write-Output "Security check skipped because no scannable files were found"
    exit 0
}

$patterns = @(
    @{
        Type = "secret"
        Rule = "OpenAI API key"
        Regex = "sk-[A-Za-z0-9]{20,}"
    },
    @{
        Type = "secret"
        Rule = "AWS access key"
        Regex = "AKIA[0-9A-Z]{16}"
    },
    @{
        Type = "secret"
        Rule = "Private key block"
        Regex = "-----BEGIN [A-Z ]*PRIVATE KEY-----"
    },
    @{
        Type = "secret"
        Rule = "Hardcoded password"
        Regex = '(?i)password\s*[:=]\s*[''"][^''"]{8,}[''"]'
    },
    @{
        Type = "secret"
        Rule = "Hardcoded token"
        Regex = '(?i)(api[_-]?key|secret|token)\s*[:=]\s*[''"][A-Za-z0-9_\-]{16,}[''"]'
    },
    @{
        Type = "code"
        Rule = "Use of eval"
        Regex = "\beval\s*\("
    },
    @{
        Type = "code"
        Rule = "Use of Function constructor"
        Regex = "\bnew Function\s*\("
    },
    @{
        Type = "code"
        Rule = "Direct innerHTML assignment"
        Regex = "\binnerHTML\s*="
    },
    @{
        Type = "code"
        Rule = "Use of child_process exec"
        Regex = "child_process\.(exec|execSync)\s*\("
    }
)

$findings = @()
foreach ($file in $scanFiles) {
    $relativePath = $file.Substring($repoRoot.Length).TrimStart([char]92, [char]47)
    foreach ($pattern in $patterns) {
        $matches = @(Select-String -Path $file -Pattern $pattern.Regex)
        foreach ($match in $matches) {
            $findings += [pscustomobject]@{
                Type = $pattern.Type
                Rule = $pattern.Rule
                Path = $relativePath
                Line = $match.LineNumber
                Snippet = $match.Line.Trim()
            }
        }
    }
}

if ($findings.Count -gt 0) {
    Write-Output "Security check failed"
    foreach ($finding in $findings) {
        Write-Output "- [$($finding.Type)] $($finding.Rule) at $($finding.Path):$($finding.Line) -> $($finding.Snippet)"
    }
    throw "Potential security issues detected in staged changes"
}

Write-Output "Security check passed"

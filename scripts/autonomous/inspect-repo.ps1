[CmdletBinding()]
param(
    [switch]$ApplyTaskSuggestions
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskPath = Join-Path $repoRoot "TASKS.md"
$requiredFiles = @("PLAN.md", "TASKS.md", "ARCHITECTURE.md", "CHANGELOG.md")
$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path (Join-Path $repoRoot $_)) })

if ($missingFiles.Count -gt 0) {
    throw "Required control files are missing"
}

$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs", "*.json", "*.md", "*.yml", "*.yaml", "*.ps1")
$excludeRegex = '\\node_modules\\|\\dist\\|\\.next\\|\\coverage\\|\\build\\|\\out\\|\\.git\\'
$scanFiles = @(Get-ChildItem -Path $repoRoot -Recurse -File -Include $extensions |
    Where-Object { $_.FullName -notmatch $excludeRegex })

$findingsA = @($scanFiles | Select-String -Pattern "TODO|FIXME|HACK|XXX")
$findingsB = @($scanFiles | Select-String -Pattern "not implemented|NotImplemented|throw new Error\(")
$findings = @($findingsA + $findingsB)
$findings = @($findings | Sort-Object Path, LineNumber -Unique)

$taskLines = Get-Content -Path $taskPath
$firstOpenTaskLine = $taskLines | Where-Object { $_ -match '^\[ \]\s.+' } | Select-Object -First 1
$firstOpenTask = if ($firstOpenTaskLine) { $firstOpenTaskLine.Trim() } else { "[ ] none" }

$suggestions = @()
foreach ($item in ($findings | Select-Object -First 20)) {
    $relativePath = $item.Path.Substring($repoRoot.Length).TrimStart('\', '/')
    $suggestions += "[ ] investigate technical debt at ${relativePath}:$($item.LineNumber)"
}
$suggestions = @($suggestions | Select-Object -Unique)

if ($ApplyTaskSuggestions -and $suggestions.Count -gt 0) {
    $rawTasks = Get-Content -Path $taskPath -Raw
    $newSuggestions = @()
    foreach ($suggestion in $suggestions) {
        if ($rawTasks -notmatch [regex]::Escape($suggestion)) {
            $newSuggestions += $suggestion
        }
    }
    if ($newSuggestions.Count -gt 0) {
        Add-Content -Path $taskPath -Value ("`r`n" + ($newSuggestions -join "`r`n"))
    }
}

$reportDir = Join-Path $repoRoot "docs\reports"
if (-not (Test-Path $reportDir)) {
    New-Item -Path $reportDir -ItemType Directory | Out-Null
}

$reportPath = Join-Path $reportDir ("inspection-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")
$reportLines = @(
    "# Inspection Report",
    "",
    "- Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")",
    "- First open task: $firstOpenTask",
    "- Findings count: $($findings.Count)",
    "- Suggestions generated: $($suggestions.Count)",
    ""
)

if ($findings.Count -gt 0) {
    $reportLines += "## Findings"
    foreach ($item in ($findings | Select-Object -First 50)) {
        $relativePath = $item.Path.Substring($repoRoot.Length).TrimStart('\', '/')
        $reportLines += "- ${relativePath}:$($item.LineNumber) -> $($item.Line.Trim())"
    }
}
else {
    $reportLines += "## Findings"
    $reportLines += "- none"
}

if ($suggestions.Count -gt 0) {
    $reportLines += ""
    $reportLines += "## Suggested Tasks"
    $reportLines += $suggestions
}

Set-Content -Path $reportPath -Value ($reportLines -join "`r`n")

Write-Output "Inspection report saved to: $reportPath"
Write-Output "First open task: $firstOpenTask"
Write-Output "Findings detected: $($findings.Count)"

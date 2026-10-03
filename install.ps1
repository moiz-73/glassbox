<#
Glassbox skill installer (Windows PowerShell 5.1+).

Copies each skills/<name>/ directory (SKILL.md plus references) from this
repository into a harness skills directory. Existing skill directories are
skipped unless -Force is given. No network access.

Usage:
  .\install.ps1 -List
  .\install.ps1 claude
  .\install.ps1 all -DryRun
  .\install.ps1 codex -Force
  .\install.ps1 cursor -Dir <path-to-skills>
  .\install.ps1 -Dir <path-to-skills>

Targets:
  claude    ~/.claude/skills
  opencode  ~/.config/opencode/skills
  codex     ~/.codex/skills
  cursor    ~/.cursor/skills
  agents    ~/.agents/skills
  all       every target above

Flags:
  -List     show skills and targets, then exit
  -DryRun   print actions without writing anything
  -Force    overwrite existing skill directories
  -Dir      install into a custom skills directory
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Target,

    [switch]$List,
    [switch]$DryRun,
    [switch]$Force,
    [string]$Dir
)

$ErrorActionPreference = 'Stop'

$SkillRoot = Join-Path $PSScriptRoot 'skills'

$Targets = [ordered]@{
    claude   = Join-Path $HOME '.claude/skills'
    opencode = Join-Path $HOME '.config/opencode/skills'
    codex    = Join-Path $HOME '.codex/skills'
    cursor   = Join-Path $HOME '.cursor/skills'
    agents   = Join-Path $HOME '.agents/skills'
}

$Copied = 0
$Skipped = 0

function Fail([string]$Message) {
    Write-Host "error: $Message"
    exit 1
}

function Get-Skills {
    Get-ChildItem -LiteralPath $SkillRoot -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
        Sort-Object Name
}

function Install-Skill([string]$SkillDir, [string]$DestRoot) {
    $name = Split-Path -Leaf $SkillDir
    $dest = Join-Path $DestRoot $name

    if ((Test-Path -LiteralPath $dest) -and (-not $Force)) {
        Write-Host "skip  $name (already exists at $dest)"
        $script:Skipped++
        return
    }

    if ($DryRun) {
        Write-Host "dry-run  would copy $name -> $dest"
        $script:Copied++
        return
    }

    if (-not (Test-Path -LiteralPath $DestRoot)) {
        New-Item -ItemType Directory -Force -Path $DestRoot | Out-Null
    }
    if (Test-Path -LiteralPath $dest) {
        Remove-Item -LiteralPath $dest -Recurse -Force
    }
    Copy-Item -LiteralPath $SkillDir -Destination $DestRoot -Recurse -Force
    Write-Host "copy  $name -> $dest"
    $script:Copied++
}

function Install-Into([string]$DestRoot) {
    foreach ($skill in Get-Skills) {
        Install-Skill -SkillDir $skill.FullName -DestRoot $DestRoot
    }
}

if (-not (Test-Path -LiteralPath $SkillRoot)) {
    Fail "skills directory not found: $SkillRoot"
}

if ($List) {
    Write-Host 'Skills:'
    foreach ($skill in Get-Skills) {
        Write-Host "  $($skill.Name)"
    }
    Write-Host ''
    Write-Host 'Targets:'
    foreach ($name in $Targets.Keys) {
        Write-Host "  $name -> $($Targets[$name])"
    }
    Write-Host '  custom -> pass -Dir <path>'
    exit 0
}

if (-not $Target -and -not $Dir) {
    Write-Host 'usage: install.ps1 <target> [-DryRun] [-Force] [-Dir <path>]'
    Write-Host '   or: install.ps1 -Dir <path> [-DryRun] [-Force]'
    Write-Host 'targets: claude, opencode, codex, cursor, agents, all'
    exit 1
}

if ($Target -and -not ($Targets.Keys -contains $Target)) {
    Fail "unknown target: $Target (expected claude, opencode, codex, cursor, agents, or all)"
}

if ($Dir) {
    Write-Host "source:      $SkillRoot"
    Write-Host "destination: $Dir"
    Write-Host ''
    Install-Into $Dir
}
elseif ($Target -eq 'all') {
    foreach ($name in $Targets.Keys) {
        Write-Host "== $name ($($Targets[$name]))"
        Install-Into $Targets[$name]
    }
}
else {
    Write-Host "source:      $SkillRoot"
    Write-Host "destination: $($Targets[$Target])"
    Write-Host ''
    Install-Into $Targets[$Target]
}

Write-Host ''
Write-Host "summary: copied=$Copied skipped=$Skipped"

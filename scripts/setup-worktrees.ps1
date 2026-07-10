# setup-worktrees.ps1
# Usage: .\scripts\setup-worktrees.ps1 [-Count 3] [-BaseDir "C:\worktrees"]
# Creates N git worktrees for parallel Claude agent development.
# Each worktree gets its own branch (feature/agent-N) and working directory.

param(
    [int]$Count = 3,
    [string]$BaseDir = "C:\Users\14277\Desktop\novel-writer-agents"
)

$repoRoot = Get-Location

# Ensure we're on master and up to date
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "master") {
    Write-Host "Warning: Not on master (currently on '$currentBranch'). Switching to master..." -ForegroundColor Yellow
    git checkout master
}
git pull origin master

# Create base directory
if (-not (Test-Path $BaseDir)) {
    New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null
}

Write-Host "`nSetting up $Count worktrees in $BaseDir`n" -ForegroundColor Cyan

for ($i = 1; $i -le $Count; $i++) {
    $branch = "feature/agent-$i"
    $worktreePath = Join-Path $BaseDir "agent-$i"

    # Remove existing worktree if present
    $existing = git worktree list | Select-String $worktreePath
    if ($existing) {
        Write-Host "  agent-$i : worktree exists, removing..." -ForegroundColor Yellow
        git worktree remove $worktreePath --force 2>$null
    }

    # Delete old branch if exists
    git branch -D $branch 2>$null

    # Create worktree with new branch from master
    Write-Host "  agent-$i : creating worktree + branch '$branch'..." -ForegroundColor Gray
    git worktree add -b $branch $worktreePath master

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  agent-$i : OK -> $worktreePath" -ForegroundColor Green
    } else {
        Write-Host "  agent-$i : FAILED" -ForegroundColor Red
    }
}

# Show results
Write-Host "`nWorktree setup complete:`n" -ForegroundColor Cyan
git worktree list

Write-Host "`nUsage:" -ForegroundColor Yellow
Write-Host "  1. Open a Claude Code window in each worktree directory"
Write-Host "  2. Each window works on its own branch (feature/agent-N)"
Write-Host "  3. When done, merge with: .\scripts\merge-to-master.ps1"
Write-Host "  4. Clean up with: .\scripts\clean-worktrees.ps1"

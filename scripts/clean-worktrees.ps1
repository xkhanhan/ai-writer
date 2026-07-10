# clean-worktrees.ps1
# Usage: .\scripts\clean-worktrees.ps1
# Removes all agent worktrees and their branches.
# Run after all agents have merged their work.

$repoRoot = Get-Location

Write-Host "Current worktrees:" -ForegroundColor Cyan
git worktree list

$worktrees = git worktree list | Select-String "novel-writer-agents"
if (-not $worktrees) {
    Write-Host "`nNo agent worktrees found. Nothing to clean." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nRemoving agent worktrees..." -ForegroundColor Yellow

# Parse and remove each worktree
git worktree list | ForEach-Object {
    if ($_ -match "(\S+)\s+\([a-f0-9]+\)$") {
        $path = $Matches[1]
        if ($path -like "*novel-writer-agents*") {
            $branch = (git -C $path rev-parse --abbrev-ref HEAD) 2>$null
            git worktree remove $path --force 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Removed: $path" -ForegroundColor Green
                if ($branch -and $branch -ne "HEAD") {
                    git branch -D $branch 2>$null
                    Write-Host "  Deleted branch: $branch" -ForegroundColor Gray
                }
            } else {
                Write-Host "  Failed to remove: $path" -ForegroundColor Red
            }
        }
    }
}

# Prune stale worktree references
git worktree prune

Write-Host "`nCleanup complete." -ForegroundColor Green
git worktree list

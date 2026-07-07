# merge-to-master.ps1
# Usage: .\scripts\merge-to-master.ps1
# Pushes current feature branch to remote master and syncs local master pointer.
# Run from the feature branch you want to merge.

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "master") {
    Write-Host "Already on master. Nothing to merge." -ForegroundColor Yellow
    exit 0
}

Write-Host "Merging '$branch' into master..." -ForegroundColor Cyan

# Push feature branch content to remote master
git push origin HEAD:master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed." -ForegroundColor Red
    exit 1
}

# Sync local master pointer to remote
git fetch origin
git update-ref refs/heads/master origin/master

Write-Host "Done! '$branch' merged to master." -ForegroundColor Green

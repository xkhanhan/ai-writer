# claim-task.ps1
# Atomic task claiming for multi-agent coordination.
# Uses New-Item -ErrorAction Stop for filesystem-level atomic lock.
#
# Usage:
#   .\scripts\claim-task.ps1 claim  G-001  claude-win-1
#   .\scripts\claim-task.ps1 status
#   .\scripts\claim-task.ps1 done   G-001
#   .\scripts\claim-task.ps1 clear  G-001
#   .\scripts\claim-task.ps1 reset

param(
    [Parameter(Position=0)]
    [ValidateSet("claim","status","done","clear","reset")]
    [string]$Action = "status",

    [Parameter(Position=1)]
    [string]$TaskId,

    [Parameter(Position=2)]
    [string]$Owner
)

$repoRoot = (Get-Location).Path
$claimsDir = Join-Path $repoRoot ".claims"

# Ensure claims directory exists
if (-not (Test-Path $claimsDir)) {
    New-Item -ItemType Directory -Path $claimsDir -Force | Out-Null
}

switch ($Action) {

    "claim" {
        if (-not $TaskId -or -not $Owner) {
            Write-Host "Usage: claim-task.ps1 claim <TASK-ID> <OWNER>" -ForegroundColor Yellow
            exit 1
        }

        $claimFile = Join-Path $claimsDir "$TaskId.claim"

        if (Test-Path $claimFile) {
            $existing = Get-Content $claimFile -Raw
            Write-Host "BLOCKED: $TaskId already claimed by $existing" -ForegroundColor Red
            Write-Host "Cannot claim a task that belongs to another agent." -ForegroundColor Red
            exit 1
        }

        # Atomic create — fails if file already exists (race-safe)
        try {
            New-Item -Path $claimFile -Value $Owner -ErrorAction Stop | Out-Null
            Write-Host "CLAIMED: $TaskId -> $Owner" -ForegroundColor Green
        } catch {
            # Lost the race — another agent claimed it first
            $existing = Get-Content $claimFile -Raw
            Write-Host "RACE LOST: $TaskId was claimed by $existing" -ForegroundColor Red
            Write-Host "Choose a different task." -ForegroundColor Yellow
            exit 1
        }
    }

    "status" {
        if (-not (Test-Path $claimsDir) -or (Get-ChildItem $claimsDir -Filter "*.claim" -ErrorAction SilentlyContinue).Count -eq 0) {
            Write-Host "No tasks claimed." -ForegroundColor Gray
        } else {
            Write-Host "`nActive claims:" -ForegroundColor Cyan
            Get-ChildItem $claimsDir -Filter "*.claim" | Sort-Object Name | ForEach-Object {
                $taskId = $_.BaseName -replace '\.claim$', ''
                $owner = Get-Content $_.FullName -Raw
                Write-Host "  $taskId  <-  $owner" -ForegroundColor White
            }
            Write-Host ""
        }
    }

    "done" {
        if (-not $TaskId) {
            Write-Host "Usage: claim-task.ps1 done <TASK-ID>" -ForegroundColor Yellow
            exit 1
        }

        $claimFile = Join-Path $claimsDir "$TaskId.claim"

        if (-not (Test-Path $claimFile)) {
            Write-Host "No claim found for $TaskId" -ForegroundColor Yellow
            exit 1
        }

        $owner = Get-Content $claimFile -Raw

        # Rename .claim -> .done
        $doneFile = Join-Path $claimsDir "$TaskId.done"
        Rename-Item $claimFile $doneFile
        Write-Host "COMPLETED: $TaskId (was: $owner)" -ForegroundColor Green
    }

    "clear" {
        if (-not $TaskId) {
            Write-Host "Usage: claim-task.ps1 clear <TASK-ID>" -ForegroundColor Yellow
            exit 1
        }

        $claimFile = Join-Path $claimsDir "$TaskId.claim"
        $doneFile = Join-Path $claimsDir "$TaskId.done"

        if (Test-Path $claimFile) {
            Remove-Item $claimFile
            Write-Host "CLEARED claim: $TaskId" -ForegroundColor Yellow
        } elseif (Test-Path $doneFile) {
            Remove-Item $doneFile
            Write-Host "CLEARED done: $TaskId" -ForegroundColor Yellow
        } else {
            Write-Host "No claim or done file for $TaskId" -ForegroundColor Gray
        }
    }

    "reset" {
        if (Test-Path $claimsDir) {
            $count = (Get-ChildItem $claimsDir -ErrorAction SilentlyContinue).Count
            Remove-Item "$claimsDir\*" -Force
            Write-Host "RESET: cleared $count claim files" -ForegroundColor Yellow
        }
    }
}

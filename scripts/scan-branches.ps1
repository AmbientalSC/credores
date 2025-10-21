# Scan all local and remote branches by creating temporary worktrees
# Outputs per-branch results to ./tmp-branch-scans/<branch>.txt

$pattern = 'SIENGE|SIENGE_USERNAME|SIENGE_PASSWORD|PRIVATE_KEY|client_email|service-account|service_account|PRIVATE_KEY_ID|SECRET|password|token|Authorization|apiKey|API_KEY'
$outDir = Join-Path (Resolve-Path '.') 'tmp-branch-scans'

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$branches = git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | Sort-Object -Unique | Where-Object { $_ -notmatch 'origin/HEAD' -and $_ -ne 'origin' }

foreach ($b in $branches) {
    $safeName = $b -replace '/', '__'
    Write-Host "Scanning $b -> $safeName"
    $wtPath = Join-Path (Resolve-Path '.') "tmp-wt-$safeName"

    if (Test-Path $wtPath) { Remove-Item $wtPath -Recurse -Force }

    # Try to create worktree for the branch/ref
    git worktree add -q $wtPath $b 2>$null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $wtPath)) {
        "WORKTREE_FAILED" | Out-File -FilePath (Join-Path $outDir "$safeName.txt") -Encoding utf8
        continue
    }

    # Run search
    try {
        $matches = Get-ChildItem -Path $wtPath -Recurse -File -ErrorAction SilentlyContinue | Select-String -Pattern $pattern -AllMatches
    }
    catch {
        $matches = $null
    }

    if ($matches) {
        $lines = $matches | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line.Trim())" }
        $lines | Out-File -FilePath (Join-Path $outDir "$safeName.txt") -Encoding utf8
    }
    else {
        "CLEAN" | Out-File -FilePath (Join-Path $outDir "$safeName.txt") -Encoding utf8
    }

    # Remove worktree
    git worktree remove -f $wtPath > $null 2>&1
}

Write-Host "Scan complete. Results in tmp-branch-scans"
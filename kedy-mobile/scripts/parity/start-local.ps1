$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $repoRoot)
$sourceRepo = Join-Path $workspaceRoot "Salonmanagementsaasapp"
$fallbackSourceRepo = Split-Path -Parent $repoRoot
if (-not (Test-Path (Join-Path $sourceRepo "package.json"))) {
  $sourceRepo = $fallbackSourceRepo
}
$logDir = Join-Path $repoRoot ".parity-logs\runtime"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Stop-PortProcess {
  param([int]$Port)
  $lines = netstat -ano | Select-String (":" + $Port + " ")
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    $pidValue = $parts[-1]
    if ($pidValue -match "^[0-9]+$") {
      try { Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
}

function Wait-HttpUp {
  param([string]$Url, [int]$Attempts = 60)
  for ($i = 0; $i -lt $Attempts; $i++) {
    Start-Sleep -Seconds 2
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($resp.StatusCode -ge 200) { return $true }
    } catch {}
  }
  return $false
}

Stop-PortProcess -Port 5173
Stop-PortProcess -Port 8082

$sourceProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- --host 127.0.0.1 --port 5173" -WorkingDirectory $sourceRepo -RedirectStandardOutput (Join-Path $logDir "source.out.log") -RedirectStandardError (Join-Path $logDir "source.err.log") -PassThru
$targetProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "set CI=1&& npm run web -- --port 8082" -WorkingDirectory $repoRoot -RedirectStandardOutput (Join-Path $logDir "target.out.log") -RedirectStandardError (Join-Path $logDir "target.err.log") -PassThru

$sourceUp = Wait-HttpUp -Url "http://127.0.0.1:5173/auth/login"
$targetUp = Wait-HttpUp -Url "http://127.0.0.1:8082/login"

if (-not $sourceUp -or -not $targetUp) {
  Write-Host "SOURCE_UP=$sourceUp"
  Write-Host "TARGET_UP=$targetUp"
  throw "Local parity servers did not become ready."
}

Write-Host "SOURCE_PID=$($sourceProc.Id)"
Write-Host "TARGET_PID=$($targetProc.Id)"
Write-Host "SOURCE_URL=http://127.0.0.1:5173"
Write-Host "TARGET_URL=http://127.0.0.1:8082"

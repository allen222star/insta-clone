$ErrorActionPreference = "SilentlyContinue"
$killed = @{}

function Stop-Tree([int]$ProcId) {
  if ($ProcId -le 0 -or $killed.ContainsKey($ProcId)) { return }
  $killed[$ProcId] = $true
  & taskkill.exe /PID $ProcId /T /F | Out-Null
}

function Stop-ListenPort([int]$Port) {
  $ids = @()
  Get-NetTCPConnection -LocalPort $Port -State Listen | ForEach-Object {
    $ids += $_.OwningProcess
  }
  if ($ids.Count -eq 0) {
    netstat -ano | ForEach-Object {
      if ($_ -match (":$Port\s+\S+\s+LISTENING\s+(\d+)")) {
        $ids += [int]$Matches[1]
      }
    }
  }
  foreach ($procId in ($ids | Select-Object -Unique)) {
    if ($procId -gt 0) {
      Write-Host "  port $Port  PID $procId"
      Stop-Tree $procId
    }
  }
}

Write-Host "==> Stopping Andygram clone"

Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and $_.CommandLine -match "scripts[\\/]dev\.mjs"
} | ForEach-Object {
  Write-Host ("  {0} PID {1}  (npm run dev)" -f $_.Name, $_.ProcessId)
  Stop-Tree $_.ProcessId
}

Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and $_.CommandLine -match "uvicorn" -and $_.CommandLine -match "app\.main:app"
} | ForEach-Object {
  Write-Host ("  {0} PID {1}  (API)" -f $_.Name, $_.ProcessId)
  Stop-Tree $_.ProcessId
}

Stop-ListenPort 8000
Stop-ListenPort 5173

Write-Host "Stopped.  API :8000  UI :5173"

$ErrorActionPreference = 'Stop'

$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$hostAddress = if ($env:HOST) { $env:HOST } else { '0.0.0.0' }

try {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $processIds) {
    if ($processId) {
      Write-Host "Encerrando processo na porta $port (PID $processId)..."
      Stop-Process -Id $processId -Force
    }
  }
} catch {
  Write-Host "Nenhum processo em execucao na porta $port."
}

Write-Host "Iniciando Portaria App em ${hostAddress}:${port}..."
node .\index.js

$ErrorActionPreference = 'Stop'

$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { 'postgres' }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'portaria' }

if (-not (Test-Path $psqlPath)) {
  throw "Nao encontrei o psql em '$psqlPath'. Ajuste o caminho no script init-db.ps1."
}

Write-Host "Criando banco '$dbName' se ainda nao existir..."
& $psqlPath -U $dbUser -tc "SELECT 1 FROM pg_database WHERE datname = '$dbName'" | ForEach-Object { $_.Trim() } | Tee-Object -Variable dbExists | Out-Null

if ($dbExists -ne '1') {
  & $psqlPath -U $dbUser -c "CREATE DATABASE $dbName;"
} else {
  Write-Host "Banco '$dbName' ja existe."
}

Write-Host "Aplicando schema em '$dbName'..."
& $psqlPath -U $dbUser -d $dbName -f .\schema.sql

Write-Host "Banco inicializado com sucesso."

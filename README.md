# Portaria App

Aplicacao completa com API em Express, PostgreSQL e painel web servido no navegador.

## Criar o banco no PostgreSQL

No PowerShell, execute:

```powershell
psql -U postgres -c "CREATE DATABASE portaria;"
```

Se o `psql` nao estiver no `PATH`, use o executavel do PostgreSQL, por exemplo:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE portaria;"
```

## Importar as tabelas

Com o banco criado, rode:

```powershell
psql -U postgres -d portaria -f .\schema.sql
```

Ou, se precisar do caminho completo do executavel:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d portaria -f .\schema.sql
```

O schema agora usa `IF NOT EXISTS`, entao pode ser executado novamente sem recriar as tabelas ja existentes.

## Configurar a conexao do backend

O arquivo [`db.js`](C:\Users\NITRO 5\portaria-app\backend\db.js) usa estes valores por padrao:

- `DB_USER=postgres`
- `DB_HOST=localhost`
- `DB_NAME=portaria`
- `DB_PASSWORD=sua_senha`
- `DB_PORT=5432`
- `PORT=3000`

Voce pode usar o arquivo [` .env.example `](C:\Users\NITRO 5\portaria-app\backend\.env.example) como referencia e definir as variaveis no PowerShell antes de iniciar:

```powershell
$env:DB_PASSWORD="sua_senha_real"
$env:PORT="3000"
```

## Rodar o projeto

Modo normal:

```powershell
npm start
```

Modo desenvolvimento com reinicio automatico:

```powershell
npm run dev
```

Modo watch nativo do Node:

```powershell
npm run dev:watch
```

Depois, abra:

```text
http://localhost:3000
```

## Funcionalidades prontas

- cadastro e listagem de moradores
- cadastro e listagem de visitantes com autorizacao por morador
- cadastro e listagem de encomendas
- atualizacao do status das encomendas
- endpoint de saude em `/api/health`

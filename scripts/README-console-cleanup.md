# 🧹 Script de Limpeza de Console Logs

## Como usar:

```bash
# 1. Instalar dependências
npm install -D glob

# 2. Executar em modo dry-run (recomendado primeiro)
node scripts/cleanup-console-logs.js --dry-run --verbose

# 3. Executar limpeza real
node scripts/cleanup-console-logs.js

# 4. Verificar resultado
npm run lint
```

## Configurações:

- **--dry-run**: Mostra o que seria removido sem fazer mudanças
- **--verbose**: Mostra cada log sendo processado
- **Arquivos excluídos**: debug/, qa-dashboard.jsx, arquivos de teste

## Logs que serão mantidos:

- Logs com prefixos estruturados: `[SessionManager]`, `[AuthGuard]`
- Logs de erro críticos: `ERROR:`, `CRITICAL:`, `SECURITY:`
- Logs em arquivos de debug e teste

## Backup automático:

- Backup criado em `./backups/console-cleanup-TIMESTAMP/`
- Pode restaurar se necessário


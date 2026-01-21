# 🚀 Queries Rápidas - Guia de Uso

## 📋 Scripts Disponíveis

### 1. Ver todas as queries disponíveis
```bash
bun run db:queries
```
Mostra 10 queries SQL seguras para copiar e colar.

### 2. Executar query específica (mostra para copiar)
```bash
# Verificar timezone
bun run db:query:timezone

# Verificar real-time
bun run db:query:realtime

# Ver estatísticas
bun run db:query:stats
```

### 3. Executar query customizada
```bash
bun run db:sql --query "SELECT * FROM bookings LIMIT 5"
bun run db:sql scripts/query-timezone-check.sql
```

---

## 🔧 Executar Diretamente via CLI (Requer psql)

Para executar queries diretamente sem copiar/colar, você precisa:

1. **Instalar PostgreSQL** (inclui psql):
   - Windows: https://www.postgresql.org/download/windows/
   - Ou via Chocolatey: `choco install postgresql`

2. **Configurar senha do banco no .env.local**:
   ```env
   SUPABASE_DB_PASSWORD=sua_senha_do_banco
   ```

3. **Obter a senha do banco**:
   - Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
   - Vá em: Settings → Database → Database Password
   - Se não souber, pode resetar a senha

4. **Executar query**:
   ```bash
   bun run db:sql scripts/query-timezone-check.sql
   ```

---

## 📝 Queries Disponíveis

### `scripts/query-timezone-check.sql`
Verifica se as reservas estão salvas com timezone correto.

### `scripts/query-realtime-check.sql`
Verifica se as tabelas estão na publicação `supabase_realtime`.

### `scripts/query-stats.sql`
Estatísticas de reservas dos últimos 7 dias.

---

## ⚠️ Segurança

- ✅ Todos os scripts validam que são apenas SELECT
- ✅ Nenhum comando destrutivo é permitido
- ✅ Comentários SQL são ignorados na validação
- ❌ NUNCA execute DROP, DELETE, TRUNCATE, RESET

---

## 💡 Alternativa Rápida

Se não quiser instalar psql, use o SQL Editor do Supabase:
1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
2. Vá em: SQL Editor → New Query
3. Execute: `bun run db:query:timezone` para ver a query
4. Copie e cole no SQL Editor
5. Execute (Run)

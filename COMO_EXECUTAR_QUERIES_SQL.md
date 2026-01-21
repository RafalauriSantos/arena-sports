# 🔍 Como Executar Queries SQL - Guia Rápido

## ✅ OPÇÃO 1: Via SQL Editor (Recomendado - Mais Fácil)

### Passo 1: Executar script para ver queries
```bash
bun run db:queries
```

### Passo 2: Copiar query desejada
O script vai mostrar várias queries. Escolha uma e copie o SQL.

### Passo 3: Executar no Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Cole a query copiada
5. Clique em **Run** (ou F5)

---

## ✅ OPÇÃO 2: Queries Individuais

### Ver query de timezone:
```bash
bun run db:query:timezone
```
Depois copie e cole no SQL Editor.

### Ver query de real-time:
```bash
bun run db:query:realtime
```

### Ver query de estatísticas:
```bash
bun run db:query:stats
```

---

## ✅ OPÇÃO 3: Executar Diretamente via CLI (Avançado)

**Requisitos:**
- PostgreSQL instalado (para ter `psql`)
- Senha do banco de dados

### Passo 1: Adicionar senha no .env.local
Crie/edite o arquivo `.env.local` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://extkyeckajhcozjervyr.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_service_key
SUPABASE_DB_PASSWORD=sua_senha_do_banco_aqui
```

**Onde encontrar a senha:**
1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
2. Vá em **Settings → Database**
3. Role até **Connection string** → **URI**
4. A senha está na connection string: `postgresql://postgres.[PROJECT_REF]:[SENHA]@...`

### Passo 2: Verificar se psql está instalado
```bash
psql --version
```

Se não estiver instalado:
- **Windows:** Baixe PostgreSQL: https://www.postgresql.org/download/windows/
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt install postgresql-client`

### Passo 3: Executar query
```bash
# Executar query de timezone
bun run db:sql scripts/query-timezone-check.sql

# Executar query de real-time
bun run db:sql scripts/query-realtime-check.sql

# Executar query de estatísticas
bun run db:sql scripts/query-stats.sql

# Executar query customizada
bun run db:sql --query "SELECT * FROM bookings LIMIT 5"
```

---

## 📋 QUERIES DISPONÍVEIS

### 1. Verificar Timezone
**Arquivo:** `scripts/query-timezone-check.sql`
**O que faz:** Mostra as reservas dos últimos 7 dias com hora convertida para Brasil

### 2. Verificar Real-time
**Arquivo:** `scripts/query-realtime-check.sql`
**O que faz:** Verifica se as tabelas estão na publicação `supabase_realtime`

### 3. Estatísticas de Reservas
**Arquivo:** `scripts/query-stats.sql`
**O que faz:** Mostra estatísticas dos últimos 7 dias (total, finalizadas, em andamento, etc)

---

## 🎯 EXEMPLO PRÁTICO

### Testar timezone das reservas:

1. **Execute:**
   ```bash
   bun run db:query:timezone
   ```

2. **Copie o SQL que aparecer**

3. **Cole no SQL Editor do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
   - SQL Editor → New Query
   - Cole e execute

4. **Verifique os resultados:**
   - A coluna `hora_brasil` deve mostrar o horário correto
   - A coluna `hora` deve mostrar a hora (0-23)
   - A coluna `minuto` deve mostrar os minutos (0-59)

---

## ⚠️ IMPORTANTE

- **Todas as queries são apenas SELECT** - não alteram dados
- **Nenhum comando destrutivo** (DROP, DELETE, TRUNCATE, etc)
- **Seguro para executar** quantas vezes quiser

---

## 🐛 PROBLEMAS COMUNS

### "psql não encontrado"
**Solução:** Instale PostgreSQL ou use a Opção 1 (SQL Editor)

### "SUPABASE_DB_PASSWORD não configurado"
**Solução:** Adicione no `.env.local` ou use a Opção 1 (SQL Editor)

### "Query não retorna resultados"
**Solução:** Verifique se há dados no banco. Tente uma query mais simples primeiro:
```sql
SELECT COUNT(*) FROM bookings;
```

---

**Dúvidas? Execute `bun run db:queries` e copie as queries para o SQL Editor!** 🚀

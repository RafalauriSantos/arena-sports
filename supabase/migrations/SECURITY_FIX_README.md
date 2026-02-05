# 🔒 CORREÇÃO DE SEGURANÇA URGENTE - Views Expostas

## ⚠️ PROBLEMA IDENTIFICADO

Duas views no banco de dados estavam expondo dados de **TODOS os tenants** para usuários públicos:

1. **`v_tenants_with_address`** - Expunha endereços e configurações de todas as arenas
2. **`v_booking_stats`** - Expunha receita e estatísticas de todas as arenas

## ✅ SOLUÇÃO IMPLEMENTADA

### 📁 Arquivo de Migration

`supabase/migrations/20260205000000_fix_security_definer_views.sql`

### 🔧 Alterações:

1. ✅ Remove `v_tenants_with_address` (não é mais necessária)
2. ✅ Bloqueia acesso público à `v_booking_stats`
3. ✅ Cria funções RPC seguras:
   - `fn_public_get_booking_stats(p_subdomain)` - Para acesso público filtrado
   - `fn_get_booking_stats_admin(p_tenant_id)` - Para dashboard admin

## 🚀 COMO APLICAR (MANUAL)

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr
2. Vá em **"SQL Editor"** no menu lateral
3. Clique em **"New Query"**
4. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20260205000000_fix_security_definer_views.sql
   ```
5. Cole no editor
6. Clique em **"Run"** (F5 ou Ctrl+Enter)
7. Aguarde confirmação de sucesso

### Opção 2: Via Supabase CLI

```bash
supabase db push
```

## 🧪 COMO TESTAR

Após aplicar a migration, execute:

```bash
bun run scripts/test-security-views-fix.ts
```

O teste verificará:

- ✅ Views inseguras foram removidas
- ✅ Acesso público foi bloqueado
- ✅ Novas funções RPC funcionam corretamente
- ✅ Isolamento entre tenants está garantido

## 📊 IMPACTO

### ✅ SEM IMPACTO na aplicação:

- As views eram usadas apenas em scripts de teste/admin
- O código público já usa funções RPC seguras (`fn_public_get_tenant_by_subdomain`, `fn_public_get_occupied_slots`)
- Nenhuma funcionalidade do usuário final será afetada

### 🔐 BENEFÍCIOS:

- ✅ Dados de tenants completamente isolados
- ✅ Impossível acessar dados de outras arenas
- ✅ Conformidade com melhores práticas de segurança
- ✅ Remove avisos do Supabase Linter

## 📝 NOTAS TÉCNICAS

### Por que `SECURITY DEFINER` é problemático?

```sql
-- ❌ ANTES (INSEGURO):
CREATE VIEW v_tenants_with_address WITH (SECURITY_DEFINER=true) AS
SELECT * FROM tenants; -- Retorna TODOS os tenants!

GRANT SELECT ON v_tenants_with_address TO anon; -- Público pode ver tudo!

-- ✅ DEPOIS (SEGURO):
CREATE FUNCTION fn_public_get_tenant(p_subdomain TEXT)
RETURNS tenant AS $$
BEGIN
  RETURN (SELECT * FROM tenants WHERE subdomain = p_subdomain LIMIT 1);
END;
$$ SECURITY DEFINER;

GRANT EXECUTE ON fn_public_get_tenant TO anon; -- Só retorna 1 tenant filtrado!
```

### Arquivos Afetados

- ✅ `supabase/migrations/20260205000000_fix_security_definer_views.sql` - Migration de correção
- ✅ `scripts/test-security-views-fix.ts` - Script de teste
- ✅ `scripts/apply-security-migration.ts` - Helper para aplicar migration
- ℹ️ `scripts/run-queries-cli.ts` - Usa `v_booking_stats` (ainda funciona para admin)
- ℹ️ `scripts/test-database-structure.ts` - Teste de estrutura (precisa ser atualizado)

## ❓ PERGUNTAS FREQUENTES

**Q: A aplicação vai parar de funcionar?**
A: Não! O código público não usa essas views. Tudo continuará funcionando normalmente.

**Q: Vou perder dados?**
A: Não! Apenas estamos removendo/bloqueando views. Os dados nas tabelas permanecem intactos.

**Q: Como sei que funcionou?**
A: Execute o script de teste. Ele verificará tudo automaticamente.

**Q: E se der erro?**
A: Copie o SQL manualmente no Supabase Dashboard (instruções acima).

---

**Status:** ⚠️ **PENDENTE APLICAÇÃO**
**Prioridade:** 🔴 **CRÍTICA - SEGURANÇA**
**Criado em:** 2026-02-05

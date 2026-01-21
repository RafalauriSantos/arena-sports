# 📱 Aplicar Migration: Campos de Contato WhatsApp

## 🎯 O que essa migration faz?

Adiciona campos essenciais na tabela `tenants` para armazenar informações de contato do admin/dono da arena:

- ✅ **phone** - Telefone/WhatsApp (usado para notificações)
- ✅ **email** - E-mail de contato
- ✅ **description** - Descrição da arena
- ✅ **settings** - Configurações em JSON

---

## 🚀 OPÇÃO 1: Via Dashboard do Supabase (RECOMENDADO)

### Passo a Passo:

1. **Acesse o Dashboard:**
   - Vá em: https://supabase.com/dashboard
   - Selecione seu projeto: **arena-sports**

2. **Abra o SQL Editor:**
   - Menu lateral → **SQL Editor**
   - Clique em **New Query**

3. **Cole a Migration:**
   - Abra o arquivo: `supabase/migrations/20260120000001_add_contact_fields_to_tenants.sql`
   - Copie **TODO** o conteúdo
   - Cole no editor SQL

4. **Execute:**
   - Clique em **Run** (ou `Ctrl + Enter`)
   - Aguarde a mensagem de sucesso ✅

5. **Verifique:**
   ```sql
   SELECT phone, email, description, settings 
   FROM tenants 
   LIMIT 1;
   ```

---

## 🚀 OPÇÃO 2: Via Script TypeScript

```bash
# Se você tem as variáveis de ambiente configuradas
bun run scripts/apply-migration-contact-fields.ts
```

**Requisitos:**
- Variáveis de ambiente configuradas:
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 OPÇÃO 3: Via Supabase CLI (se instalado)

```bash
# Se você tem o Supabase CLI instalado
npx supabase db push

# OU
bunx supabase db push
```

---

## ✅ Como Testar Após Aplicar

1. **Acesse o Dashboard do sistema:**
   - Faça login na sua arena
   - Vá em **Configurações → Arena**

2. **Preencha os campos:**
   - **WhatsApp:** Ex: `11999887766`
   - **E-mail:** Ex: `contato@minharena.com`
   - **Descrição:** Ex: `Arena com 4 quadras de futebol society`

3. **Salve as configurações:**
   - Clique em **Salvar Configurações**
   - Aguarde a mensagem de sucesso

4. **Verifique o calendário público:**
   - Acesse: `/agendar/seu-subdomain`
   - O telefone deve aparecer para contato
   - A descrição deve ser exibida

---

## 🔍 Verificar se Funcionou

Execute no SQL Editor do Supabase:

```sql
-- Ver estrutura da tabela tenants
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('phone', 'email', 'description', 'settings');
```

**Resultado esperado:**
```
column_name  | data_type | is_nullable
-------------+-----------+-------------
phone        | text      | YES
email        | text      | YES
description  | text      | YES
settings     | jsonb     | YES
```

---

## 📋 Conteúdo da Migration

Arquivo: `supabase/migrations/20260120000001_add_contact_fields_to_tenants.sql`

```sql
-- Adiciona colunas
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Validações
ALTER TABLE public.tenants
  ADD CONSTRAINT check_phone_format CHECK (
    phone IS NULL OR phone ~ '^[0-9]{10,13}$'
  );

ALTER TABLE public.tenants
  ADD CONSTRAINT check_email_format CHECK (
    email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
```

---

## 🐛 Problemas Comuns

### "Migration já foi aplicada"
Se você ver esse erro, significa que a migration já foi executada. Tudo certo! ✅

### "Permissão negada"
Use a **Service Role Key** (chave de serviço), não a **Anon Key**.

### "Coluna já existe"
Tudo certo! A migration usa `IF NOT EXISTS` para evitar erros.

---

## 🎯 Próximo Passo

Após aplicar a migration, você pode testar o fluxo completo de WhatsApp:

1. ✅ Preencher telefone nas configurações
2. ✅ Cliente faz agendamento via link público
3. ✅ Admin recebe notificação via WhatsApp (futura implementação)

**Quer que eu implemente a notificação automática via WhatsApp?** 🚀

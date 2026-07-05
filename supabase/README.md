# Supabase (infra as code)

Este diretório existe para **versionar o banco** (schema, funções, triggers, policies/RLS e seeds) no repositório.

> Objetivo: qualquer pessoa do time consegue reproduzir o banco local/staging a partir do Git, com o mínimo de “config tribal”.

## Estrutura

- `migrations/` — migrations SQL versionadas (geradas pelo Supabase CLI)
- `seed.sql` — dados mínimos para dev/staging (opcional)

## Checklist de adoção (sem mudar produção)

### 1) Instalar / usar Supabase CLI

Você pode usar:

- `supabase` (binário instalado), ou
- `npx supabase` (npm)

### 2) Inicializar e linkar (uma vez por repo)

1. `supabase init`
2. `supabase login`
3. `supabase link --project-ref <PROJECT_REF>`

> O `PROJECT_REF` vem da URL do projeto Supabase.

### 3) Gerar baseline do schema atual (migrations)

- `supabase db pull`

Isso cria migrations dentro de `supabase/migrations/`. Commitar essas migrations resolve o gap “infra não versionada”.

### 4) Trabalhar local com banco (opcional, mas recomendado)

- `supabase start`
- `supabase status`

Use os valores retornados para configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para o ambiente local.

### 5) RLS / Policies (prioridade P0 para multi-tenant)

Recomendação de padrão (alto nível):

- Todas as tabelas com `tenant_id`: **RLS ON**
- Toda policy valida **membership do usuário no tenant** (não só `tenant_id` no payload)

Checklist de policies (modelo sugerido):

- [ ] Criar tabela de membership (ex.: `tenant_members`) com `tenant_id`, `user_id`, `role`
- [ ] Policy SELECT/INSERT/UPDATE/DELETE em tabelas de domínio usando membership
- [ ] Policy em `profiles`: usuário só lê/edita seu próprio profile
- [ ] Storage: policies por tenant e/ou signed URLs (evitar `publicUrl` para dados sensíveis)

## Convenções sugeridas

- **Uma fonte de verdade** para reservas: decidir entre `bookings` vs `arena_reservations/arena_time_slots`
- Índices multi-tenant: `(tenant_id, date)` / `(tenant_id, start_time)` nas tabelas de alto volume
- Não depender de filtros no client como barreira de segurança

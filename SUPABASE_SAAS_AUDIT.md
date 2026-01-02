# Supabase + SaaS Multi-tenant (B2B) — Auditoria do Projeto Arena Sports

Data: 2026-01-01  
Escopo: integração Supabase (Auth/DB/Storage/Realtime/RPC) + arquitetura SaaS multi-tenant (B2B).

---

## 1) TL;DR (o estado atual)

O projeto **já está conectado ao Supabase** de forma funcional para:

- autenticação (email/senha),
- leitura/escrita em tabelas com `tenant_id` (multi-tenant “por coluna”),
- onboarding via `rpc(fn_onboard_user)`,
- Storage (bucket `avatars`),
- Realtime (dashboard metrics via `postgres_changes`).

Os **maiores gaps** para SaaS multi-tenant B2B (seguro e escalável) são:

- **Ausência de artefatos de infra** no repo (migrations, policies, schema versionado, seeds);
- **RLS não verificável pelo código** (e o código assume que filtrar por `tenant_id` no client é suficiente);
- **RBAC/permissions de admin x staff x owner não aparece como camada** (apenas `tenant_id`);
- **Inconsistência de modelagem**: coexistem tabelas `bookings`/`courts` e também `arena_reservations`/`arena_time_slots`.

---

## 2) Onde o Supabase está bem integrado (com evidência)

### 2.1 Supabase client (base)

- ✅ Cliente único e reutilizado: `createClient` em `src/lib/supabaseClient.ts`
- ✅ Variáveis de ambiente via Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- ⚠️ Cliente **não tipado** (não usa `createClient<Database>()`), reduz segurança de tipos.

### 2.2 Auth + sessão + perfil + tenant

- ✅ Contexto de auth centraliza sessão e perfil: `src/contexts/AuthContext.tsx`
- ✅ Resolve tenant via `profiles.tenant_id` e valida existência em `tenants`
- ✅ Onboarding automático via RPC `fn_onboard_user` (bom padrão para centralizar lógica no DB)

Pontos de atenção:

- ⚠️ Onboarding automático ocorre quando `profile.tenant_id` está vazio. Em B2B multi-tenant, isso pode gerar tenants “fantasmas” se o usuário logar errado/sem convite.
- ⚠️ O contexto busca profile/tenant no client; sem RLS forte, isso vira vetor de vazamento.

### 2.3 Operações de negócio (DB)

- ✅ Agenda interna (admin) com CRUD em `bookings` e leitura de `courts`: `src/contexts/BookingsContext.tsx`
  - bom uso de `Promise.all` e transformação para tipos de UI
  - já existe cuidado com performance (set/lookup para slots)
- ✅ Configurações por tenant (JSON settings + tabelas por tenant): `src/hooks/useSettings.ts`
  - usa `tenants.settings.booking` para regras financeiras
  - CRUD em `courts`, `promotion_rules`, `tenant_subscriptions`
- ✅ Página pública resolve tenant por `subdomain` e usa `tenant.settings` para regras: `src/pages/BookingPublic.tsx`

### 2.4 RPC (procedures no banco)

- ✅ `fn_onboard_user` é chamado em:
  - `src/contexts/AuthContext.tsx`
  - `src/pages/Login.tsx`

Isso é **positivo**, porque:

- mantém a lógica de criação de tenant/profile do lado do banco,
- reduz duplicação no client.

### 2.5 Storage

- ✅ Upload de avatar com Supabase Storage: `src/components/admin/AvatarUpload.tsx`

Pontos de atenção:

- ⚠️ `getPublicUrl()` implica bucket/objeto público (ou permissões relaxadas). Para B2B, normalmente preferível **signed URLs** ou políticas por tenant.
- ⚠️ Caminho do arquivo é `user.id/...` (ok), mas não há “pasta por tenant”. Se o mesmo usuário puder pertencer a múltiplos tenants no futuro, isso precisa ser repensado.

### 2.6 Realtime

- ✅ Realtime para métricas do dashboard: `src/components/admin/useDashboardMetrics.ts`
  - `postgres_changes` com `filter: tenant_id=eq.${tenantId}`
  - faz refresh das métricas ao receber eventos

---

## 3) Multi-tenancy (B2B) — como está implementado hoje

### Modelo atual (inferido pelo código)

- `profiles` contém `tenant_id`
- tabelas de domínio (ex.: `courts`, `bookings`, `promotion_rules`, `tenant_subscriptions`) usam coluna `tenant_id`
- página pública resolve `tenant` por `tenants.subdomain`

Isso é o padrão **“single database + tenant_id”**.

### O que está bom

- ✅ `tenant_id` aparece consistentemente em consultas críticas (filtros e inserts)
- ✅ Configurações por tenant são armazenadas em `tenants.settings` (JSON) — bom para feature flags e regras flexíveis

### Onde falta robustez (para B2B real)

- ❌ Não há camada explícita de **membership**:
  - faltam sinais de tabelas/fluxos como `tenant_members`, `roles`, `invites`.
  - hoje parece 1 usuário → 1 tenant.
- ❌ Não há RBAC visível:
  - owner/admin/staff/read-only, permissões de faturamento, etc.

---

## 4) Lacunas importantes (o que está faltando para ficar “pronto pra SaaS”)

### 4.1 RLS (Row Level Security) e policies

- ❌ Não há no repo migrations/policies/SQL versionado
- ❌ O client faz `.eq('tenant_id', tenantId)` — isso **não substitui RLS**

Recomendação (padrão):

- Ativar RLS em todas as tabelas multi-tenant
- Policies baseadas em:
  - `auth.uid()`
  - membership do usuário no tenant
  - (opcional) claims JWT customizadas

### 4.2 Infra “como código” (migrations)

- ✅ Pasta `supabase/` criada (scaffold para migrations/seeds)
- ❌ Ainda faltam migrations reais (baseline do schema via Supabase CLI)

Risco:

- schema/policies ficam “tribais” (difíceis de reproduzir, auditar e versionar)

### 4.3 Inconsistência de schema/domínio

- ⚠️ Existem **dois conjuntos** de tabelas/fluxos:
  - `bookings` + `courts` (usado no BookingsContext)
  - `arena_reservations` + `arena_time_slots` (usado nas métricas do admin)

Isso geralmente indica:

- refactor incompleto,
- migração de schema não finalizada,
- risco de dados divergentes.

### 4.4 Camada server-side (operações privilegiadas)

- ❌ Não há Edge Functions/Server API no repo

Em SaaS B2B, normalmente você precisa de server-side para:

- billing (Stripe/webhooks),
- jobs/rotinas (ex.: gerar slots, consolidar métricas),
- automações (WhatsApp/Email),
- operações com **service role** (nunca no client).

### 4.5 Observabilidade e auditoria

- ⚠️ Existe tabela `arena_events` nos tipos, mas não há evidência no client de uso como audit log
- ❌ Falta trilha clara de eventos por tenant (criação/alteração/cancelamento etc.)

### 4.6 Tipagem end-to-end

- ⚠️ Existe `Database` em `src/components/admin/database.types.ts`, mas o client Supabase é “untyped”
- ⚠️ Vários pontos usam `any`/`select('*')` (mais propenso a quebra silenciosa)

### 4.7 Segurança de config/segredos

- ✅ `.gitignore` ignora `.env*` e permite `.env.example`
- ✅ `.env.local` **não está rastreado** pelo git (checado via `git ls-files .env.local`)
- ⚠️ Mesmo não rastreado, se chaves já foram compartilhadas/printadas, vale rotacionar

---

## 5) Checklist (marque conforme você evoluir)

### A) Base Supabase

- [x] Cliente Supabase centralizado (`src/lib/supabaseClient.ts`)
- [x] Auth session persistida + refresh token
- [ ] Cliente Supabase tipado (`createClient<Database>()`) e tipos fora de `components/`
- [ ] Padronizar camada de acesso a dados (services/hooks) para não espalhar `.from()` por toda UI

### B) Auth (B2B)

- [x] Login por email/senha
- [x] Perfil em `profiles`
- [x] Tenant resolvido por `profiles.tenant_id`
- [ ] Membership (muitos usuários por tenant): `tenant_members` + roles
- [ ] Convites (invite flow) e troca de tenant (switch)
- [ ] Separar “criar tenant” (owner) vs “entrar por convite” (staff)

### C) Segurança (P0)

- [ ] RLS habilitado em todas as tabelas multi-tenant
- [ ] Policies por membership + tenant
- [ ] Storage policies por tenant (ou signed URLs)
- [ ] Garantir que toda escrita valida tenant no server-side (RPC/Edge Function)

### D) Banco / Migrations (P0)

- [x] Pasta `supabase/` (scaffold) com `migrations/` e `seed.sql`
- [ ] Gerar baseline de migrations do banco atual (`supabase db pull`) e commitar
- [ ] Seeds para dev/staging
- [ ] Documentar schema e decisões de modelagem

### E) Modelagem de reservas (consistência)

- [ ] Decidir 1 fonte de verdade:
  - ou `bookings`
  - ou `arena_reservations/arena_time_slots`
- [ ] Remover/arquivar tabelas antigas ou criar migration de convergência
- [ ] Garantir integridade (FKs, constraints, índices por `tenant_id` + data)

### F) Realtime

- [x] Realtime para métricas (filtrado por tenant)
- [ ] Validar RLS/Reatime policies (Realtime respeita RLS, mas precisa estar correto)
- [ ] Considerar canais por tenant (melhor isolamento e debug)

### G) Billing (SaaS)

- [x] Tabela/estrutura aparente `tenant_subscriptions` (lida no client)
- [ ] Integração real com provedor (Stripe/Pagar.me/etc.)
- [ ] Webhooks + Edge Functions
- [ ] Portal de cobrança, upgrades/downgrades e trial expiração

### H) Observabilidade / Auditoria

- [ ] Registrar eventos críticos por tenant (`arena_events` ou equivalente)
- [ ] Dashboard de auditoria / logs internos para suporte

---

## 6) Recomendações priorizadas

### P0 (faça primeiro)

1. Versionar schema/policies (migrations) e ativar RLS
2. Definir modelo de membership + roles
3. Resolver a inconsistência `bookings` vs `arena_reservations`

### P1

1. Tipar Supabase client end-to-end
2. Centralizar queries em “services” (menos repetição e menos bugs)
3. Storage com regras por tenant (evitar `publicUrl` para dados sensíveis)

### P2

1. Billing completo (webhooks + portal)
2. Auditoria de eventos e observabilidade

---

## 7) Arquivos-chave (para navegação rápida)

- `src/lib/supabaseClient.ts`
- `src/contexts/AuthContext.tsx`
- `src/contexts/BookingsContext.tsx`
- `src/hooks/useSettings.ts`
- `src/pages/BookingPublic.tsx`
- `src/pages/Login.tsx`
- `src/components/admin/useDashboardMetrics.ts`
- `src/components/admin/AvatarUpload.tsx`
- `src/components/admin/database.types.ts`

---

## 8) Scaffold criado: `supabase/` (migrations + RLS/policies)

### O que foi adicionado no repo

- `supabase/README.md` — guia de adoção (CLI + checklist)
- `supabase/migrations/.gitkeep` — mantém a pasta no git
- `supabase/seed.sql` — placeholder para seed de dev/staging

### Próximos passos (recomendado)

1. **Gerar baseline do schema atual**

- [ ] Rodar `supabase init` (se ainda não existir config do CLI)
- [ ] Rodar `supabase login`
- [ ] Rodar `supabase link --project-ref <PROJECT_REF>`
- [ ] Rodar `supabase db pull`

2. **RLS (P0) — tornar o multi-tenant seguro**

- [ ] Introduzir membership (`tenant_members`) para permitir múltiplos usuários por tenant
- [ ] Ativar RLS nas tabelas multi-tenant e criar policies baseadas em membership
- [ ] Revisar Storage (evitar `publicUrl` para dados privados; preferir policies/signed URLs)

3. **Convergir schema de reservas**

- [ ] Definir a fonte de verdade (`bookings` vs `arena_reservations/arena_time_slots`)
- [ ] Criar migrations de migração/compatibilidade e remover divergências

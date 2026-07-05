# Auditoria de Segurança RLS e Multi-tenancy

Data: 2026-07-05  
Escopo: Supabase/Postgres, Row Level Security, isolamento entre tenants, RPCs, views e Storage.

## Veredito

GO para produção no escopo de isolamento multi-tenant/RLS.

O teste automatizado `npm run test:rls` executa contra o Supabase configurado no ambiente local, cria dois tenants temporários, autentica um usuário real, tenta acessos cruzados e remove os dados ao final.

## Evidências executadas

- Catalogo Postgres: todas as tabelas de `public` e `storage` auditadas por `pg_class`, `pg_policies`, `pg_proc` e `information_schema.views`.
- RLS: todas as tabelas retornadas em `public` e `storage` estão com RLS habilitado.
- Tabelas sem policy: `public.arena_closures` tem RLS habilitado e nenhuma policy de usuário; não possui rota/grant público identificado nesta auditoria.
- Views públicas: `public_bookings_view`, `public_courts_view` e `trial_ab_analytics` sem `SELECT` para `anon/authenticated`; `v_booking_stats` mantém `authenticated`, mas foi testada contra vazamento cross-tenant.
- Storage: bucket `avatars` não permite listagem pública.
- Service role: uso encontrado apenas em scripts, CI e Supabase Edge Functions; nenhum uso em `src/`.

## Riscos encontrados e correções

### Crítico

1. `profiles.tenant_id` podia ser alterado pelo próprio usuário.
   - Risco: várias policies dependem do `tenant_id` do perfil; trocar esse campo permitiria acesso a outro tenant.
   - Correção: trigger `fn_protect_profile_security_fields` bloqueia alteração client-side de `tenant_id` e `is_super_admin`; `AuthContext` também remove esses campos antes de update.
   - Evidência: teste bloqueia troca de `profiles.tenant_id` e escalada de `profiles.is_super_admin`.

2. RPCs `fn_start_booking`, `fn_complete_booking` e `fn_cancel_booking` eram `SECURITY DEFINER` e operavam por `booking_id`.
   - Risco: usuário autenticado poderia tentar executar ação em reserva de outro tenant se conhecesse o ID.
   - Correção: cada RPC agora exige `check_tenant_access(tenant_id)` no `UPDATE`.
   - Evidência: teste chama as RPCs contra booking de outro tenant e recebe acesso negado.

3. RPC `fn_get_booking_stats_admin(p_tenant_id)` aceitava `tenant_id` arbitrário.
   - Risco: vazamento agregado de outro tenant.
   - Correção: valida `check_tenant_access(p_tenant_id)` antes de retornar dados.
   - Evidência: teste bloqueia stats do tenant B e permite stats do tenant A.

4. Views legadas de dados públicos podiam virar rota alternativa.
   - Risco: `public_bookings_view` e `public_courts_view` expunham modelos fora do fluxo RPC.
   - Correção: revogados grants para `anon/authenticated`.
   - Evidência: teste recebe `permission denied` nas duas views.

### Alto

1. `create_profile_if_missing(p_user_id, p_email)` permitia criar perfil para outro usuário.
   - Correção: RPC exige `auth.uid() = p_user_id`.

2. Grants amplos de `EXECUTE` em funções `SECURITY DEFINER`.
   - Correção: revogados grants amplos e reaberto apenas o conjunto intencional de RPCs.

3. Storage `avatars` permitia listagem pública.
   - Correção: removida policy pública de listagem em `storage.objects`.
   - Evidência: teste confirma que `anon.storage.from("avatars").list()` não retorna objetos.

### Médio

1. Leitura direta pública de `courts`.
   - Risco: enumeração de quadras/IDs por tabela.
   - Correção: removida policy pública direta e criada `fn_public_get_courts_by_subdomain(p_subdomain)` com retorno limitado.
   - Evidência: teste bloqueia `anon.from("courts")` e confirma que a RPC pública ainda preserva o link externo.

2. Leitura direta pública de `tenants`.
   - Risco: enumeração de tenants com subdomínio.
   - Correção: removida policy pública direta; a resolução pública segue por `fn_public_get_tenant_by_subdomain(p_subdomain)`.
   - Evidência: teste bloqueia `anon.from("tenants")` e confirma que a RPC pública por subdomínio ainda funciona.

3. `v_booking_stats` mantém `SELECT` para `authenticated`.
   - Risco avaliado: vazamento agregado por view.
   - Correção: nenhuma mudança necessária após teste dinâmico.
   - Evidência: usuário do tenant A não enxerga linha agregada do tenant B.

### Baixo

1. `arena_closures` possui RLS habilitado sem policy.
   - Impacto: tabela fica fechada para clientes comuns.
   - Ação futura: quando a feature usar essa tabela no app, criar policy explícita por tenant.

2. `service_role` mantém privilégios amplos.
   - Impacto: esperado para Edge Functions e scripts administrativos.
   - Mitigação: chave não aparece em `src/`; manter apenas em secrets de servidor/CI.

## Alterações implementadas

- `supabase/migrations/20260705000001_harden_rls_tenant_isolation.sql`
  - Proteção de `profiles.tenant_id` e `profiles.is_super_admin`.
  - Hardening de RPCs administrativas e de booking.
  - Revogação de grants amplos de funções.
  - Fechamento de views legadas e listagem pública de avatars.

- `supabase/migrations/20260705000002_harden_public_booking_reads.sql`
  - Nova RPC `fn_public_get_courts_by_subdomain`.
  - Remoção de leitura direta pública de `courts` e `tenants`.
  - Revogação de `public_courts_view`.

- `src/pages/BookingPublic.tsx`
  - Link público passou a buscar quadras pela RPC filtrada por subdomínio.
  - Removida leitura direta de `bookings` para checagem de conflito.

- `src/contexts/AuthContext.tsx`
  - Updates de perfil ignoram campos sensíveis `id` e `tenant_id`.

- `scripts/test-rls-tenant-isolation.ts`
  - Novo teste automatizado de isolamento RLS entre dois tenants.

- `package.json`
  - Novo script `npm run test:rls`.

## Resultado do teste RLS

Comando:

```bash
npm run test:rls
```

Resultado: passou.

Coberturas principais:

- bloqueio de SELECT cross-tenant em `bookings`;
- bloqueio de SELECT cross-tenant em `courts`;
- bloqueio de alteração de `profiles.tenant_id`;
- bloqueio de escalada de `profiles.is_super_admin`;
- bloqueio de alteração de `bookings.tenant_id`;
- bloqueio de UPDATE em booking de outro tenant;
- bloqueio de RPCs de booking contra outro tenant;
- bloqueio de `fn_get_booking_stats_admin` para outro tenant;
- bloqueio de vazamento por `v_booking_stats`;
- bloqueio de views legadas públicas;
- bloqueio de enumeração direta de `courts` e `tenants`;
- preservação das RPCs públicas por subdomínio;
- bloqueio de listagem pública de avatars.

## Validação final

- `npm run test:rls`: passou.
- `npm run test:security`: passou, 11/11 testes.
- `npm run verify`: passou (`lint`, `typecheck`, `npm test`, `build`).

Observações não bloqueantes:

- `lint` mantém 3 warnings antigos de Fast Refresh em `src/hooks/useCountUp.tsx`.
- `npm test` mantém avisos de signup/rate limit e testes Asaas opcionais ignorados sem `RUN_ASAAS_TESTS=1`.
- `build` mantém avisos existentes de Browserslist desatualizado e fonte Inter resolvida em runtime.

## Pendências futuras

- Criar policy explícita para `arena_closures` quando ela for exposta no produto.
- Remover scripts antigos de migração manual que ainda existem no repositório, em tarefa separada, para reduzir ruído operacional.
- Considerar mover a criação pública de reservas para uma RPC transacional única, para concentrar validação de conflito e insert em uma só operação.

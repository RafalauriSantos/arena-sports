# Asaas Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar os riscos de duplicidade, divergência financeira, drift de banco/configuração e inconsistência de acesso antes de habilitar cobranças reais do Asaas.

**Architecture:** O checkout continuará sendo uma Edge Function autenticada que cria ou reutiliza um único customer e uma única subscription por tenant. A persistência local será tratada como uma máquina de estados idempotente, com compensação/reconciliação quando uma chamada remota ao Asaas suceder e a gravação local falhar. Webhook e reconciliação permanecerão como caminhos independentes para convergir o estado local ao estado confirmado no Asaas.

**Tech Stack:** Supabase Edge Functions/Deno, Postgres migrations/RLS, Asaas REST API, React/TypeScript, Vitest-like scripts via `tsx`, GitHub Actions, Supabase CLI.

## Global Constraints

- Nunca colocar `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET` ou `SUPABASE_SERVICE_ROLE_KEY` no frontend, no Git ou em logs.
- Sandbox e produção devem usar URL, chave e token de webhook próprios; produção nunca pode aceitar URL/chave sandbox.
- O estado de acesso deve ser derivado de pagamento confirmado, trial válido ou carência explicitamente definida; nunca de um status local inventado.
- Toda mudança financeira precisa ser idempotente e auditável por tenant, subscription, payment e event id.
- Não considerar um teste pulado como aprovado; gates de produção devem falhar quando pré-condições obrigatórias estiverem ausentes.

---

### Task 1: Fechar o contrato do modelo de billing

**Files:**
- Modify: `supabase/functions/asaas-create-checkout/index.ts`
- Modify: `supabase/functions/asaas-manage-subscription/index.ts`
- Modify: `supabase/functions/ensure-tenant-subscription/index.ts`
- Modify: `src/hooks/useSubscriptionAccess.ts`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/components/admin/SubscriptionCard.tsx`
- Test: `scripts/testAsaasWebhookCore.ts`, `scripts/testAsaasReconciliationCore.ts`, novo teste de contrato de status/preço

- [ ] Definir uma única enumeração `trial | active | past_due | cancelled` em banco, Edge Functions e frontend; remover o alias incorreto `canceled`.
- [ ] Definir uma única fonte de preços: mensal `6990`, anual normal `59700`, anual Founder `39700`; eliminar o default legado `149` do onboarding.
- [ ] Adicionar testes que falhem quando qualquer camada usar `canceled`, `149`, preço antigo ou intervalo incompatível.
- [ ] Executar `npm run typecheck`, `npm run lint` e os testes de contrato.

### Task 2: Tornar criação de subscription idempotente

**Files:**
- Modify: `supabase/functions/asaas-create-checkout/index.ts`
- Modify: `supabase/migrations/<timestamp>_billing_checkout_idempotency.sql`
- Test: novo core testável de checkout e `scripts/test-billing-e2e.ts`

- [ ] Criar uma chave idempotente por tenant/oferta/ciclo e persistir intenção antes de chamar o Asaas.
- [ ] Bloquear checkout quando existir subscription `trial`, `active` ou `past_due` válida, salvo uma operação explícita de recuperação.
- [ ] Garantir que customer e subscription existentes sejam reutilizados, nunca recriados por concorrência.
- [ ] Criar constraint/index que impeça mais de uma subscription provider ativa por tenant.
- [ ] Se o Asaas criar a subscription e a persistência local falhar, registrar uma operação recuperável e executar reconciliação/compensação; não retornar sucesso silencioso.
- [ ] Testar duas chamadas concorrentes, retry após timeout e falha de `upsert`.

### Task 3: Corrigir lifecycle no Asaas

**Files:**
- Modify: `supabase/functions/asaas-manage-subscription/index.ts`
- Modify: `src/components/admin/SubscriptionCard.tsx`
- Modify: `src/pages/admin/ConfiguracoesView.tsx`
- Modify: `docs/BILLING_PRODUCTION_CHECKLIST.md`
- Test: testes de cancelamento, reativação e troca de plano

- [ ] Cancelamento deve usar `DELETE /subscriptions/{id}` e só marcar localmente como `cancelled` após resposta confirmada ou registrar pendência explícita.
- [ ] Reativação deve usar `PUT /subscriptions/{id}` com status/due date válidos; nunca promover acesso local manualmente.
- [ ] Troca de plano deve alterar a subscription remota com `PUT` ou cancelar/criar uma nova de forma transacional e rastreável.
- [ ] Conectar o botão “Gerenciar assinatura” a uma ação real; remover botões que afirmam sucesso sem operação remota.
- [ ] Testar cancelamento, reativação, troca de ciclo, falha remota e retry.

### Task 4: Corrigir Founder e regras comerciais

**Files:**
- Modify: `supabase/functions/asaas-create-checkout/index.ts`
- Modify: `supabase/functions/asaas-manage-subscription/index.ts`
- Modify: migrations de `is_founder`/`tenant_subscriptions`
- Test: novo teste de limite Founder

- [ ] Reservar Founder atomicamente, com constraint ou função transacional; duas requisições simultâneas não podem ultrapassar 20.
- [ ] Persistir o direito Founder independentemente de a subscription ficar cancelada, evitando reutilização indevida.
- [ ] Testar 20 reservas concorrentes, a 21ª reserva e recheckout de cliente Founder cancelado.

### Task 5: Fechar webhook e reconciliação

**Files:**
- Modify: `supabase/functions/asaas-webhook/index.ts`
- Modify: `supabase/functions/asaas-webhook/webhook-core.ts`
- Modify: `supabase/functions/asaas-reconcile-billing/reconciliation-core.ts`
- Modify: `supabase/functions/asaas-reconcile-billing/index.ts`
- Modify: `supabase/functions/_shared/observability.ts`
- Test: `scripts/testAsaasWebhookCore.ts`, `scripts/testAsaasReconciliationCore.ts`

- [ ] Exigir um identificador de evento estável do Asaas; não colapsar eventos diferentes usando apenas payment/subscription id.
- [ ] Manter estados `processing`, `done` e `failed` com retry seguro e alerta para `processing` preso.
- [ ] Cobrir eventos received, confirmed, overdue, refunded, chargeback, subscription inactive/deleted e duplicados.
- [ ] Confirmar que reconciliação não transforma assinatura ativa sem pagamento em acesso ativo.
- [ ] Garantir que cada ação sintética tenha event id determinístico, tenant e payment identificáveis.
- [ ] Testar webhook fora de ordem, retry após falha, evento sem subscription e divergência remota/local.

### Task 6: Reconciliar banco remoto e migrations

**Files:**
- Modify/create migrations em `supabase/migrations/`
- Modify: `supabase/config.toml`
- Modify: `docs/BILLING_PRODUCTION_CHECKLIST.md`
- Test/command: `npx supabase migration list`, `npx supabase db diff --linked`

- [ ] Exportar e revisar as migrations remotas que não existem localmente.
- [ ] Resolver migrations locais pendentes e remotas órfãs sem apagar histórico de produção.
- [ ] Aplicar a migration P0 de hardening no projeto correto e confirmar no catálogo remoto.
- [ ] Alinhar `project_id` com o projeto real `extkyeckajhcozjervyr` ou documentar explicitamente por que não deve ser igual.
- [ ] Confirmar que RLS, grants, funções e constraints usados pelo código existem no banco remoto.
- [ ] Bloquear deploy quando houver migration drift.

### Task 7: Endurecer configuração, logs e CI

**Files:**
- Modify: `supabase/functions/_shared/asaas-env.ts`
- Modify: `supabase/functions/_shared/cors.ts`
- Modify: `scripts/test-suite-complete.ts`
- Modify: `scripts/check-supabase-connection.ts`
- Modify: `scripts/test-conexoes.ts`
- Modify: `.github/workflows/ci-cd.yml`
- Modify: `.github/workflows/billing-reconciliation.yml`
- Modify: `.github/workflows/billing-operational-monitor.yml`

- [ ] Validar ambiente antes de qualquer trabalho caro, mas retornar `401` antes de expor erro de configuração a chamadas não autenticadas.
- [ ] Remover impressão parcial de chaves e tokens dos scripts e logs.
- [ ] Fazer `npm test` falhar quando testes de auth, RLS ou Asaas forem pulados sem uma flag de auditoria explícita.
- [ ] Fazer workflows falharem quando secrets, URL, token ou resultado da reconciliação estiverem ausentes/incorretos.
- [ ] Confirmar que produção usa somente secrets do secret manager e nunca `.env.local`.

### Task 8: Executar gate de produção

**Files:**
- Update: `docs/BILLING_PRODUCTION_CHECKLIST.md`
- Test/runtime: Supabase, Asaas Sandbox e Asaas Produção

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test` sem skips ocultos
- [ ] `npm run test:security`
- [ ] `npm run test:rls`
- [ ] `npm run test:billing`
- [ ] `npm run test:reconciliation`
- [ ] `npm run build`
- [ ] Probe sem autenticação: checkout `401`, webhook `401`, reconciliação `401`.
- [ ] Teste sandbox completo: criar checkout, receber webhook, ativar acesso e reconciliar.
- [ ] Teste produção controlado: valor mínimo, primeiro pagamento acompanhado manualmente.
- [ ] Confirmar no painel Asaas: URL de produção, API key de produção, webhook de produção e token diferente do sandbox.
- [ ] Liberar cobrança somente quando todos os itens obrigatórios estiverem marcados.

## Commit Boundaries

- [ ] Separar alterações de billing/hardening de alterações de UI, testes genéricos e limpeza incidental.
- [ ] Não commitar `package-lock.json`, configurações ou arquivos de teste sem confirmar que pertencem ao mesmo objetivo.
- [ ] Rodar `git diff --check`, gates da Task 8 e revisão dos arquivos staged antes do commit.
- [ ] Fazer push somente depois de migrations e Edge Functions terem sido validadas no projeto remoto correto.

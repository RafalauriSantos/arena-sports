# Plano detalhado — Migração Stripe → ASAAS (100% pronto para vender)

Data: 2026-01-06  
Objetivo: substituir Stripe por ASAAS como **provedor principal de cobrança/assinatura**, com rastreabilidade (logs), estabilidade (webhooks idempotentes), e um checklist de aceitação para “pronto para vender”.

## 0) Estado atual (resumo do que já existe)

- O **frontend já inicia checkout via ASAAS** chamando a Edge Function `asaas-create-checkout`.
- Já existem Edge Functions ASAAS:
  - `asaas-create-checkout`: cria checkout recorrente e grava `asaas_customer_id/asaas_checkout_id` em `tenant_subscriptions`.
  - `asaas-webhook`: recebe eventos e atualiza `tenant_subscriptions` + grava em `asaas_webhook_events`.
- Ainda existe legado Stripe (Edge Functions + script + configs), mas a UI está apontando para ASAAS.

> Implicação: o “core” do fluxo está encaminhado, mas **falta infraestrutura de banco + checklist de deploy + recursos de pós-venda** (cancelamento/upgrade, auditoria, falhas de webhook, etc.).

---

## 1) Definições (para evitar ambiguidade)

### 1.1 O que significa “ASAAS 100%”

Consideraremos “100%” quando:

1. **Criar assinatura** (Start/Pro, mensal/anual) funciona end-to-end.
2. **Reconciliação** (status/renovação/inadimplência/cancelamento) funciona via webhook.
3. **Paywall** respeita o status real do tenant (trial/active/past_due/canceled).
4. **Operações de pós-venda** existem (cancelar/reativar/alterar plano ou encaminhar para fluxo oficial no ASAAS).
5. **Observabilidade**: logs/auditoria permitem suporte (ver eventos, reprocessar, diagnosticar).
6. **Configuração de produção** documentada: secrets, URLs, webhooks e validações.

### 1.2 Fonte de verdade

- **Tabela `tenant_subscriptions` é a fonte de verdade** do acesso.
- ASAAS (externo) é “sistema mestre” de cobrança, mas o app decide acesso lendo `tenant_subscriptions`.

---

## 2) Plano de execução (fases)

### Fase A — Banco de dados (P0)

**Objetivo:** garantir que o schema suporta ASAAS e que o webhook não falha em produção.

A1) Criar migration para ASAAS (idempotente)

- Adicionar colunas em `public.tenant_subscriptions`:
  - `asaas_customer_id text`
  - `asaas_subscription_id text`
  - `asaas_checkout_id text`
- Criar índices úteis:
  - índice em `asaas_subscription_id`
  - índice em `asaas_customer_id`

A2) Criar tabela `public.asaas_webhook_events`

- Campos mínimos recomendados:
  - `event_id text primary key` (idempotência)
  - `payload jsonb not null`
  - `status text not null` (`processing` | `done` | `failed`)
  - `created_at timestamptz default now()`
  - `processed_at timestamptz`
- RLS:
  - normal: negar acesso público.
  - opcional: permitir `select` somente para “saas admin” (via RPC ou role), se existir.

A3) Validar que `fn_tenant_has_access` não depende de Stripe

- Ela hoje decide por `status` + datas (trial/grace/active). Isso é bom.
- Confirmar que as datas/grace estão consistentes com o comportamento que você quer vender.

**Critério de aceite da Fase A**

- Webhook `asaas-webhook` consegue inserir em `asaas_webhook_events`.
- `asaas-create-checkout` consegue `upsert` em `tenant_subscriptions` com colunas ASAAS.

---

### Fase B — Configuração e deploy (P0)

**Objetivo:** configurar produção e deixar reprodutível.

B1) Secrets obrigatórias no Supabase (Edge Functions)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (usado na função que valida o JWT via `createClient`)
- `SITE_URL` (ajuda fallback na origem)

B2) Secrets ASAAS

- `ASAAS_ACCESS_TOKEN`
- `ASAAS_WEBHOOK_TOKEN` (validado no header `asaas-access-token`)
- opcionais:
  - `ASAAS_BASE_URL` (produção/sandbox)
  - `ASAAS_USER_AGENT`
  - `ASAAS_PLAN_START_MONTHLY_VALUE`, `ASAAS_PLAN_START_YEARLY_VALUE`, `ASAAS_PLAN_PRO_MONTHLY_VALUE`, `ASAAS_PLAN_PRO_YEARLY_VALUE` (se quiser preços configuráveis por env)

B3) Deploy das Edge Functions

- Deploy:
  - `asaas-create-checkout`
  - `asaas-webhook`
- Confirmar CORS e headers permitidos (já aceita `asaas-access-token`).

B4) Configurar Webhook no painel ASAAS

- URL do webhook: `https://<SUPABASE_PROJECT>.functions.supabase.co/asaas-webhook` (ou equivalente do projeto)
- Header obrigatório:
  - `asaas-access-token: <ASAAS_WEBHOOK_TOKEN>`
- Eventos mínimos:
  - `SUBSCRIPTION_CREATED`
  - `SUBSCRIPTION_UPDATED`
  - `SUBSCRIPTION_INACTIVATED`
  - `SUBSCRIPTION_DELETED`

**Critério de aceite da Fase B**

- Criar assinatura dispara webhook e atualiza `tenant_subscriptions.status`.
- Reenvio do mesmo evento não duplica (idempotência pelo `event_id`).

---

### Fase C — Ajustes de aplicação (P0/P1)

**Objetivo:** remover dependências de Stripe no acesso e reduzir pontos de confusão.

C1) `useSubscriptionAccess` não deve inferir plano por `stripe_price_id`

- Hoje existe lógica defensiva baseada em `stripe_price_id` e envs `VITE_STRIPE_PRICE_*`.
- Para ASAAS 100%, decidir uma das opções:
  - Opção 1 (simples): inferir plano por `plan_code`/`plan_name` vindos de `tenant_subscriptions` (atualizados pelo webhook ASAAS).
  - Opção 2 (robusta): armazenar no banco também `provider`/`external_plan_code` e sempre derivar do provider.

C2) Remover UI/fluxos que dependam de Stripe

- Confirmar que não existe botão chamando Stripe.
- Manter Stripe apenas como legado até concluir rollout (opcional), mas com feature flag.

C3) Garantir retorno de checkout

- A UI já lida com `?asaas=success|cancel|expired` e faz polling de `refetchSubscription`.
- Validar que o webhook realmente atualiza status em poucos segundos.

**Critério de aceite da Fase C**

- Um tenant recém-assinado via ASAAS entra como `active` (ou `trial`) e libera acesso sem depender de Stripe.

---

### Fase D — Pós-venda (P1)

**Objetivo:** ter ferramentas para vender com segurança (cancelamento, troca de plano, falhas, suporte).

D1) Cancelamento/gestão de assinatura
Escolher um caminho (mínimo necessário para “pronto pra vender”):

- Caminho mínimo (rápido):
  - Fornecer um botão que abre o link/área de pagamentos do ASAAS do cliente (se aplicável no modelo usado) + instruções.
- Caminho completo (ideal):
  - Criar Edge Function `asaas-manage-subscription` (ex.: cancelar, reativar, trocar plano) usando `ASAAS_ACCESS_TOKEN` e atualizando `tenant_subscriptions`.

D2) Reprocessar webhooks e diagnósticos

- Criar um procedimento interno (ou tela admin) para:
  - ver últimos eventos de `asaas_webhook_events`
  - reprocessar eventos com `status=failed`

D3) Política de inadimplência e grace

- Confirmar regra de negócio:
  - `past_due` dá quantos dias?
  - quando virar `canceled`?
- Alinhar isso com o que você promete ao cliente.

**Critério de aceite da Fase D**

- Suporte consegue responder “por que o cliente foi bloqueado?” em minutos.

---

### Fase E — Hardening para vender (P1)

E1) Segurança e limites

- Nunca expor `ASAAS_ACCESS_TOKEN` no frontend.
- Webhook precisa de token (já tem) e idempotência (já tem via tabela).

E2) Observabilidade

- Logar:
  - `tenant_id`, `event_id`, `event_type`, `status`.
- Se possível, adicionar correlação com `asaas_subscription_id`.

E3) Documentação de operação

- Criar um “runbook” de suporte (abaixo).

---

## 3) Registro / checklist de “ASAAS 100%” (use como controle de pronto)

Marque quando concluir.

### 3.1 Banco e schema

- [ ] Migration cria colunas `asaas_customer_id`, `asaas_subscription_id`, `asaas_checkout_id` em `tenant_subscriptions`.
- [ ] Migration cria `asaas_webhook_events`.
- [ ] Índices criados para lookup por `asaas_subscription_id`.
- [ ] RLS/policies de `asaas_webhook_events` definidas (pelo menos bloqueio público).

### 3.2 Edge Functions

- [ ] `asaas-create-checkout` deployada no Supabase.
- [ ] `asaas-webhook` deployada no Supabase.
- [ ] `ASAAS_ACCESS_TOKEN` configurado no Supabase.
- [ ] `ASAAS_WEBHOOK_TOKEN` configurado no Supabase.
- [ ] `SITE_URL` configurado (ou garantia de Origin/Referer no navegador).

### 3.3 Painel ASAAS

- [ ] Webhook apontando para a URL correta.
- [ ] Header `asaas-access-token` configurado.
- [ ] Eventos de assinatura habilitados.

### 3.4 App / Paywall

- [ ] `useSubscriptionAccess` não depende de `stripe_price_id`.
- [ ] Acesso libera/bloqueia corretamente para `trial`, `active`, `past_due`, `canceled`.
- [ ] Fluxo de retorno `?asaas=...` funciona e limpa `localStorage`.

### 3.5 Casos de teste (mínimo para vender)

- [ ] Criar assinatura Start mensal (novo tenant) → status atualizado.
- [ ] Criar assinatura Pro anual (upgrade) → status/plan atualizados.
- [ ] Cancelar assinatura no ASAAS → app bloqueia conforme regra.
- [ ] Inadimplência (simulada) → vira `past_due` e depois bloqueia.
- [ ] Reenvio do mesmo webhook não quebra (idempotente).

### 3.6 Pós-venda e suporte

- [ ] Existe caminho claro para o cliente cancelar/alterar plano.
- [ ] Existe um jeito de ver falhas de webhook e corrigir.
- [ ] Existe runbook de suporte.

---

## 4) Runbook (suporte) — “o que fazer quando der problema”

### Caso 1: Cliente pagou mas app continua bloqueado

1. Verificar se chegou evento em `asaas_webhook_events`.
2. Se não chegou: revisar webhook no painel ASAAS + `ASAAS_WEBHOOK_TOKEN`.
3. Se chegou com `failed`: olhar erro (logs) e corrigir schema/cols.
4. Verificar `tenant_subscriptions.status` do tenant.

### Caso 2: Checkout abre, mas dá erro na volta

1. Confirmar que o callback está indo para `/dashboard?asaas=success|cancel|expired`.
2. Confirmar que o domínio de origem está correto (Origin/Referer/SITE_URL).

### Caso 3: Assinatura duplicada

1. Conferir se o `externalReference` é o `tenant_id`.
2. Garantir que o webhook atualiza por `asaas_subscription_id` e que o tenant correto foi resolvido.

---

## 5) Próxima ação recomendada (ordem prática)

1. Implementar migrations ASAAS (Fase A).
2. Rodar `Supabase: db push` e validar em staging.
3. Deploy das Edge Functions e configurar webhook no ASAAS (Fase B).
4. Ajustar `useSubscriptionAccess` para remover dependência de Stripe (Fase C).
5. Definir “pós-venda” (D1) e concluir checklist de testes.

# Sprint até domingo — Arena Sports (norte)

Data de início: 2026-01-01

## Objetivo (o que precisa estar funcionando)

Entregar o **Arena Sports rodando e vendável** (MVP estável), com:

- **Login/Signup** funcionando
- **Dashboard admin** funcionando (ver, criar, editar, apagar reservas)
- **Agenda pública** funcionando (listar quadras/horários e gerar WhatsApp)
- **Paywall/Assinatura (Stripe)** funcionando (trial com consentimento + compra Start/Pro)
- **Banco protegido com RLS** sem quebrar o app

## Escopo do produto (Raio-X)

Documento de produto (inventário do que existe vs roadmap): **RAIO_X_FUNCIONALIDADES.md**

Para este sprint, o escopo mínimo “vendável” é:

- **START (✅)**: agenda admin + link público + WhatsApp + gestão de quadras + folgas + PWA.
- **PRO (✅)**: relatórios/indicadores (ocupação/receita).
- **Billing/Stripe (✅)**: paywall + checkout + retorno do Stripe com status correto.

Fora do escopo deste sprint (deixa para roadmap):

- Itens marcados como **⚠️**/**🚀** no Raio-X (ex.: Pix automatizado, sinal com confirmação automática, multi-usuários, lista de espera, comanda).

## Critérios de pronto (Definition of Done)

Considero “pronto” quando:

1. `bun run build` passa.
2. Usuário novo consegue:
   - criar conta (signup)
   - fazer onboarding (criar tenant + profile com tenant_id)
   - entrar no `/dashboard`
3. No `/dashboard`, consigo:
   - listar quadras
   - criar reserva
   - atualizar status de pagamento
   - ver reservas na lista
4. No `/agendar/:subdomain`, consigo:
   - abrir a página sem login
   - ver quadras ativas
   - ver horários livres (sem mostrar horários ocupados)
   - gerar link WhatsApp
5. No `/dashboard` / Configurações, assinatura funciona:

- escolher Start ou Pro e ir pro Checkout
- ao voltar do Stripe, status vira **Ativo** e mostra o plano/valor corretos (ex.: Pro R$169)
- usuário pago **não** vê CTA de trial/assinar
- portal do Stripe abre (gerenciar assinatura)

6. Não existe “tela branca” nem erro recorrente de RLS no console.

## Estado atual (já feito)

- RLS “owner-only” aplicado no Supabase (migração de segurança)
- Ajuste de resiliência no AuthContext: usa `profiles.tenant_id` como fonte principal
- Policy pública mínima para `courts` (quadras ativas) aplicada
- Build está passando

Atualizações desta sprint (2026-01-02):

- ✅ Trial/carência corrigidos para não bloquear por `NULL` em `trial_ends_at/grace_ends_at` (backfill via migration)
- ✅ Bypass de admin do SaaS (VIP) para o criador não cair no paywall
- ✅ `db push` via CLI aplicado e remoto está up-to-date

Atualizações desta sprint (2026-01-03):

- ✅ Fluxo de assinatura completo (Start/Pro) com UI Pro-first e fallback para Start
- ✅ Pós-checkout resiliente: sincroniza assinatura no retorno do Stripe (cobre atraso de webhook)
- ✅ Trial corrigido para iniciar **após consentimento** (usa `trial_started_at`), evitando “trial infinito”
- ✅ Onboarding blindado: garante `tenant_id` no profile (RPC `fn_onboard_user` + constraints/grants)
- ✅ Edge Functions endurecidas (não estouram 500 com JSON vazio; validações e inferência de plano por `price_id`)
- ✅ Landing alinhada para guiar compra do Pro (sem esconder Start)
- ✅ Páginas de política/termos/suporte adicionadas

Atualizações desta sprint (2026-01-04):

- ✅ PWA em dev estabilizado: `virtual:pwa-register` não quebra mais o HMR; SW só registra em produção
- ✅ Landing responsiva refinada (mockups MacBook + iPhone sem sobrepor no desktop e com espaçamento melhor no mobile)
- ✅ Header da Landing: links completos (Comparativo/Passo a Passo/Planos/FAQ/Login/Criar Conta) e tipografia desktop mais legível
- ✅ Deep-link de cadastro: `/login?mode=signup` abre direto no modo Criar Conta
- ✅ Resiliência offline: erro de rede/"Failed to fetch" não zera sessão/tenant nem derruba para paywall

Arquivos relacionados:

- `supabase/migrations/20260101090000_mvp_rls_owner_only.sql`
- `supabase/migrations/20260101130000_public_courts_read.sql`
- `src/contexts/AuthContext.tsx`
- `src/pages/admin/Dashboard.tsx`
- `src/pages/admin/ConfiguracoesView.tsx`
- `src/pages/Landing.tsx`
- `src/hooks/useSubscriptionAccess.ts`
- `supabase/functions/stripe-create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-sync-checkout/index.ts`
- `supabase/functions/ensure-tenant-subscription/index.ts`
- `supabase/migrations/20260103*_fn_onboard_user*.sql`

## Plano de execução (de agora até domingo)

### 1) Smoke test guiado (primeira prioridade)

Rodar e validar os 3 fluxos principais:

- Login/Signup: `/login`
- Admin: `/dashboard`
- Público: `/agendar/:subdomain`

Checklist de teste (marque com ✅):

- [x] Signup cria tenant e abre dashboard
- [x] Signin abre dashboard
- [x] Dashboard carrega quadras e reservas (sem permission denied)
- [x] Criar reserva funciona (insert em `bookings`)
- [x] Alterar status funciona (update em `bookings`)
- [x] Deletar reserva funciona (delete em `bookings`)
- [x] Página pública lista quadras (select em `courts` como anon)
- [x] Página pública carrega ocupação (via RPC; bloqueia horários ocupados)
- [ ] Assinatura: clicar Pro → Checkout → pagar → voltar e ver **Ativo / Pro R$169**
- [ ] Assinatura: usuário pago não vê trial/CTA de assinar
- [ ] Portal Stripe abre em Configurações (gerenciar assinatura)

### 1.1) QA de responsividade + PWA (fazer amanhã)

Objetivo: garantir **mobile-first**, **desktop** e **PWA** sem regressões visuais ou de fluxo.

Preparação:

- [x] Rodar `bun run dev` (para fluxo rápido)
- [ ] Rodar `bun run build` + `bun run preview` (para validar PWA em modo produção)

Responsividade (Chrome DevTools → Toggle device toolbar):

- [x] QA de responsividade (teste manual — OK)
- [x] Mobile: botões/CTAs responsivos (teste manual — OK)
- [x] Mobile (360×800): `/login` não corta inputs/botões; teclado não esconde CTA
- [x] Mobile (390×844): `/dashboard` não estoura largura; tabelas/cards quebram corretamente
- [x] Tablet (768×1024): navegação e cards ficam legíveis (sem overflow horizontal)
- [x] Desktop (1366×768): layout usa bem o espaço (sem “coluna vazia” gigante)
- [x] Desktop (1440×900): sidebar/header não sobrepõem conteúdo; modais centralizam

Fluxos críticos em telas diferentes (mobile + desktop):

- [x] Login: entrar/sair sem “tela branca”
- [x] Dashboard: lista quadras e reservas sem erro de RLS
- [x] Reservas: abrir modal e criar reserva (validações ok)
- [x] Público: `/agendar/:subdomain` lista quadras e bloqueia horários ocupados
- [x] Billing: escolher Pro → Checkout (redireciona) → voltar e ver **Ativo / Pro R$169**

PWA (validar em `bun run preview`):

- [ ] Abrir DevTools → Application → Manifest: ícones/cores ok e sem erros
- [x] Instalar (Install app / Add to Home Screen) e abrir em modo “app”
- [ ] Offline: simular offline e confirmar que não dá tela branca (pode mostrar erro controlado)
- [ ] Update: após build nova, recarregar e confirmar que SW atualiza sem travar

Critério de aceitação:

- [x] Sem overflow horizontal, sem texto cortado e sem CTA inacessível nos fluxos acima
- [ ] PWA instala e abre; offline não quebra com erro fatal

### 2) Consertar inconsistências de tabelas (admin metrics)

Existe código que usa tabelas antigas/alternativas (`arena_reservations`, `arena_time_slots`).
Ajustar para usar o schema real do MVP atual (`bookings`, `courts`, `recurring_slots`).

Checklist:

- [x] Confirmar que o app não usa `arena_reservations/arena_time_slots` (restam apenas tipos antigos)
- [ ] (Opcional) Limpar tipos/refs antigas se começar a confundir manutenção

### 3) Garantir agenda pública completa (sem vazamento)

A página pública precisa:

- ler `tenants` por `subdomain`
- listar `courts` ativas
- bloquear horários ocupados por:
  - `bookings`
  - `recurring_slots` (mensalistas)

Checklist:

- [x] BookingPublic carrega ocupação via RPC `fn_public_get_occupied_slots` (retorna somente `court_id` + `slot_time`)
- [x] RPC considera `bookings` + `recurring_slots` sem vazar dados sensíveis
- [ ] Validar em produção que a página pública está listando quadras/horários (teste manual)

Observação de segurança:

- Preferir policies públicas que dependem de `tenants.subdomain is not null` e dados mínimos.

### 4) Checagens de produção mínimas (domingo)

- Variáveis de ambiente:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Stripe (produção):
  - secrets configurados no Supabase (webhook + API key)
  - Price IDs do Start/Pro configurados (env das Edge Functions)
- Validar build + deploy
- Validar 3 fluxos pós-deploy

Checklist (novo):

- [ ] Atualizar preços reais na Stripe (Start/Pro mensal e anual)
- [ ] Atualizar Price IDs nas variáveis de ambiente (Vercel + Supabase Edge Functions)
  - `VITE_STRIPE_PRICE_START_MONTHLY` / `VITE_STRIPE_PRICE_START_YEARLY`
  - `VITE_STRIPE_PRICE_PRO_MONTHLY` / `VITE_STRIPE_PRICE_PRO_YEARLY`
  - `STRIPE_PRICE_START_MONTH(LY)` / `STRIPE_PRICE_START_YEAR(LY)`
  - `STRIPE_PRICE_PRO_MONTH(LY)` / `STRIPE_PRICE_PRO_YEAR(LY)`

Checklist:

- [x] `bun run build`
- [x] Abrir `/login` e entrar
- [x] Abrir `/dashboard` e listar dados
- [x] Abrir `/agendar/:subdomain` e listar quadras/horários
- [x] Rodar `npx supabase@latest db push` (aplicar migrations novas)
- [ ] Deploy das Edge Functions do Stripe (webhook/checkout/portal/sync)
- [ ] Teste real de pagamento (cartão) e retorno com status Ativo

### 5) Testes (antes de dar como pronto)

Objetivo: fechar a sprint com **checagens automáticas + sanity check em produção local**.

Automáticos:

- [ ] `bun run lint` (eslint) sem erros
- [x] `bun run build` sem erros

Sanity check (modo produção local):

- [ ] `bun run preview` e validar os fluxos principais sem console spam/erros
- [ ] `/login` → entrar → `/dashboard` carrega
- [ ] `/agendar/:subdomain` abre e lista quadras/horários

## Atenções (P0)

- O app chama `fn_onboard_user` no AuthContext; se essa RPC não existir no Supabase remoto, o fluxo de signup pode falhar.
- Para o criador do SaaS não cair no paywall, usar a allowlist `saas_admin_users` (VIP) no banco.
- Assinatura depende de Edge Functions + webhooks: se webhook atrasar, o fallback de retorno via `session_id` deve resolver (validar em produção).

## Comandos úteis

- Rodar dev: `bun run dev`
- Build: `bun run build`
- Aplicar migrations Supabase (remoto): `npx supabase@latest db push`

## Problemas comuns (e como diagnosticar)

- **permission denied**: geralmente falta policy RLS para a rota/tabela
  - Veja qual tabela falhou e qual role (anon/authenticated)
- **dashboard vazio**: `tenantId` nulo, profile sem `tenant_id`, ou onboarding falhou
- **público sem quadras**: faltava `SELECT` anon em `courts` (já endereçado)
- **público sem horários bloqueados**: falta carregar `bookings`/`recurring_slots` ou falta policy mínima de leitura

## Próxima decisão (após domingo)

Depois de estabilizar o Arena:

- escolher estratégia de billing (trial + mensalidade)
- preparar o “core SaaS” para reuso nos próximos 3 front-ends

---

## Motor do banco (explicação das peças)

### 1) `tenants` (O Cliente / A Empresa)

O que é: a tabela mais importante. Cada linha representa uma Arena que te contratou. É o “inquilino” (tenant) do seu software.

O que salvamos: nome da empresa (`business_name`), link personalizado (`subdomain`), quem é o dono (`owner_id`) e configurações gerais (`settings`).

Visão de negócio: aqui mora o seu cliente B2B. O `settings` em `jsonb` é uma jogada de mestre porque permite criar configurações flexíveis (ex.: regras de cancelamento e horários) sem precisar criar novas colunas o tempo todo.

### 2) `profiles` (As Pessoas / Staff)

O que é: os usuários humanos que fazem login.

O que salvamos: nome, foto (`avatar_url`), cargo (`job_title`) e o vínculo com a autenticação do Supabase (`auth.users`).

Visão de negócio: o campo `tenant_id` garante que um funcionário pertence a uma Arena. Isso sustenta a segurança: a Arena A nunca vê dados da Arena B.

### 3) `courts` (O Estoque / O Ativo)

O que é: o produto que a Arena vende — as quadras.

O que salvamos: nome ("Quadra 1"), preço base (`base_price`) e se está ativa ou em manutenção.

Visão de negócio: sem quadra não tem receita. Esse é o inventário do cliente.

### 4) `bookings` (A Caixa Registradora / O Dinheiro Deles)

O que é: cada reserva feita (pelo app ou no balcão).

O que salvamos: quem reservou (`customer_name`), qual quadra (`court_id`), horário início/fim, e principalmente `total_price` e `status` (pago/pendente).

Visão de negócio: é aqui que você gera valor pro dono da arena. Essa tabela alimenta o Dashboard Financeiro. Se `bookings` está cheia, o cliente está ganhando dinheiro — e tende a manter o SaaS.

### 5) `recurring_slots` (A Renda Fixa / Mensalistas)

O que é: reservas fixas (ex.: toda terça às 20h).

O que salvamos: dia da semana, horário e cliente.

Visão de negócio: isso é vital no Brasil. O “mensalista” garante custo fixo. Separar isso de reservas comuns (`bookings`) permite gestão diferente (e no futuro, cobrança mensal automática).

### 6) `tenant_subscriptions` (O SEU Dinheiro)

O que é: controle de quem está pagando você.

O que salvamos: qual plano (`plan_name`), quanto paga por mês (`monthly_price`) e o status (`trial`, `active`, `overdue`).

Visão de negócio: essa é sua receita. Quando o trial acaba (`trial_ends_at`), o sistema deve bloquear acesso se o status não virar `active`.

### 7) `promotion_rules` (O Motor de Marketing)

O que é: regras automáticas para atrair jogadores.

O que salvamos: descontos (`discount_percentage`) e dias (`promo_days`).

Visão de negócio: retenção. Permite “Terça Maluca com 20% OFF” para preencher horário ocioso.

### 8) `saas_products` (A Expansão)

O que é: catálogo do que seu SaaS oferece.

O que salvamos: categorias de software.

Visão de negócio: hoje você vende “Gestão de Arenas”. Amanhã vende “Gestão de Campeonatos”, “Escolinhas”, etc. Prepara upsell dentro da mesma plataforma.

### Análise crítica (mentor)

Pontos fortes:

- Multi-tenant nativo: quase tudo tem `tenant_id`, isso escala.
- Separação de receitas: dinheiro da arena (`bookings`) vs dinheiro do SaaS (`tenant_subscriptions`).
- Flexibilidade: `jsonb` em `settings` e arrays em `promo_days`.

### Fluxo do dinheiro (o que o app tem que garantir sem travar)

1. Arena cria conta → cria linha em `tenants` e `tenant_subscriptions` (trial).
2. Arena cadastra quadras → cria linhas em `courts`.
3. Jogador reserva → cria linha em `bookings`.

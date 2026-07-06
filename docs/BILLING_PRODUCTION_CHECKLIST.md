# Billing Production Checklist - ArenaSys

Este documento define os requisitos para considerar o modulo de billing pronto
para producao. O escopo atual do modulo e assinatura da arena via Asaas. O fluxo
de pagamento de reservas avulsas de quadra ainda nao esta implementado como
gateway Asaas dentro do ArenaSys.

## Escopo Atual

- Criacao de cliente Asaas a partir dos dados cadastrais da arena.
- Criacao de assinatura mensal ou anual no Asaas.
- Retorno da URL da cobranca vinculada a assinatura.
- Registro da assinatura em `tenant_subscriptions`.
- Recebimento de webhooks Asaas em `asaas-webhook`.
- Idempotencia por `asaas_webhook_events.event_id`.
- Atualizacao de `tenant_subscriptions.status` a partir de eventos de pagamento
  e assinatura.

## Status De Prontidao

### Pronto

- Checkout usa `ASAAS_API_URL` apontando para sandbox no ambiente testado.
- Checkout cria assinatura no Asaas e retorna a cobranca vinculada a essa
  assinatura.
- Teste automatizado valida que `paymentId` retornado pertence ao
  `subscriptionId`.
- Webhook valida `asaas-access-token` por igualdade estrita contra
  `ASAAS_WEBHOOK_SECRET`/`ASAAS_WEBHOOK_TOKEN`.
- Webhook rejeita chamadas sem `asaas-access-token` quando o segredo esta
  configurado na Edge Function.
- Webhook rejeita token nao vazio incorreto com `401` contra a funcao
  deployada.
- Teste autorizado contra a Edge Function deployada executa com
  `TEST_ASAAS_WEBHOOK_TOKEN` e confirma atualizacao de status para `active`.
- Webhook possui nucleo automatizado cobrindo:
  - pagamento recebido/confirmado ativando assinatura;
  - pagamento recebido em dinheiro ativando assinatura;
  - evento duplicado sem dupla atualizacao;
  - evento pendente fora de ordem sem regredir assinatura ativa;
  - evento vencido marcando assinatura como `past_due`;
  - evento reembolsado marcando assinatura como `past_due`;
  - retry de evento que falhou antes;
  - pagamento sem subscription registrado como falha auditavel, sem ativar nada.
- `npm run test:billing` executa os testes do nucleo do webhook e o fluxo sandbox
  de checkout.
- Teste real no Asaas Sandbox confirmado em 2026-07-05:
  - checkout criou `paymentId` e `subscriptionId`;
  - pagamento foi confirmado pelo endpoint sandbox do Asaas;
  - webhook real registrou `SUBSCRIPTION_CREATED` como `done`;
  - webhook real registrou `PAYMENT_RECEIVED` como `done`;
  - `tenant_subscriptions.status` foi atualizado para `active`.

### Ainda Nao Pronto

- Producao ainda nao esta liberada. A evidencia atual mostra checkout sandbox
  (`https://sandbox.asaas.com/...`) no ambiente testado.
- A chave de API de producao do Asaas ainda precisa ser configurada e validada
  no secret manager do ambiente de producao.
- O webhook de producao do Asaas ainda precisa ser cadastrado/validado no painel
  de producao com token proprio, diferente do token sandbox.
- A separacao sandbox/producao depende das variaveis `ASAAS_API_URL`,
  `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` corretas por ambiente. Antes de
  divulgar link real, confirmar no painel/secret manager que producao nao esta
  usando secrets de sandbox.
- Nao ha job de reconciliacao periodica consultando Asaas para pagamentos que
  ficaram pendentes por webhook perdido.
- Nao ha monitoramento/alerta para eventos `failed` em `asaas_webhook_events`.
- Fluxos Asaas para reserva avulsa de quadra nao existem no produto:
  - PIX da reserva;
  - boleto da reserva;
  - cartao aprovado/recusado da reserva;
  - expiracao automatica de reserva pendente de gateway;
  - reembolso de reserva liberando horario.
- O teste de webhook real sandbox foi executado manualmente uma vez. Ele ainda
  nao esta automatizado no CI.

## Comandos Obrigatorios Antes De Release

```bash
npm run lint
npm run typecheck
npm run test:billing
npm run verify
```

Quando houver token de webhook disponivel no ambiente:

```bash
TEST_ASAAS_WEBHOOK_TOKEN=<token> npm run test:billing
```

No Windows PowerShell, prefira definir a variavel sem expor o valor no historico:

```powershell
$env:TEST_ASAAS_WEBHOOK_TOKEN = [Environment]::GetEnvironmentVariable("TEST_ASAAS_WEBHOOK_TOKEN", "User")
npm run test:billing
```

## Checklist De Producao

### Ambiente

- [ ] `ASAAS_API_URL` de producao aponta para o host de producao do Asaas.
- [ ] `ASAAS_API_KEY` de producao configurada apenas em secret manager.
- [ ] `ASAAS_WEBHOOK_SECRET` ou `ASAAS_WEBHOOK_TOKEN` configurado na Edge
      Function.
- [ ] Token do webhook cadastrado no painel Asaas no header
      `asaas-access-token`.
- [ ] URL do webhook cadastrada:
      `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`.
- [ ] A Edge Function `asaas-webhook` foi deployada com `--no-verify-jwt`.
- [ ] A Edge Function `asaas-create-checkout` foi deployada depois da ultima
      alteracao de codigo.

### Checkout

- [ ] Criar assinatura mensal sandbox e confirmar:
  - `tenant_subscriptions.asaas_subscription_id` preenchido;
  - `tenant_subscriptions.asaas_customer_id` preenchido;
  - `tenant_subscriptions.status = trial` antes do pagamento;
  - URL retornada pertence a um payment cujo `subscription` e o
    `subscriptionId` retornado.
- [ ] Criar assinatura anual Founder e confirmar preco correto.
- [ ] Criar assinatura anual normal quando limite Founder acabar.
- [ ] Confirmar que o checkout nao cria payment duplicado para a mesma
      assinatura.
- [ ] Confirmar que o valor do Asaas bate com a oferta exibida no admin.

### Webhook

- [ ] Chamada sem `asaas-access-token` retorna `401`.
- [ ] `PAYMENT_RECEIVED` atualiza `tenant_subscriptions.status` para `active`.
- [ ] `PAYMENT_CONFIRMED` atualiza `tenant_subscriptions.status` para `active`.
- [ ] `PAYMENT_RECEIVED_IN_CASH` atualiza `tenant_subscriptions.status` para
      `active`.
- [ ] `PAYMENT_OVERDUE` atualiza `tenant_subscriptions.status` para `past_due`.
- [ ] `PAYMENT_REFUNDED` atualiza `tenant_subscriptions.status` para `past_due`.
- [ ] `SUBSCRIPTION_UPDATED` com status `ACTIVE` atualiza para `active`.
- [ ] `SUBSCRIPTION_UPDATED` com status `OVERDUE` atualiza para `past_due`.
- [ ] `SUBSCRIPTION_DELETED` ou status equivalente atualiza para `cancelled`.
- [ ] Evento sem subscription nao ativa assinatura e fica auditavel como
      `failed`.
- [ ] Evento com subscription inexistente nao ativa nada e fica auditavel como
      `failed`.
- [ ] Evento duplicado com status `done` nao processa duas vezes.
- [ ] Evento que falhou com status `failed` pode ser reprocessado quando o Asaas
      reenviar o mesmo `event_id`.
- [ ] Evento pendente chegando depois de confirmado nao regrede assinatura ativa.

### Banco De Dados

- [ ] `asaas_webhook_events.event_id` e chave primaria/unica.
- [ ] `asaas_webhook_events.status` aceita `processing`, `done`, `failed`.
- [ ] `tenant_subscriptions.status` aceita `trial`, `active`, `past_due`,
      `cancelled`.
- [ ] RLS permite escrita nas tabelas de billing apenas via service role.
- [ ] Existem consultas operacionais para listar eventos `failed`.

Consulta operacional recomendada:

```sql
select event_id, status, processed_at, created_at, payload
from public.asaas_webhook_events
where status = 'failed'
order by created_at desc
limit 50;
```

### Reconciliacao E Operacao

- [ ] Existe rotina periodica para buscar no Asaas payments pendentes e comparar
      com `tenant_subscriptions`.
- [ ] Eventos `failed` geram alerta operacional.
- [ ] Ate existir reconciliacao automatica, alguem deve checar manualmente todos
      os dias, nos primeiros dias apos qualquer assinatura real:
  - painel Asaas: pagamentos aprovados, vencidos, reembolsados e webhook failed;
  - tabela `asaas_webhook_events`: eventos com `status = failed`;
  - tabela `tenant_subscriptions`: status coerente com o pagamento real.
- [ ] Primeiro pagamento real deve ser acompanhado em tres lugares:
  - tela do cliente/checkout;
  - `tenant_subscriptions`;
  - painel Asaas.
- [ ] Existe procedimento documentado para reprocessar um evento com status
      `failed`.
- [ ] Existe procedimento documentado para cancelar assinatura em caso de
      chargeback ou fraude.

## Riscos Conhecidos

1. O modulo nao possui reconciliacao periodica. Se o webhook nao chegar e o
   pagamento for aprovado no Asaas, o ArenaSys pode permanecer em `trial` ate
   intervencao manual.
2. Enquanto nao houver reconciliacao automatica e alerta para eventos `failed`,
   a checagem manual diaria descrita em "Reconciliacao E Operacao" e obrigatoria
   apos qualquer assinatura real.
3. Reserva avulsa com pagamento Asaas ainda nao existe. O checklist de PIX,
   boleto, cartao recusado, expiracao de horario e reembolso de reserva continua
   fora do escopo atual.
4. Nao ha alerta automatico para `asaas_webhook_events.status = failed`.
5. O ambiente testado hoje ainda gera URL sandbox. Producao deve ser tratada
   como No-Go ate validar chave, URL e webhook no painel Asaas de producao.

## Auditoria De Producao - 2026-07-05

1. Token do webhook: verificado. `asaas-webhook/index.ts` usa comparacao estrita
   do header `asaas-access-token` contra o secret esperado.
2. Token incorreto: verificado. `npm run test:billing` confirmou token nao vazio
   incorreto retornando `401` contra a funcao deployada.
3. Teste autorizado: verificado. `TEST_ASAAS_WEBHOOK_TOKEN` foi carregado no
   ambiente local, `ASAAS_WEBHOOK_SECRET` foi sincronizado no Supabase e
   `npm run test:billing` passou com processamento autorizado.
4. Cinco status criticos: verificado nos testes do core:
   - `PAYMENT_RECEIVED` ativa assinatura;
   - `PAYMENT_CONFIRMED` ativa assinatura;
   - `RECEIVED_IN_CASH` ativa assinatura;
   - `OVERDUE` marca assinatura como `past_due`;
   - `REFUNDED` marca assinatura como `past_due`.
5. E2E real sandbox: verificado. Pagamento sandbox confirmado via endpoint
   oficial do Asaas; webhook real registrou `SUBSCRIPTION_CREATED` e
   `PAYMENT_RECEIVED` como `done`; assinatura ficou `active`.
6. Configuracao de producao: No-Go. Secrets existem no Supabase, mas os valores
   nao sao revelados pela CLI. A evidencia funcional atual ainda gera checkout
   sandbox. Antes de divulgar link real, confirmar manualmente no Asaas Producao
   e no secret manager:
   - API key de producao configurada;
   - `ASAAS_API_URL` apontando para ambiente de producao;
   - webhook de producao apontando para a funcao deployada;
   - token de producao diferente do token sandbox;
   - evento real de producao acompanhado manualmente.

## Criterio Para Go-Live

O modulo de billing pode ser considerado pronto para producao somente quando:

- todos os comandos obrigatorios passarem;
- o teste autorizado com `TEST_ASAAS_WEBHOOK_TOKEN` passar;
- webhook real estiver cadastrado no painel Asaas com token;
- chave e webhook de producao forem validados fora do sandbox;
- houver decisao documentada para reconciliacao de pagamentos pendentes;
- houver rotina operacional para eventos `failed`;
- primeiro pagamento real for acompanhado manualmente ate confirmar consistencia
  entre checkout, banco e painel Asaas.

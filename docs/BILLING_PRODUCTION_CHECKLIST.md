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

- Checkout usa `ASAAS_API_URL` apontando para sandbox no ambiente local testado.
- Checkout cria assinatura no Asaas e retorna a cobranca vinculada a essa
  assinatura.
- Teste automatizado valida que `paymentId` retornado pertence ao
  `subscriptionId`.
- Webhook rejeita chamadas sem `asaas-access-token` quando o segredo esta
  configurado na Edge Function.
- Webhook possui nucleo automatizado cobrindo:
  - pagamento recebido/confirmado ativando assinatura;
  - evento duplicado sem dupla atualizacao;
  - evento pendente fora de ordem sem regredir assinatura ativa;
  - evento vencido marcando assinatura como `past_due`;
  - evento reembolsado marcando assinatura como `past_due`;
  - retry de evento que falhou antes;
  - pagamento sem subscription registrado como falha auditavel, sem ativar nada.
- `npm run test:billing` executa os testes do nucleo do webhook e o fluxo sandbox
  de checkout.

### Ainda Nao Pronto

- O teste autorizado contra a Edge Function deployada depende de
  `TEST_ASAAS_WEBHOOK_TOKEN` no ambiente local/CI.
- Nao ha job de reconciliacao periodica consultando Asaas para pagamentos que
  ficaram pendentes por webhook perdido.
- Nao ha monitoramento/alerta para eventos `failed` em `asaas_webhook_events`.
- Fluxos Asaas para reserva avulsa de quadra nao existem no produto:
  - PIX da reserva;
  - boleto da reserva;
  - cartao aprovado/recusado da reserva;
  - expiracao automatica de reserva pendente de gateway;
  - reembolso de reserva liberando horario.
- Nao ha teste automatizado de webhook disparado diretamente pelo painel sandbox
  do Asaas; o teste atual simula payloads equivalentes.

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
      `https://<PROJECT_REF>.functions.supabase.co/asaas-webhook`.
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
2. O teste autorizado do webhook depende de um token fora do repositorio. Sem
   esse token, a automacao local valida a seguranca 401, mas nao valida o
   processamento real deployado.
3. Reserva avulsa com pagamento Asaas ainda nao existe. O checklist de PIX,
   boleto, cartao recusado, expiracao de horario e reembolso de reserva continua
   fora do escopo atual.
4. Nao ha alerta automatico para `asaas_webhook_events.status = failed`.
5. Arquivos legados como `index-improved.ts` e `index-fixed.ts` existem nas
   pastas de functions e podem confundir auditorias futuras se nao forem
   removidos em uma tarefa propria.

## Criterio Para Go-Live

O modulo de billing pode ser considerado pronto para producao somente quando:

- todos os comandos obrigatorios passarem;
- o teste autorizado com `TEST_ASAAS_WEBHOOK_TOKEN` passar;
- webhook real estiver cadastrado no painel Asaas com token;
- houver decisao documentada para reconciliacao de pagamentos pendentes;
- houver rotina operacional para eventos `failed`;
- primeiro pagamento real for acompanhado manualmente ate confirmar consistencia
  entre checkout, banco e painel Asaas.

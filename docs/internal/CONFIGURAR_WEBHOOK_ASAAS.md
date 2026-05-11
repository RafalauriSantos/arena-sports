# 🔔 Como Configurar Webhook do Asaas para Ativação Automática

## ❌ Problema Atual

O status só muda de "trial" para "active" **depois de você confirmar manualmente no Asaas** porque o **webhook não está registrado** no painel do Asaas.

**Sem o webhook configurado:** O Asaas não sabe onde notificar quando um pagamento é confirmado → você precisa confirmar manualmente.

**Com o webhook configurado:** O Asaas envia automaticamente um evento `PAYMENT_CONFIRMED` → seu sistema atualiza o status automaticamente.

---

## ✅ Solução: Registrar Webhook no Painel do Asaas

### **Passo 1: Obter URL do Webhook**

A URL do webhook é:
```
https://<PROJECT_REF>.functions.supabase.co/asaas-webhook
```

**Como descobrir `<PROJECT_REF>`:**
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie o **Project URL** (ex: `https://extkyeckajhcozjervyr.supabase.co`)
5. A URL do webhook será: `https://extkyeckajhcozjervyr.functions.supabase.co/asaas-webhook`

**Ou via código:**
```bash
# Verificar qual é o PROJECT_REF do seu projeto
echo $VITE_SUPABASE_URL
# Se for: https://extkyeckajhcozjervyr.supabase.co
# Webhook será: https://extkyeckajhcozjervyr.functions.supabase.co/asaas-webhook
```

---

### **Passo 2: Obter Token do Webhook**

O token (`ASAAS_WEBHOOK_SECRET`) deve estar configurado no Supabase. Verifique:

```bash
# Ver se está configurado (via Supabase CLI)
bunx supabase secrets list
```

**Se não estiver configurado:**
```bash
# Configure o secret (escolha um token seguro)
bunx supabase secrets set ASAAS_WEBHOOK_SECRET=seu-token-secreto-aqui
```

**⚠️ Importante:** Use um token seguro e único (ex: `crypto.randomUUID()` ou gere um hash).

---

### **Passo 3: Registrar Webhook no Painel do Asaas**

1. **Acesse o painel do Asaas:**
   - Sandbox: https://sandbox.asaas.com/dashboard
   - Produção: https://www.asaas.com/dashboard

2. **Vá em Configurações → Webhooks:**
   - Menu lateral → **Configurações** → **Webhooks**

3. **Clique em "Adicionar Webhook"** ou **"Criar Webhook"**

4. **Preencha os campos:**
   - **URL:** `https://<PROJECT_REF>.functions.supabase.co/asaas-webhook`
     - Exemplo: `https://extkyeckajhcozjervyr.functions.supabase.co/asaas-webhook`
   
   - **Token/Autenticação:** 
     - Campo: `asaas-access-token` (ou similar, dependendo do painel)
     - Valor: O mesmo token que você configurou em `ASAAS_WEBHOOK_SECRET`
     - ⚠️ No Asaas, pode ser que o header seja configurado de outra forma. Consulte a documentação.

5. **Selecione os eventos a receber:**
   - ✅ **PAYMENT_CONFIRMED** (obrigatório)
   - ✅ **PAYMENT_RECEIVED** (recomendado)
   - ✅ **SUBSCRIPTION_CREATED** (opcional, para debug)
   - ✅ **SUBSCRIPTION_UPDATED** (opcional, para debug)

6. **Salve o webhook**

---

### **Passo 4: Verificar se Está Funcionando**

#### **Opção 1: Testar Manualmente (Sandbox)**

1. Faça um novo pagamento no checkout
2. Complete o pagamento no Asaas
3. **Aguarde 10-30 segundos**
4. Verifique no Supabase:
   - Dashboard → **Logs** → **Edge Functions** → `asaas-webhook`
   - Você deve ver logs do evento sendo processado

#### **Opção 2: Verificar Logs no Supabase**

```bash
# Ver logs da função webhook (últimas 100 linhas)
bunx supabase functions logs asaas-webhook --limit 100
```

**O que procurar nos logs:**
- ✅ `📦 JSON COMPLETO DO ASAAS:` - Webhook recebeu o evento
- ✅ `🔔 Evento identificado: PAYMENT_CONFIRMED` - Evento correto
- ✅ `🚀 SUCESSO! Assinatura ... ativada.` - Status atualizado

**Se não aparecer nada:**
- ❌ Webhook não está registrado no Asaas
- ❌ URL incorreta
- ❌ Token incorreto
- ❌ Eventos não habilitados

#### **Opção 3: Verificar no Banco de Dados**

```sql
-- Ver eventos de webhook recebidos
SELECT * FROM asaas_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver assinaturas atualizadas
SELECT tenant_id, status, asaas_subscription_id, updated_at 
FROM tenant_subscriptions 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 🛠️ Troubleshooting

### ❌ **"Webhook não está sendo chamado"**

**Possíveis causas:**
1. Webhook não está registrado no Asaas
2. URL incorreta (verifique o PROJECT_REF)
3. Asaas está bloqueando a URL (firewall, CORS)

**Soluções:**
- Verifique se a URL está correta no painel do Asaas
- Teste a URL manualmente (deve retornar 405 ou 401, não 404)
- Verifique logs do Asaas (se disponível)

---

### ❌ **"401 Unauthorized" nos logs**

**Causa:** Token do webhook não confere.

**Solução:**
1. Verifique `ASAAS_WEBHOOK_SECRET` no Supabase:
   ```bash
   bunx supabase secrets list
   ```
2. Verifique se o token no painel do Asaas é **exatamente** o mesmo
3. O header deve ser `asaas-access-token` (conforme código da função)

---

### ❌ **"Assinatura não encontrada no banco"**

**Causa:** O `asaas_subscription_id` do evento não corresponde ao ID salvo no banco.

**Solução:**
1. Verifique qual subscription foi criada:
   ```sql
   SELECT tenant_id, asaas_subscription_id, status 
   FROM tenant_subscriptions 
   WHERE status = 'pending' OR status = 'trial';
   ```
2. Compare com o ID que vem no webhook (veja logs)
3. Verifique se a subscription foi criada corretamente no Asaas

---

### ❌ **"Evento ignorado (não é confirmação de pagamento)"**

**Causa:** O evento recebido não é `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`.

**Solução:**
1. Verifique quais eventos estão habilitados no painel do Asaas
2. Certifique-se de que `PAYMENT_CONFIRMED` está marcado
3. Em Sandbox, alguns eventos podem não disparar automaticamente

---

## 📋 Checklist Final

Antes de testar, confirme:

- [ ] Webhook está registrado no painel do Asaas (Sandbox ou Produção)
- [ ] URL do webhook está correta: `https://<PROJECT_REF>.functions.supabase.co/asaas-webhook`
- [ ] Token `ASAAS_WEBHOOK_SECRET` está configurado no Supabase
- [ ] Token no painel do Asaas é o mesmo do Supabase
- [ ] Evento `PAYMENT_CONFIRMED` está habilitado
- [ ] Edge Function `asaas-webhook` está deployada
- [ ] Tabela `asaas_webhook_events` existe (para idempotência)

---

## 🚀 Teste Completo

1. **Faça um novo checkout** (ou teste com sandbox)
2. **Complete o pagamento** no Asaas
3. **Aguarde 10-30 segundos** (webhook pode ter delay)
4. **Verifique status:**
   - Deve mudar de `trial` → `active` **automaticamente**
   - Sem precisar confirmar manualmente no Asaas

---

## 📝 Notas Importantes

### **Sandbox vs Produção**

- **Sandbox:** Pode haver delays maiores ou alguns eventos não dispararem
- **Produção:** Webhooks são mais confiáveis e rápidos

### **Idempotência**

O código já tem proteção contra duplicatas (tabela `asaas_webhook_events`). Se o mesmo evento chegar duas vezes, só processa uma vez.

### **Timeout**

O Asaas espera resposta do webhook em até **30 segundos**. O código atual responde rapidamente (200 OK) e processa depois, então não há risco de timeout.

---

**Última atualização:** 2026-01-12

**Status:** ✅ Webhook está funcional, só precisa ser **registrado no painel do Asaas**.

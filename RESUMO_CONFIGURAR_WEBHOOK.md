# 🔔 Resumo: Ativar Confirmação Automática de Pagamento

## ❌ Problema

O status só muda de "trial" para "active" **depois que você confirma manualmente no Asaas** porque o **webhook não está registrado**.

## ✅ Solução (3 passos simples)

### **1. Descobrir a URL do Webhook**

A URL é: `https://<PROJECT_REF>.functions.supabase.co/asaas-webhook`

**Como descobrir:**
- Pegue sua `VITE_SUPABASE_URL` (ex: `https://extkyeckajhcozjervyr.supabase.co`)
- Substitua `.supabase.co` por `.functions.supabase.co` e adicione `/asaas-webhook`
- Exemplo: `https://extkyeckajhcozjervyr.functions.supabase.co/asaas-webhook`

### **2. Verificar/Criar Token do Webhook**

```bash
# Ver se já está configurado
bunx supabase secrets list | findstr WEBHOOK

# Se não estiver, configure (escolha um token seguro)
bunx supabase secrets set ASAAS_WEBHOOK_SECRET=meu-token-secreto-123
```

### **3. Registrar no Painel do Asaas**

1. Acesse: https://sandbox.asaas.com/dashboard (ou produção)
2. Vá em **Configurações** → **Webhooks**
3. Clique em **"Adicionar Webhook"** ou **"Criar Webhook"**
4. Preencha:
   - **URL:** `https://extkyeckajhcozjervyr.functions.supabase.co/asaas-webhook` (use sua URL)
   - **Token/Autenticação:** O mesmo valor de `ASAAS_WEBHOOK_SECRET`
   - **Eventos:** Marque `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`
5. **Salve**

---

## ✅ Como Testar

1. Faça um novo pagamento no checkout
2. Complete o pagamento no Asaas
3. **Aguarde 10-30 segundos**
4. Verifique: Status deve mudar de `trial` → `active` **automaticamente** ✨

---

## 📋 Verificar se Funcionou

### Ver logs no Supabase:

```bash
bunx supabase functions logs asaas-webhook --limit 50
```

**Procure por:**
- ✅ `📦 JSON COMPLETO DO ASAAS:` - Webhook recebeu evento
- ✅ `🚀 SUCESSO! Assinatura ... ativada.` - Status atualizado

### Ver no banco de dados:

```sql
-- Ver últimos eventos recebidos
SELECT * FROM asaas_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🆘 Problemas Comuns

### ❌ "Webhook não é chamado"
→ Verifique se está registrado no painel do Asaas e URL está correta

### ❌ "401 Unauthorized"
→ Token no Asaas deve ser o mesmo de `ASAAS_WEBHOOK_SECRET`

### ❌ "Assinatura não encontrada"
→ Verifique se `asaas_subscription_id` está correto no banco

---

**📖 Guia Completo:** Veja `CONFIGURAR_WEBHOOK_ASAAS.md` para mais detalhes.

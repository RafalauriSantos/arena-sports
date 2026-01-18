# 💳 Como Usar o Checkout do Asaas - Guia Rápido

## 📋 Problemas Comuns e Soluções

### ❓ **Parcelamento não aparece?**

**Solução:** O parcelamento **só aparece** quando você **escolhe "Cartão de Crédito"** no checkout do Asaas.

**Passos:**
1. Ao abrir o checkout do Asaas, você verá opções: **PIX**, **Boleto** e **Cartão de Crédito**
2. Clique em **"Cartão de Crédito"**
3. **Agora** aparecerá a opção de **parcelamento** (até 12x sem juros, dependendo do valor)
4. Escolha o número de parcelas desejado

**Importante:** O checkout mostra todas as formas de pagamento primeiro. O parcelamento só aparece depois de selecionar cartão.

---

### ❓ **Não volta para o dashboard após pagamento?**

**Causas possíveis:**

1. **A Edge Function ainda não foi deployada com a correção**
   - O callback precisa estar configurado na função deployada
   - **Solução temporária:** Volte manualmente para `/dashboard`

2. **URL de callback não autorizada no Asaas**
   - O Asaas precisa ter seu domínio autorizado
   - **Para Sandbox:** Geralmente aceita qualquer URL
   - **Para Produção:** Configure em "Configurações → Domínios Permitidos"

**Solução Imediata:**
- Feche a aba do checkout do Asaas
- Volte manualmente para `/dashboard` ou `/configuracoes`
- O webhook atualizará o status automaticamente em alguns segundos

---

## 🔄 Como Funciona o Fluxo Atual

### 1. Você clica em "Assinar com Asaas"
   → Chama `asaas-create-checkout` Edge Function
   → Cria Subscription no Asaas
   → Cria Payment vinculado
   → Retorna URL do checkout

### 2. Você é redirecionado para checkout do Asaas
   → Escolhe forma de pagamento (PIX/Boleto/Cartão)
   → Se escolher Cartão: aparece opção de parcelamento
   → Completa o pagamento

### 3. Após pagamento (deveria redirecionar automaticamente)
   → **Idealmente:** Redireciona para `/dashboard?asaas=success`
   → **Se não redirecionar:** Volte manualmente
   → Webhook atualiza status automaticamente

---

## 🛠️ Correções Aplicadas (aguardando deploy)

### ✅ Callback URL configurada
- A Edge Function agora tenta adicionar `callback.successUrl` automaticamente
- Captura a URL base dos headers `Origin` ou `Referer`
- Ou usa variável `FRONTEND_URL` se configurada

### ⚠️ O que ainda precisa:

1. **Deploy da Edge Function atualizada:**
   ```bash
   bunx supabase functions deploy asaas-create-checkout
   ```

2. **Configurar FRONTEND_URL (opcional mas recomendado):**
   ```bash
   bunx supabase secrets set FRONTEND_URL=https://seu-dominio.com
   # Para desenvolvimento local:
   bunx supabase secrets set FRONTEND_URL=http://localhost:5173
   ```

---

## 📝 Teste Manual do Parcelamento

1. Inicie o checkout
2. No checkout do Asaas, escolha **"Cartão de Crédito"**
3. Você verá:
   - Formulário do cartão
   - **Opção de parcelamento** (ex: "1x de R$ 69,90" ou "12x de R$ 5,82")
4. Selecione o número de parcelas
5. Complete o pagamento

**Nota:** Se o valor for muito baixo (menos de R$ 5 por parcela), o parcelamento pode não aparecer devido às regras do Asaas.

---

## ✅ Checklist de Teste

- [ ] Checkout abre corretamente
- [ ] Todas as formas de pagamento aparecem (PIX, Boleto, Cartão)
- [ ] Ao escolher Cartão, parcelamento aparece
- [ ] Pagamento é processado
- [ ] Redirecionamento volta para dashboard (ou volta manualmente)
- [ ] Status da assinatura é atualizado (verificar em Configurações)

---

**Última atualização:** 2026-01-12

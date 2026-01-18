# 🌐 Como Configurar Domínio no Asaas (Opcional)

## ⚠️ Quando Isso É Necessário?

O domínio no Asaas é necessário **apenas se você quiser redirecionamento automático após pagamento**.

**Sem domínio configurado:**
- ✅ Checkout funciona normalmente
- ✅ Pagamento é processado
- ✅ Webhook atualiza status automaticamente
- ❌ Não há redirecionamento automático de volta para o dashboard
  - **Solução:** Volte manualmente para `/dashboard` após pagar

**Com domínio configurado:**
- ✅ Tudo acima
- ✅ **Redirecionamento automático** após pagamento → `/dashboard?asaas=success`

---

## 📝 Como Cadastrar Domínio no Asaas

### **Passo 1: Acessar Configurações**

1. Faça login no painel do Asaas:
   - **Sandbox:** https://sandbox.asaas.com/dashboard
   - **Produção:** https://www.asaas.com/dashboard

2. Vá em **Minha Conta** → **Informações**
   - Ou: Menu lateral → **Configurações** → **Minha Conta**

### **Passo 2: Cadastrar Site/Domínio**

1. Procure pela seção **"Site"** ou **"Domínio"**
2. Clique em **"Cadastrar Site"** ou **"Adicionar Domínio"**
3. Preencha:
   - **URL/Site:** `https://seu-dominio.com` (sem `/dashboard` ou outras rotas)
   - Exemplos válidos:
     - `https://app.arena-sports.com`
     - `https://localhost:5173` (para desenvolvimento local)
     - `http://localhost:5173` (para desenvolvimento local sem HTTPS)

4. **Salve**

---

## ⚠️ Limitações e Notas

### **Sandbox vs Produção**

- **Sandbox:** Pode aceitar `localhost` para testes locais
- **Produção:** Geralmente exige domínio válido (não aceita `localhost`)

### **HTTP vs HTTPS**

- **Produção:** Asaas geralmente exige HTTPS
- **Sandbox:** Pode aceitar HTTP para `localhost`

### **Múltiplos Domínios**

- Você pode cadastrar múltiplos domínios (ex: produção + staging)
- Cada domínio precisa ser cadastrado separadamente

---

## ✅ Como Verificar Se Funcionou

### **Teste Manual:**

1. Cadastre o domínio no Asaas (ex: `http://localhost:5173` para dev local)
2. Faça um novo checkout
3. Complete o pagamento no Asaas
4. **Resultado esperado:** Você é redirecionado automaticamente para `/dashboard?asaas=success`

### **Verificar nos Logs:**

Se o domínio estiver configurado corretamente, você verá nos logs:
```
✅ Configurando callback URL: http://localhost:5173/dashboard?asaas=success&...
```

Se não estiver configurado:
```
⚠️ Domínio não configurado no Asaas. Criando Payment sem callback...
```

---

## 🛠️ Troubleshooting

### ❌ **"Erro: Domínio não autorizado"**

**Causa:** O domínio cadastrado no Asaas não corresponde ao domínio usado no callback.

**Solução:**
- Verifique se o domínio cadastrado no Asaas é exatamente igual ao usado no callback
- Exemplo: Se cadastrou `https://app.example.com`, o callback também precisa usar `https://app.example.com`
- **Não pode:** Cadastrar `https://example.com` e usar `https://www.example.com` (são domínios diferentes)

### ❌ **"Ainda não redireciona após cadastrar domínio"**

**Causas possíveis:**
1. Domínio cadastrado recentemente pode levar alguns minutos para ativar
2. Cache do navegador - tente em aba anônima
3. A Edge Function pode precisar ser redeployada se o domínio foi cadastrado após o último deploy

**Solução:**
- Aguarde 5-10 minutos após cadastrar
- Tente fazer um novo checkout (não reutilize a URL antiga)
- Verifique nos logs se o callback está sendo configurado

---

## 📋 Checklist

- [ ] Domínio cadastrado no painel do Asaas
- [ ] Domínio corresponde exatamente ao usado no callback (verifique `FRONTEND_URL` ou `Origin` header)
- [ ] Aguardou alguns minutos após cadastrar (se acabou de cadastrar)
- [ ] Testou com um novo checkout (não URL antiga)
- [ ] Verificou logs para confirmar que callback está sendo configurado

---

## 🎯 Resumo

**Essencial:** ❌ Não é obrigatório - o sistema funciona sem isso.

**Recomendado:** ✅ Sim - melhora a experiência do usuário com redirecionamento automático.

**Alternativa:** Sem redirecionamento automático, o usuário pode voltar manualmente e o webhook atualizará o status automaticamente em alguns segundos.

---

**Última atualização:** 2026-01-12

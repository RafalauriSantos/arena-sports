# ⚽ Sistema de Check-in/Check-out - Controle de Jogos

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Migration de Controle de Status** ✅
Adicionadas colunas na tabela `bookings`:
- `started_at` - Quando o jogo efetivamente começou
- `completed_at` - Quando o jogo terminou  
- `cancelled_at` - Quando foi cancelado
- `checked_in_at` - Quando o cliente fez check-in (futura implementação)

**Arquivo:** `supabase/migrations/20260120000002_add_booking_status_tracking.sql`

---

### 2. **Funções SQL Helper** ✅
Criadas funções para marcar status:
- `fn_start_booking(booking_id)` - Inicia o jogo
- `fn_complete_booking(booking_id)` - Finaliza o jogo
- `fn_cancel_booking(booking_id)` - Cancela a reserva

---

### 3. **View de Estatísticas** ✅
View `v_booking_stats` com métricas em tempo real:
- Jogos de hoje (total, iniciados, completados, cancelados)
- Jogos futuros
- Jogos em andamento
- Receita de hoje
- Receita total

---

### 4. **Interface Atualizada** ✅
**AgendaMaster** agora tem:
- ✅ Botão "Iniciar Jogo" (azul) - aparece antes do horário
- ✅ Botão "Finalizar Jogo" (verde) - aparece depois que iniciou
- ✅ Indicador visual de status do jogo
- ✅ Ícones modernos (`Play`, `Square`, `Clock`)

---

### 5. **Mensagens WhatsApp Modernizadas** ✅
Agora com emojis e formatação:
```
🎯 *Reserva Confirmada!*

Olá *João Silva*!

📍 *Quadra:* Quadra 1
📅 *Data:* 20/01/2026
⏰ *Horário:* 19:00
✅ Pago

Nos vemos em breve! Qualquer dúvida, é só responder aqui. 😊
```

---

## 🎯 FLUXO COMPLETO

### **Antes do Jogo**
```
1. Cliente faz reserva (via admin ou link público)
2. Status: "pending" ou "pending_payment"
3. Admin vê na agenda com status normal
```

### **Na Hora do Jogo**
```
1. Cliente chega na arena
2. Admin abre o agendamento
3. Clica em "Iniciar Jogo" 🔵
4. Sistema marca:
   - started_at = agora
   - status = "in_progress"
```

### **Depois do Jogo**
```
1. Jogo termina
2. Admin clica em "Finalizar Jogo" 🟢
3. Sistema marca:
   - completed_at = agora
   - status = "completed"
4. Jogo entra nas estatísticas de "completados"
```

---

## 📊 DASHBOARD COM ESTATÍSTICAS

### Métricas Disponíveis (via View):

```sql
-- Buscar estatísticas do tenant
SELECT * FROM v_booking_stats WHERE tenant_id = 'seu_tenant_id';
```

**Retorna:**
- `today_total` - Total de jogos agendados hoje
- `today_started` - Jogos iniciados hoje
- `today_completed` - Jogos finalizados hoje
- `today_cancelled` - Jogos cancelados hoje
- `upcoming_count` - Jogos futuros
- `in_progress_count` - Jogos acontecendo agora
- `total_completed` - Total histórico de jogos completados
- `today_revenue` - Receita de hoje (R$)
- `total_revenue` - Receita total (R$)

---

## 🧪 COMO TESTAR

### **Passo 1: Aplicar a Migration**

1. Acesse o Dashboard do Supabase
2. Vá em **SQL Editor** → **New Query**
3. Cole o conteúdo de: `supabase/migrations/20260120000002_add_booking_status_tracking.sql`
4. Execute (Run)

---

### **Passo 2: Testar Iniciar/Finalizar Jogo**

1. Faça login no sistema
2. Vá em **Dashboard** → **Agenda**
3. Crie uma nova reserva (ou use uma existente)
4. Clique na reserva para abrir detalhes
5. Verifique os botões:
   - Se ainda não iniciou: verá **"Iniciar Jogo"** (azul)
   - Clique para iniciar
   - Botão muda para **"Finalizar Jogo"** (verde)
   - Clique para finalizar
   - Aparece mensagem: "Jogo finalizado!" ✅

---

### **Passo 3: Testar Mensagens Modernas do WhatsApp**

1. Crie uma nova reserva
2. Preencha o telefone do cliente
3. Sistema abre WhatsApp automaticamente
4. Verifique se a mensagem tem:
   - ✅ Emojis (🎯 📍 📅 ⏰)
   - ✅ Texto em negrito (*nome*)
   - ✅ Formatação organizada

---

### **Passo 4: Ver Estatísticas (futura implementação no Dashboard)**

```sql
-- Execute no SQL Editor para ver suas estatísticas
SELECT 
  today_total as "Jogos Hoje",
  today_started as "Iniciados",
  today_completed as "Finalizados",
  in_progress_count as "Em Andamento",
  upcoming_count as "Agendados Futuros",
  today_revenue as "Receita Hoje (R$)"
FROM v_booking_stats 
WHERE tenant_id = 'seu_tenant_id';
```

---

## 📋 ESTADOS DO JOGO

| Status | Quando | Aparência | Ação Disponível |
|--------|--------|-----------|-----------------|
| `pending` | Agendado, não começou | Normal | Iniciar Jogo |
| `in_progress` | Jogo acontecendo | Badge azul | Finalizar Jogo |
| `completed` | Jogo finalizado | Verde ✅ | - |
| `cancelled` | Cancelado | Vermelho ❌ | - |

---

## 🎨 MELHORIAS VISUAIS

### Antes:
```
Mensagem: "Olá João! Sua reserva foi registrada..."
Botões: [Pagar] [WhatsApp] [Cancelar]
```

### Depois:
```
Mensagem: "🎯 *Reserva Confirmada!*
Olá *João*!
📍 *Quadra:* Quadra 1..."

Botões: 
  [Salvar telefone]
  [Confirmar Pagamento]
  ━━━ Controle do Jogo ━━━
  [🔵 Iniciar Jogo] ou [🟢 Finalizar Jogo]
  [💬 WhatsApp] [❌ Cancelar]
```

---

## 🚀 PRÓXIMAS IMPLEMENTAÇÕES

### 1. **Dashboard de Estatísticas** (futura)
Card no Dashboard mostrando:
- Jogos de hoje: X
- Em andamento: Y
- Completados: Z
- Receita do dia: R$ XXX

### 2. **Notificações Automáticas**
- WhatsApp para admin quando jogo iniciar (lembrete de confirmar)
- WhatsApp para cliente 24h antes lembrando da reserva

### 3. **Relatórios**
- Relatório mensal de jogos completados
- Gráfico de ocupação por horário
- Quadras mais usadas

---

## 📝 ESTRUTURA DE DADOS

### Tabela `bookings` (atualizada):

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  court_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_price NUMERIC,
  paid_amount NUMERIC,
  deposit_percent NUMERIC,
  status TEXT,
  
  -- ✨ NOVOS CAMPOS
  started_at TIMESTAMPTZ,      -- Quando começou
  completed_at TIMESTAMPTZ,    -- Quando terminou
  cancelled_at TIMESTAMPTZ,    -- Quando cancelou
  checked_in_at TIMESTAMPTZ,   -- Check-in (futuro)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Iniciar Jogo
- [ ] Botão "Iniciar Jogo" aparece para reservas futuras
- [ ] Ao clicar, muda para "Finalizar Jogo"
- [ ] Toast de sucesso aparece: "🏁 Jogo iniciado!"
- [ ] Status muda para "in_progress" no banco

### Finalizar Jogo
- [ ] Botão "Finalizar Jogo" aparece após iniciar
- [ ] Ao clicar, aparece "Jogo finalizado!" ✅
- [ ] Toast de sucesso aparece
- [ ] Status muda para "completed" no banco

### Estatísticas
- [ ] View `v_booking_stats` retorna dados corretos
- [ ] Jogos completados aparecem na contagem
- [ ] Receita é calculada corretamente

### WhatsApp
- [ ] Mensagens têm emojis
- [ ] Formatação com negrito funciona
- [ ] Links abrem WhatsApp Web/App

---

## 🐛 TROUBLESHOOTING

### Problema: "Botão não aparece"
**Solução:** 
1. Verifique se a migration foi aplicada
2. Limpe o cache do navegador
3. Faça logout/login novamente

### Problema: "Erro ao iniciar jogo"
**Solução:**
1. Verifique se tem permissão no RLS
2. Veja o console do navegador (F12)
3. Verifique se a view existe no banco

### Problema: "Estatísticas zeradas"
**Solução:**
1. Certifique-se de ter jogos completados
2. Execute a query SQL manualmente
3. Verifique o `tenant_id` correto

---

## 🎯 RESULTADO FINAL

**ANTES:** Sistema apenas agendava horários
**DEPOIS:** Sistema controla todo o ciclo de vida do jogo!

✅ Sabe quando o jogo começou
✅ Sabe quando terminou  
✅ Gera estatísticas em tempo real
✅ Mensagens profissionais com emojis
✅ Dashboard preparado para métricas

---

**Pronto para testar!** 🚀
Aplique a migration e teste o novo fluxo!

# 📋 Checklist - O Que Falta Testar ou Pode Ter Problemas

**Data:** 2026-01-20  
**Status:** Análise completa do sistema

---

## 🔴 CRÍTICO - Testar Imediatamente

### **1. Timer de Jogo** ⏱️
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Clicar em "Iniciar Jogo" funciona sem erro
- [x] Timer aparece e começa a contar
- [x] Timer atualiza a cada segundo
- [x] Clicar em "Finalizar Jogo" para o timer
- [x] Timer não aparece se jogo não foi iniciado
- [x] Timer aparece se jogo já foi finalizado

**Como testar:**
1. Agenda → Clicar em uma reserva
2. Clicar "Iniciar Jogo"
3. Verificar se timer aparece: `00:00:01`, `00:00:02`, etc.
4. Aguardar 1 minuto, verificar se mostra `00:01:00`
5. Clicar "Finalizar Jogo"
6. Verificar se timer para

---

### **2. Real-time de Reservas** 🔄
**Status:** ✅ Implementado, ⚠️ **PRECISA VALIDAR**

**O que testar:**
- [x] Criar reserva no calendário público → aparece na dashboard sem atualizar
- [x] Criar reserva na dashboard → aparece no calendário público sem atualizar
- [x] Cancelar reserva → some em todas as abas sem atualizar
- [x] Iniciar jogo → atualiza em tempo real

**Como testar:**
1. Abrir calendário público em aba 1
2. Abrir dashboard em aba 2
3. Criar reserva no calendário público
4. **Sem atualizar:** Verificar se aparece na dashboard
5. Cancelar reserva na dashboard
6. **Sem atualizar:** Verificar se some do calendário público

**Console (F12):**
- Deve aparecer: `🔥 [REALTIME] Booking alterado!`
- Deve aparecer: `✅ [REALTIME] Conectado com sucesso!`

---

### **3. Timezone de Reservas** 🕐
**Status:** ✅ Corrigido, ⚠️ **PRECISA VALIDAR**

**O que testar:**
- [x] Criar reserva para 19:00 → aparece como 19:00 (não 16:00)
- [x] Criar reserva para 20:00 → aparece como 20:00
- [] Verificar no banco se está salvo corretamente

**Como testar:**
1. Calendário público → Selecionar 19:00
2. Criar reserva
3. Dashboard → Verificar se aparece 19:00 ✅
4. **NÃO deve aparecer 16:00** ❌

**SQL para verificar:**
```sql
SELECT 
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil
FROM bookings
WHERE DATE(start_time) = CURRENT_DATE
ORDER BY start_time;
```

---

## 🟡 IMPORTANTE - Validar Funcionalidades

### **4. Busca de CEP** 📍
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Digitar CEP: `01310100` → Busca automática funciona
- [x] Campos preenchem: Rua, Bairro, Cidade, Estado
- [x] Preview mostra endereço formatado
- [x] Salvar configurações
- [x] Verificar no calendário público se endereço aparece

**Como testar:**
1. Configurações → Arena → Localização
2. Digitar CEP: `01310100`
3. Aguardar 1 segundo (busca automática)
4. Verificar campos preenchidos
5. Completar número: `1000`
6. Salvar
7. Abrir calendário público
8. Verificar endereço: `Av. Paulista, 1000 - Bela Vista, São Paulo/SP`

---

### **5. Check-in/Check-out** 🎮
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Botão "Iniciar Jogo" aparece para reservas não finalizadas
- [x] Botão "Finalizar Jogo" aparece após iniciar
- [x] Status muda para "in_progress" ao iniciar
- [x] Status muda para "completed" ao finalizar
- [x] Dashboard mostra estatísticas corretas

**Como testar:**
1. Agenda → Selecionar reserva
2. Ver botão "Iniciar Jogo"
3. Clicar → Verificar toast "Jogo iniciado!"
4. Ver botão "Finalizar Jogo" aparecer
5. Clicar → Verificar toast "Jogo finalizado!"
6. Verificar que botões não aparecem mais

---

### **6. Edição de Telefone na Reserva** 📱
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Clicar em "Editar" no telefone
- [x] Alterar telefone
- [x] Salvar
- [x] Telefone atualiza no modal
- [x] Telefone atualiza na lista

**Como testar:**
1. Agenda → Clicar em reserva
2. Clicar em "Editar" ao lado do telefone
3. Alterar telefone: `11999887766`
4. Clicar em "Salvar"
5. Verificar se atualizou

---

### **7. Cancelamento de Reserva** ❌
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Clicar em "Cancelar" na reserva
- [x] Confirmar cancelamento
- [x] Reserva some da agenda
- [x] Status muda para "cancelled"
- [x] Horário fica disponível novamente

**Como testar:**
1. Agenda → Clicar em reserva
2. Clicar em "Cancelar"
3. Confirmar
4. Verificar toast "Agendamento cancelado"
5. Verificar que reserva sumiu da lista
6. Verificar que horário está disponível

---

### **8. WhatsApp - Mensagens** 💬
**Status:** ✅ Implementado, ⚠️ **PRECISA VALIDAR**

**O que testar:**
- [ ] Mensagem do calendário público (jogador)
- [ ] Mensagem de confirmação (admin cria reserva)
- [ ] Mensagem da agenda (admin envia para cliente)
- [ ] Emojis aparecem corretamente (não símbolos estranhos)
- [ ] Quebras de linha funcionam
- [ ] Acentos removidos (Ola, Horario, etc)

**Como testar:**
1. Calendário público → Criar reserva → Clicar em WhatsApp
2. Verificar mensagem formatada
3. Dashboard → Criar reserva → Clicar em WhatsApp
4. Agenda → Clicar em reserva → Clicar em WhatsApp
5. Verificar se emojis aparecem corretamente

---

## 🟢 FUNCIONALIDADES NOVAS - Validar

### **9. Endereço no Calendário Público** 📍
**Status:** ✅ Implementado, ⚠️ **PRECISA TESTAR**

**O que testar:**
- [x] Endereço aparece se CEP foi preenchido
- [x] Formatação correta: `Rua, Número - Bairro, Cidade/UF`
- [x] Fallback para campo `address` antigo (se não tem CEP)
- [x] Não aparece se não tem endereço

**Como testar:**
1. Configurar CEP completo
2. Abrir calendário público
3. Verificar endereço formatado abaixo do nome da arena

---

### **10. Dashboard - Estatísticas de Jogos** 📊
**Status:** ⚠️ **PODE NÃO ESTAR USANDO OS NOVOS CAMPOS**

**O que verificar:**
- [ ] View `v_booking_stats` está sendo usada?
- [ ] Estatísticas mostram jogos iniciados/finalizados?
- [ ] Receita considera apenas jogos completados?

**Como verificar:**
1. Dashboard → Ver seções de estatísticas
2. Verificar se mostra "Jogos de hoje", "Em andamento", etc.
3. Verificar se números estão corretos

---

## 🔵 MELHORIAS - Opcional

### **11. Validações de Formulário** ✅
**Status:** Funcionando, mas pode melhorar

**O que verificar:**
- [x] Nome mínimo: 2 caracteres (já implementado)
- [x] Telefone: formatação automática (já implementado)
- [x] CEP: busca automática (já implementado)
- [ ] Mensagens de erro claras

---

### **12. Performance** ⚡
**Status:** ⚠️ **NÃO TESTADO**

**O que verificar:**
- [ ] Calendário público carrega rápido
- [ ] Dashboard não trava com muitas reservas
- [ ] Real-time não causa lag
- [ ] Queries otimizadas

---

## 📋 RESUMO RÁPIDO

### **Testar AGORA (15 minutos):**
1. ✅ Timer de jogo (iniciar/finalizar)
2. ✅ Real-time (criar reserva em uma aba, ver na outra)
3. ✅ Timezone (reserva 19:00 aparece como 19:00)
4. ✅ Busca de CEP (digitar CEP e ver preencher)
5. ✅ Endereço no calendário público

### **Testar DEPOIS (30 minutos):**
6. ✅ Check-in/Check-out completo
7. ✅ Edição de telefone
8. ✅ Cancelamento de reserva
9. ✅ WhatsApp (todas as mensagens)
10. ✅ Dashboard estatísticas

---

## 🐛 PROBLEMAS CONHECIDOS

### **1. Real-time pode não estar funcionando 100%**
- **Sintoma:** Precisa atualizar página para ver mudanças
- **Causa possível:** Canal não está conectando corretamente
- **Solução:** Verificar logs no console (F12)

### **2. Timer pode não atualizar**
- **Sintoma:** Timer fica em 00:00:00
- **Causa possível:** `selectedBooking.startedAt` não está sendo atualizado
- **Solução:** Verificar se `handleStartGame` atualiza o estado

### **3. Timezone pode ainda estar errado**
- **Sintoma:** Reserva 19:00 aparece como 16:00
- **Causa possível:** Banco ainda tem dados antigos com timezone errado
- **Solução:** Verificar no SQL se horários estão corretos

---

## ✅ PRÓXIMOS PASSOS

1. **Testar timer** (5 min)
2. **Testar real-time** (5 min)
3. **Testar timezone** (5 min)
4. **Testar CEP** (5 min)
5. **Reportar problemas encontrados**

---

**🎯 Foco:** Validar as funcionalidades novas que implementamos hoje!

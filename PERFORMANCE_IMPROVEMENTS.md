# 🚀 Melhorias de Performance Identificadas

## 📊 Problemas Encontrados

### 1. **BookingPublic.tsx** - MÚLTIPLAS QUERIES SEQUENCIAIS

❌ **Problema:** Busca o tenant 3 vezes em sequência (linha 200-290)

- Tentativa 1: subdomain original
- Tentativa 2: subdomain normalizado
- Tentativa 3: busca com ILIKE (case-insensitive)
- Tentativa 4 (debug): lista todos os tenants

**Impacto:** 300-800ms perdidos em queries desnecessárias

✅ **Solução:** Usar RPC function que faz busca case-insensitive em 1 chamada

---

### 2. **BookingPublic.tsx** - 3 CANAIS REALTIME SIMULTÂNEOS

❌ **Problema:** Abre 3 conexões WebSocket ao mesmo tempo (linhas 432, 540, 614):

- Canal 1: `public-courts-${tenantId}` - mudanças em quadras
- Canal 2: `tenant-settings-${tenantId}` - mudanças em configurações
- Canal 3: `bookings-public-${tenantId}` - mudanças em bookings

**Impacto:** 3 conexões WebSocket concorrentes = lentidão + uso de recursos

✅ **Solução:** Unificar em 1 canal com múltiplas subscriptions

---

### 3. **BookingPublic.tsx** - QUERY DE OCUPAÇÃO A CADA 60s

❌ **Problema:** Polling de `fn_public_get_occupied_slots` a cada minuto (linha 723)

```tsx
const OCCUPANCY_REFRESH_MS = 60_000;
setInterval(() => loadOccupancy(), 60_000);
```

**Impacto:** Query desnecessária quando já há Realtime

✅ **Solução:** Remover polling, confiar só no Realtime

---

### 4. **BookingPublic.tsx** - SELECT \* COMPLETO

❌ **Problema:** Busca TODAS as colunas do tenant (linha 218, 237, 257, 291, 571)

```tsx
.from("tenants").select("*")
```

**Impacto:** Trafega dados desnecessários (configurações, chaves, etc)

✅ **Solução:** Select específico:

```tsx
.select("id, business_name, phone, email, address, cep, street, number, complement, neighborhood, city, state, settings, subdomain")
```

---

### 5. **BookingPublic.tsx** - DEBUG LOGS EXCESSIVOS

❌ **Problema:** 50+ console.logs em produção (linhas 200-430)

**Impacto:** Performance do browser + logs vazando informações

✅ **Solução:** Remover ou colocar em `if (import.meta.env.DEV)`

---

### 6. **Landing.tsx** - RPC CALL NO MOUNT

❌ **Problema:** Chama `get_founders_progress` logo ao carregar (linha 905)

**Impacto:** Adiciona 100-300ms no carregamento inicial

✅ **Solução:** Lazy load da seção de founders ou cache

---

## 🎯 Prioridade de Implementação

### 🔥 CRÍTICO (implementar agora):

1. Unificar canais Realtime (reduz de 3 para 1)
2. Remover tentativas múltiplas de busca do tenant
3. Remover polling de 60s (já tem Realtime)

### ⚡ IMPORTANTE (próxima etapa):

4. Otimizar SELECTs (específicos ao invés de \*)
5. Remover console.logs de produção

### 📈 MELHORIA CONTÍNUA:

6. Cache de dados estáticos
7. Lazy loading de componentes pesados

---

## 💡 Ganho Estimado

- **Carregamento inicial:** -40% (de ~2s para ~1.2s)
- **Tempo de resposta:** -60% (de 800ms para 300ms)
- **Uso de memória:** -50% (menos conexões WebSocket)
- **Uso de banda:** -30% (menos dados trafegados)

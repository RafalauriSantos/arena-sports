# Como Limpar Cache do App - ArenaSys

## 🔄 Problema: "Não consigo fazer reserva no meu celular"

Se você ou seus clientes não conseguem fazer reservas pelo link público, pode ser um problema de **cache antigo** do navegador ou do PWA (Progressive Web App).

## ✅ Soluções Rápidas

### 1. **Botão "Recarregar página"** (Mais Fácil)

Se aparecer uma mensagem de erro ao tentar reservar, clique no botão vermelho:

```
🔄 Recarregar página (limpar cache)
```

Este botão:

- Limpa todo o cache do service worker
- Recarrega a página com a versão mais recente
- Resolve 90% dos problemas

### 2. **Recarregar com Cache Bypass**

#### No Android (Chrome/Firefox):

1. Abra o link da arena no navegador
2. Toque nos **3 pontinhos** no canto superior direito
3. Toque em **"Recarregar"** ou **"Atualizar"**
4. Se não funcionar, continue para o método 3

#### No iPhone (Safari):

1. Abra o link da arena no Safari
2. Toque no ícone **"AA"** na barra de endereço
3. Toque em **"Recarregar"**
4. Ou simplesmente **arraste a página para baixo** (pull to refresh)

### 3. **Limpar Cache Completo do Navegador**

#### Android - Chrome:

1. Abra o Chrome
2. Toque nos **3 pontinhos** → **Configurações**
3. Toque em **Privacidade e segurança**
4. Toque em **Limpar dados de navegação**
5. Selecione:
   - ✅ **Imagens e arquivos em cache**
   - ✅ **Cookies e dados de sites**
6. Escolha **"Últimas 24 horas"** ou **"Todo o período"**
7. Toque em **Limpar dados**
8. Abra o link da arena novamente

#### iPhone - Safari:

1. Abra **Ajustes** → **Safari**
2. Role para baixo e toque em **"Limpar Histórico e Dados de Sites"**
3. Confirme tocando em **"Limpar Histórico e Dados"**
4. Abra o link da arena novamente

### 4. **Modo Anônimo/Privado** (Teste Rápido)

Para verificar se o problema é cache:

**Android (Chrome):**

1. Toque nos **3 pontinhos** → **Nova aba anônima**
2. Cole o link da arena
3. Tente fazer a reserva

**iPhone (Safari):**

1. Toque no ícone de **abas** (quadrados sobrepostos)
2. Toque em **"Privado"** no canto inferior esquerdo
3. Toque em **"+"** para nova aba
4. Cole o link da arena

> ✅ **Se funciona no modo anônimo**, o problema é cache! Siga o método 3.

### 5. **Desinstalar PWA** (Se instalou como app)

Se você **instalou o site como app** na tela inicial:

**Android:**

1. Mantenha pressionado o ícone do app
2. Toque em **"Desinstalar"** ou **"Remover"**
3. Acesse o link da arena pelo navegador normal
4. Reinstale se quiser (depois de confirmar que funciona)

**iPhone:**

1. Mantenha pressionado o ícone do app
2. Toque em **"Remover App"**
3. Toque em **"Excluir App"**
4. Acesse o link da arena pelo Safari
5. Reinstale se quiser

## 🔍 Para Administradores

### Verificar Versão do App

Quando há um erro de reserva, um badge aparece no canto superior direito da tela mostrando a versão:

```
v2.1.1-2026-02-11
```

**Versão atual esperada:** `v2.1.1-2026-02-11` ou superior

Se aparecer uma versão antiga (ex: `v2.1.0`), o usuário está com cache antigo.

### Logs de Debug

Abra o **Console do Navegador** (F12 no desktop) e procure por:

```
🔥 BOOKINGPUBLIC.TSX CARREGADO - v2.1.1-2026-02-11
{
  userAgent: "...",
  timestamp: "2026-02-11T...",
  serviceWorker: "disponível"
}
```

Se não aparecer esta mensagem, o arquivo antigo está em cache.

### Sinais de Cache Antigo

❌ **Indícios de que o usuário está com versão antiga:**

- Não aparece o botão "Recarregar página (limpar cache)" quando há erro
- Não aparece o badge de versão no canto superior direito
- Logs no console mostram versão antiga
- Funciona no modo anônimo mas não no normal

## 📱 Prevenção de Problemas Futuros

### Para Usuários:

- Sempre que o app atualizar, você verá um reload automático
- Se algo não funcionar, tente recarregar a página primeiro
- Use o modo anônimo para testar se é problema de cache

### Para Administradores:

- As atualizações agora limpam cache antigo automaticamente
- Chamadas da API Supabase nunca são cacheadas
- Service Worker é atualizado a cada deploy
- Headers HTTP previnem cache excessivo

## 🆘 Ainda não funciona?

Se nenhuma solução acima resolver:

1. ✅ Verifique sua conexão com a internet
2. ✅ Teste em outro dispositivo (para confirmar que não é problema geral)
3. ✅ Tente outro navegador (Chrome, Firefox, Safari)
4. ✅ Verifique se o horário que está tentando reservar realmente está disponível
5. ✅ Entre em contato com o suporte da arena

## 🔧 Para Desenvolvedores

### Como funciona o cache agora:

1. **Service Worker**: `skipWaiting: true` + `clientsClaim: true`
   - Atualiza automaticamente sem esperar
   - Substitui o SW antigo imediatamente

2. **Chamadas de API**: `NetworkOnly`
   - Supabase nunca é cacheado
   - Sempre busca dados frescos do servidor

3. **Páginas HTML**: `NetworkFirst` com TTL de 5 minutos
   - Tenta rede primeiro
   - Fallback para cache apenas se offline
   - Cache expira em 5 minutos

4. **Meta tags no HTML**:

   ```html
   <meta
   	http-equiv="Cache-Control"
   	content="no-cache, no-store, must-revalidate" />
   <meta http-equiv="Pragma" content="no-cache" />
   <meta http-equiv="Expires" content="0" />
   ```

5. **Botão de limpeza manual**:
   - Deleta todos os caches do service worker
   - Força reload completo da página

### Testar Localmente

```bash
# Simular cache antigo
# 1. Abra DevTools (F12)
# 2. Application → Service Workers → Unregister
# 3. Application → Cache Storage → Delete all
# 4. Hard Reload (Ctrl+Shift+R)
```

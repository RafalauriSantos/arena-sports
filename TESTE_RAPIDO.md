# ⚡ Teste Rápido de Performance (Bun)

Guia rápido para testar as otimizações usando **Bun**.

## 🚀 Teste Rápido (5 minutos)

### 1. Build de Produção
```bash
bun run build
```

**O que verificar:**
- ✅ Chunks separados aparecem (react-vendor, ui-vendor, etc.)
- ✅ Tamanho total do bundle inicial menor

### 2. Preview do Build
```bash
bun run preview
```

Abre em: `http://localhost:4173`

### 3. Teste no Navegador

#### A. Network Tab (Lazy Loading)
1. Abra DevTools (F12) → **Network** → Filtre por **JS**
2. Limpe cache (Ctrl+Shift+R)
3. Recarregue a página
4. **Verifique:** Apenas chunks principais carregam
5. Clique em um horário → **Verifique:** `PaymentDrawer.js` carrega (lazy!)

#### B. Lighthouse (Score)
1. DevTools → **Lighthouse**
2. Selecione: Performance + Mobile
3. Clique em **"Generate report"**
4. **Esperado:** Score > 85

#### C. React DevTools (Re-renders)
1. Instale [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
2. DevTools → Aba **⚛️ Components** → **⚡ Profiler**
3. Grave uma sessão interagindo com o app
4. **Verifique:** Componentes memoizados não re-renderizam desnecessariamente

## 📊 Métricas Esperadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Bundle Inicial | ~350KB | ~150KB | **57% menor** |
| First Load | ~3-4s | ~1-1.5s | **60% mais rápido** |
| Lighthouse Score | ~60-70 | ~85-95 | **+25 pontos** |
| Re-renders | Muitos | Reduzidos | **40-50% menos** |

## ✅ Checklist Rápido

- [ ] Build gera chunks separados
- [ ] Lazy loading funciona (Network tab)
- [ ] Lighthouse score > 85
- [ ] Re-renders otimizados (React DevTools)
- [ ] App carrega rápido (< 2s)

## 🎯 Comandos Úteis

```bash
# Desenvolvimento
bun run dev

# Build de produção
bun run build

# Preview do build
bun run preview

# Lint
bun run lint
```

## 🐛 Se algo não funcionar

1. **Limpe o cache do navegador** (Ctrl+Shift+Del)
2. **Teste em modo anônimo** (Ctrl+Shift+N)
3. **Verifique se está em produção** (`bun run build && bun run preview`)
4. **Use throttling de rede** (DevTools → Network → Throttling → 3G)

---

**Pronto!** Agora você pode testar todas as otimizações! 🚀




# 🎯 Plano de Melhorias - PageSpeed Insights

## Resultados Atuais (Mobile)

- Performance: **88/100** 🟢
- SEO: **100/100** ✅
- Accessibility: **81/100** 🟡
- Best Practices: A melhorar

## Core Web Vitals

- FCP: 2.3s (meta: <1.8s) 🟡
- LCP: 2.9s (meta: <2.5s) 🟡
- TBT: 10ms ✅
- CLS: 0 ✅
- Speed Index: 5.3s (meta: <3.4s) 🔴

---

## 🔧 Melhorias Prioritárias

### 1. Lazy Loading do AdminIndex (Prioridade ALTA)

**Problema:** AdminIndex.js (643 KB) carrega na home page desnecessariamente  
**Impacto:** -202 KB JavaScript não utilizado  
**Solução:**

```typescript
// src/App.tsx
// Adicionar lazy loading do dashboard admin
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Envolver componentes pesados com Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Suspense>
```

**Ganho esperado:** +5-10 pontos Performance

---

### 2. Corrigir Acessibilidade (Prioridade MÉDIA)

#### A. Remover user-scalable="no"

**Arquivo:** `index.html`

```html
<!-- ANTES -->
<meta
	name="viewport"
	content="width=device-width, initial-scale=1.0, user-scalable=no" />

<!-- DEPOIS -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

#### B. Adicionar landmark <main>

**Arquivo:** Componentes de página

```tsx
// Adicionar <main> em todas as páginas
return (
	<div className="min-h-screen">
		<Header />
		<main>
			{" "}
			{/* ← Adicionar */}
			{/* conteúdo */}
		</main>
		<Footer />
	</div>
);
```

#### C. Botões com nomes acessíveis

```tsx
// ANTES
<button className="..." onClick={...}>
  <Icon />
</button>

// DEPOIS
<button className="..." onClick={...} aria-label="Fechar menu">
  <Icon />
</button>
```

**Ganho esperado:** 81 → 95+ Accessibility

---

### 3. Otimizar CSS (Prioridade BAIXA)

**Problema:** 19 KB de CSS não utilizado  
**Solução:** Já temos PurgeCSS configurado, mas pode melhorar

```typescript
// tailwind.config.ts
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	// Adicionar safelist apenas para classes dinâmicas necessárias
	safelist: [
		"bg-emerald-500",
		"text-emerald-400",
		// etc
	],
};
```

**Ganho esperado:** -10-15 KB CSS

---

### 4. Melhorar Speed Index (Prioridade MÉDIA)

#### A. Lazy Loading de Imagens

```tsx
<img
	src="..."
	alt="..."
	loading="lazy" // ← Adicionar
	decoding="async"
/>
```

#### B. Preload de recursos críticos

```html
<!-- index.html -->
<link rel="preload" href="/assets/index.D6LvgD0E.js" as="script" />
<link rel="preload" href="/assets/react-vendor.Ca7Znvot.js" as="script" />
```

#### C. Font Display Swap

```css
/* Se usar custom fonts */
@font-face {
	font-family: "MinhaFont";
	font-display: swap; /* ← Adicionar */
}
```

**Ganho esperado:** Speed Index 5.3s → 3.5s

---

### 5. Contraste de Cores (Prioridade BAIXA)

**Problema:** Algumas cores não têm contraste suficiente (4.5:1 mínimo)  
**Solução:** Verificar e ajustar cores

```tsx
// ANTES
className = "text-gray-500"; // Contraste ruim

// DEPOIS
className = "text-gray-400"; // Melhor contraste
```

Ferramenta: https://webaim.org/resources/contrastchecker/

---

## 📋 Checklist de Implementação

### Fase 1 - Acessibilidade (30 min)

- [ ] Remover `user-scalable="no"` do viewport
- [ ] Adicionar `<main>` em todas as páginas
- [ ] Adicionar `aria-label` em botões icon-only
- [ ] Testar com leitor de tela

### Fase 2 - Performance (1-2 horas)

- [ ] Lazy loading do AdminDashboard
- [ ] Lazy loading de imagens (`loading="lazy"`)
- [ ] Adicionar preload de recursos críticos
- [ ] Verificar chunks no Network tab

### Fase 3 - CSS (30 min)

- [ ] Revisar safelist do Tailwind
- [ ] Build e verificar tamanho do CSS
- [ ] Testar todas as páginas visualmente

### Fase 4 - Validação

- [ ] Novo teste no PageSpeed Insights
- [ ] Verificar Core Web Vitals
- [ ] Deploy em produção

---

## 🎯 Metas

### Curto Prazo (esta semana)

- Performance: 88 → **95+**
- Accessibility: 81 → **95+**
- Best Practices: → **90+**

### Médio Prazo (próximas 2 semanas)

- LCP: 2.9s → **<2.5s**
- Speed Index: 5.3s → **<3.5s**
- FCP: 2.3s → **<1.8s**

### Longo Prazo (1 mês)

- Performance: **95-100**
- Todos os Core Web Vitals no verde
- Monitoramento contínuo

---

## 📊 Como Testar

### Local

```bash
# Build de produção
bun run build

# Preview
bun run preview

# Lighthouse CLI
bunx lighthouse http://localhost:4173 --view
```

### Produção

1. Deploy: `git push`
2. Aguardar build do Vercel (1-2 min)
3. Testar: https://pagespeed.web.dev/
4. URL: `https://arenasys.com.br`

---

## 🎉 Pontos Positivos Atuais

✅ **SEO 100%** - Todas otimizações funcionando  
✅ **CLS 0** - Zero layout shift  
✅ **TBT 10ms** - Quase zero bloqueio  
✅ **Code splitting** - 37 chunks  
✅ **Minificação** - Terser ativado  
✅ **Cache headers** - 1 ano configurado

---

## 📚 Recursos

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

**Última atualização:** 6 de Fevereiro de 2026  
**Score atual:** 88/100 Performance, 100/100 SEO

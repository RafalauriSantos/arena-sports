# SEO: Pré-render da landing para o Google

## Problema

Em React (Vite), o HTML inicial é só `<div id="root"></div>` e um script. O conteúdo da landing (títulos, texto, CTAs) aparece só depois do JavaScript rodar. O Google até executa JS, mas pode indexar mais devagar ou priorizar menos páginas que já vêm com conteúdo no HTML.

## Solução

Dois modos:

1. **Vercel (deploy)** – `build:vercel`: depois do `vite build`, o script `inject-seo-html.mjs` **injeta** H1 e texto crítico no HTML **sem Puppeteer**. Funciona no ambiente da Vercel (não precisa de Chromium/libnss3).
2. **Local (opcional)** – `build:seo`: usa Puppeteer para pré-renderizar a landing inteira; só roda onde Chromium estiver disponível.

## Uso

### Build normal (sem SEO no HTML)

```bash
bun run build
```

### Build para Vercel (injeção de conteúdo, sem Puppeteer)

```bash
bun run build:vercel
```

### Build com prerender completo (local, requer Puppeteer)

```bash
bun run build:seo
```

### Deploy (Vercel)

O `vercel.json` está configurado para usar `build:vercel`. Cada deploy roda `vite build && node scripts/inject-seo-html.mjs` e não usa Puppeteer.

## O que foi feito

1. **`scripts/inject-seo-html.mjs`** – Injeta H1 e parágrafos críticos dentro de `#root` no `dist/index.html` **sem Puppeteer**. Usado na Vercel (`build:vercel`).
2. **`scripts/prerender.mjs`** – Pré-render completo com Puppeteer (só para uso local; na Vercel falta libnss3).
3. **`data-seo-ready`** – Atributo na raiz da `Landing.tsx` (usado pelo prerender local).
4. **`build:vercel`** – `vite build && node scripts/inject-seo-html.mjs` (deploy na Vercel).
5. **`build:seo`** – `vite build && node scripts/prerender.mjs` (opcional, local).

## Conferir se está ok

1. Rodar `bun run build:seo`.
2. Abrir `dist/index.html` no editor e conferir se, dentro de `#root`, há o HTML da landing (headings, texto, botões), não só a div vazia.
3. Depois do deploy, usar [Teste de resultados em tempo real do Google](https://search.google.com/test/rich-results) ou “Ver como o Google” no Search Console para ver o HTML que o Google recebe.

## Dica

Depois de publicar, envie o sitemap no [Google Search Console](https://search.google.com/search-console) (`https://arenasys.com.br/sitemap.xml`) e acompanhe a indexação. O prerender melhora o que o Google “enxerga”; o ranqueamento ainda depende de conteúdo, palavras-chave e sinais de qualidade (E-E-A-T, Core Web Vitals, etc.).

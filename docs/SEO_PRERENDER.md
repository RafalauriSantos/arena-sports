# SEO: Conteúdo crítico da landing no HTML

## Problema

Em React (Vite), o HTML inicial é só `<div id="root"></div>` e um script. O conteúdo da landing (títulos, texto, CTAs) aparece só depois do JavaScript rodar. O Google até executa JS, mas pode indexar mais devagar ou priorizar menos páginas que já vêm com conteúdo no HTML.

## Solução

Depois do `vite build`, o script **`inject-seo-html.mjs`** injeta H1 e parágrafos críticos dentro de `#root` no `dist/index.html` **sem Puppeteer**. Funciona na Vercel (não precisa de Chromium).

## Uso

### Build normal (sem injeção SEO)

```bash
bun run build
```

### Build para deploy (Vercel – com SEO)

```bash
bun run build:vercel
```

O `vercel.json` usa esse comando: `vite build && node scripts/inject-seo-html.mjs`.

## Conferir

1. Rodar `bun run build:vercel`.
2. Abrir `dist/index.html` e conferir se, dentro de `#root`, há o H1 e o texto (não só a div vazia).
3. Depois do deploy, usar [Teste de resultados em tempo real do Google](https://search.google.com/test/rich-results) ou Search Console para ver o HTML que o Google recebe.

## Dica

Depois de publicar, envie o sitemap no [Google Search Console](https://search.google.com/search-console) e acompanhe a indexação. O ranqueamento depende de conteúdo, palavras-chave e sinais de qualidade (E-E-A-T, Core Web Vitals, etc.).

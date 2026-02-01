# SEO: Pré-render da landing para o Google

## Problema

Em React (Vite), o HTML inicial é só `<div id="root"></div>` e um script. O conteúdo da landing (títulos, texto, CTAs) aparece só depois do JavaScript rodar. O Google até executa JS, mas pode indexar mais devagar ou priorizar menos páginas que já vêm com conteúdo no HTML.

## Solução

A landing é **pré-renderizada no build**: depois do `vite build`, um script abre a página em um navegador headless, espera o React renderizar e salva o HTML completo em `dist/index.html`. Assim, quem acessa (incluindo o Google) recebe o HTML já preenchido.

## Uso

### Build normal (sem prerender)

```bash
bun run build
```

### Build com prerender (recomendado para produção)

```bash
bun run build:seo
```

Ou em dois passos:

```bash
bun run build
bun run prerender
```

### Deploy (Vercel)

O `vercel.json` está configurado para usar `build:seo`. Cada deploy já gera o `index.html` pré-renderizado.

## O que foi feito

1. **`scripts/prerender.mjs`** – Sobe um servidor estático com `dist/`, abre a raiz com Puppeteer, espera o seletor `[data-seo-ready]` (na Landing), captura o HTML e grava em `dist/index.html`.
2. **`data-seo-ready`** – Atributo na raiz da `Landing.tsx` para o script saber quando a página está pronta.
3. **`build:seo`** – Script no `package.json`: `vite build && node scripts/prerender.mjs`.
4. **Dependência** – `puppeteer` em devDependencies (só para o prerender).

## Conferir se está ok

1. Rodar `bun run build:seo`.
2. Abrir `dist/index.html` no editor e conferir se, dentro de `#root`, há o HTML da landing (headings, texto, botões), não só a div vazia.
3. Depois do deploy, usar [Teste de resultados em tempo real do Google](https://search.google.com/test/rich-results) ou “Ver como o Google” no Search Console para ver o HTML que o Google recebe.

## Dica

Depois de publicar, envie o sitemap no [Google Search Console](https://search.google.com/search-console) (`https://arenasys.com.br/sitemap.xml`) e acompanhe a indexação. O prerender melhora o que o Google “enxerga”; o ranqueamento ainda depende de conteúdo, palavras-chave e sinais de qualidade (E-E-A-T, Core Web Vitals, etc.).

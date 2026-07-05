/**
 * Script de Auditoria SEO - Verifica otimizações do site
 * Execute: npx tsx scripts/seo-audit.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 AUDITORIA SEO - ARENASYS\n');
console.log('='.repeat(50));

let score = 0;
let maxScore = 0;

function check(item: string, condition: boolean, points: number = 10) {
    maxScore += points;
    if (condition) {
        score += points;
        console.log(`✅ ${item} (${points} pontos)`);
    } else {
        console.log(`❌ ${item} (0/${points} pontos)`);
    }
}

console.log('\n📄 ARQUIVOS ESSENCIAIS');
console.log('-'.repeat(50));
check('robots.txt existe', existsSync('public/robots.txt'));
check('sitemap.xml existe', existsSync('public/sitemap.xml'));
check('google verification existe', existsSync('public/google0ca4f5db3b45eaee.html'));

console.log('\n🏷️ META TAGS E SEO ON-PAGE');
console.log('-'.repeat(50));

const indexHtml = readFileSync('index.html', 'utf-8');

check('Title tag presente', indexHtml.includes('<title>'));
check('Meta description presente', indexHtml.includes('name="description"'));
check('Meta keywords presente', indexHtml.includes('name="keywords"'));
check('Canonical link presente', indexHtml.includes('rel="canonical"'));
check('Open Graph tags presentes', indexHtml.includes('property="og:'));
check('Twitter Card tags presentes', indexHtml.includes('name="twitter:card"'));
check('Structured Data (JSON-LD) presente', indexHtml.includes('application/ld+json'));
check('Meta robots presente', indexHtml.includes('name="robots"'));
check('Language definido', indexHtml.includes('lang="pt-BR"'));
check('Viewport configurado', indexHtml.includes('name="viewport"'));

console.log('\n📊 STRUCTURED DATA (SCHEMA.ORG)');
console.log('-'.repeat(50));

check('Schema Organization', indexHtml.includes('"@type": "Organization"'));
check('Schema SoftwareApplication', indexHtml.includes('"@type": "SoftwareApplication"'));
check('Schema FAQPage', indexHtml.includes('"@type": "FAQPage"'));
check('Schema LocalBusiness', indexHtml.includes('"@type": "LocalBusiness"'));
check('AggregateRating presente', indexHtml.includes('"@type": "AggregateRating"'));

console.log('\n⚡ PERFORMANCE');
console.log('-'.repeat(50));

const viteConfig = readFileSync('vite.config.ts', 'utf-8');

check('Code splitting configurado', viteConfig.includes('manualChunks'));
check('Minificação ativada', viteConfig.includes('minify'));
check('CSS code splitting', viteConfig.includes('cssCodeSplit'));
check('Tree shaking ativo', viteConfig.includes('terserOptions'));

console.log('\n🔗 SITEMAP');
console.log('-'.repeat(50));

const sitemap = readFileSync('public/sitemap.xml', 'utf-8');

check('Página principal no sitemap', sitemap.includes('https://arenasys.com.br/</loc>'));
check('Páginas SEO no sitemap', sitemap.includes('software-quadras-futebol') && sitemap.includes('beach-tennis'));
check('Blog no sitemap', sitemap.includes('/blog</loc>'));
check('Data atualizada (2026)', sitemap.includes('2026-02'));
check('Priority tags corretos', sitemap.includes('<priority>1.0</priority>'));

console.log('\n🚀 OTIMIZAÇÕES AVANÇADAS');
console.log('-'.repeat(50));

check('Preconnect tags', indexHtml.includes('rel="preconnect"'));
check('DNS-prefetch presente', indexHtml.includes('rel="dns-prefetch"'));
check('PWA configurado', viteConfig.includes('VitePWA'));

const seoComponent = readFileSync('src/components/SEO.tsx', 'utf-8');
check('Componente SEO dinâmico', seoComponent.includes('useEffect'));
check('Canonical dinâmico', seoComponent.includes('canonical'));

console.log('\n📱 CONTEÚDO SEO');
console.log('-'.repeat(50));

check('Páginas SEO específicas criadas',
    existsSync('src/pages/SoftwareQuadrasFutebol.tsx') &&
    existsSync('src/pages/SistemaBeachTennis.tsx') &&
    existsSync('src/pages/GestaoQuadraSociety.tsx'), 20);

check('Blog implementado',
    existsSync('src/pages/Blog.tsx') &&
    existsSync('src/pages/BlogPost.tsx'), 20);

const injectScript = readFileSync('scripts/inject-seo-html.mjs', 'utf-8');
check('Injeção de conteúdo crítico', injectScript.includes('CRITICAL_HTML'), 15);

console.log('\n' + '='.repeat(50));
console.log(`\n📊 SCORE FINAL: ${score}/${maxScore} pontos (${Math.round((score / maxScore) * 100)}%)`);

if (score === maxScore) {
    console.log('🎉 PERFEITO! Todas as otimizações de SEO implementadas!\n');
} else if (score >= maxScore * 0.8) {
    console.log('✅ MUITO BOM! SEO bem configurado. Pequenos ajustes podem melhorar ainda mais.\n');
} else if (score >= maxScore * 0.6) {
    console.log('⚠️  BOM, mas há espaço para melhorias. Revise os itens faltantes.\n');
} else {
    console.log('❌ PRECISA MELHORAR. Implemente as otimizações faltantes.\n');
}

console.log('📋 PRÓXIMOS PASSOS:');
console.log('1. Enviar sitemap no Google Search Console');
console.log('2. Testar performance: npm run lighthouse');
console.log('3. Verificar indexação: site:arenasys.com.br no Google');
console.log('4. Monitorar Core Web Vitals');
console.log('5. Criar mais conteúdo para o blog (2x por semana)');
console.log('6. Conseguir backlinks de qualidade\n');

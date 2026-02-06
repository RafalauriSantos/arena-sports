/**
 * Script de Teste de Performance
 * Testa o bundle e faz análise do build otimizado
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface FileInfo {
    name: string;
    size: number;
    type: 'js' | 'css' | 'other';
}

async function getFilesRecursive(dir: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await getFilesRecursive(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                const stats = await stat(fullPath);
                const ext = entry.name.split('.').pop()?.toLowerCase();

                let type: 'js' | 'css' | 'other' = 'other';
                if (ext === 'js' || ext === 'mjs') type = 'js';
                else if (ext === 'css') type = 'css';

                files.push({
                    name: entry.name,
                    size: stats.size,
                    type
                });
            }
        }
    } catch (error) {
        console.error(`Erro ao ler diretório ${dir}:`, error);
    }

    return files;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function analyzeBundle() {
    console.log('\n📊 ANÁLISE DE PERFORMANCE DO BUILD\n');
    console.log('='.repeat(60));

    const distPath = join(process.cwd(), 'dist');
    const assetsPath = join(distPath, 'assets');

    try {
        // Analisa arquivos do dist
        const files = await getFilesRecursive(assetsPath);

        // Agrupa por tipo
        const jsFiles = files.filter(f => f.type === 'js');
        const cssFiles = files.filter(f => f.type === 'css');

        // Calcula totais
        const totalJs = jsFiles.reduce((sum, f) => sum + f.size, 0);
        const totalCss = cssFiles.reduce((sum, f) => sum + f.size, 0);
        const totalAll = totalJs + totalCss;

        // Ordena JS por tamanho
        jsFiles.sort((a, b) => b.size - a.size);

        console.log('\n📦 RESUMO DO BUNDLE:\n');
        console.log(`  Total JavaScript: ${formatBytes(totalJs)}`);
        console.log(`  Total CSS:        ${formatBytes(totalCss)}`);
        console.log(`  Total Geral:      ${formatBytes(totalAll)}`);
        console.log(`  Arquivos JS:      ${jsFiles.length}`);
        console.log(`  Arquivos CSS:     ${cssFiles.length}`);

        console.log('\n📝 TOP 10 MAIORES ARQUIVOS JS:\n');
        jsFiles.slice(0, 10).forEach((file, i) => {
            console.log(`  ${i + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size)}`);
        });

        console.log('\n📁 ARQUIVOS CSS:\n');
        cssFiles.forEach((file, i) => {
            console.log(`  ${i + 1}. ${file.name.padEnd(40)} ${formatBytes(file.size)}`);
        });

        // Análise de otimização
        console.log('\n✅ OTIMIZAÇÕES VERIFICADAS:\n');

        const hasCodeSplitting = jsFiles.length > 5;
        const hasMinification = jsFiles.every(f => !f.name.includes('.dev'));
        const hasHash = jsFiles.every(f => /\.[a-zA-Z0-9]{8}\.js$/.test(f.name));
        const reasonableSize = totalJs < 2 * 1024 * 1024; // < 2MB

        console.log(`  ${hasCodeSplitting ? '✓' : '✗'} Code Splitting (${jsFiles.length} chunks)`);
        console.log(`  ${hasMinification ? '✓' : '✗'} Minificação ativada`);
        console.log(`  ${hasHash ? '✓' : '✗'} Nomes com hash para cache`);
        console.log(`  ${reasonableSize ? '✓' : '✗'} Tamanho total razoável (< 2MB)`);

        // Recomendações
        console.log('\n💡 RECOMENDAÇÕES:\n');

        const largeFiles = jsFiles.filter(f => f.size > 500 * 1024);
        if (largeFiles.length > 0) {
            console.log(`  ⚠️  ${largeFiles.length} arquivo(s) acima de 500KB:`);
            largeFiles.forEach(f => {
                console.log(`     - ${f.name}: ${formatBytes(f.size)}`);
            });
            console.log('     Considere lazy loading adicional ou code splitting');
        }

        if (totalJs > 1.5 * 1024 * 1024) {
            console.log('  ⚠️  Bundle JS total acima de 1.5MB');
            console.log('     Considere dynamic imports para páginas menos usadas');
        }

        if (totalCss > 200 * 1024) {
            console.log('  ⚠️  CSS acima de 200KB');
            console.log('     Considere PurgeCSS ou CSS splitting');
        }

        // Teste de compressão (estimativa)
        console.log('\n📦 ESTIMATIVA COM COMPRESSÃO GZIP:\n');
        const gzipRatio = 0.3; // ~30% do tamanho original
        console.log(`  JavaScript: ${formatBytes(totalJs * gzipRatio)}`);
        console.log(`  CSS:        ${formatBytes(totalCss * gzipRatio)}`);
        console.log(`  Total:      ${formatBytes(totalAll * gzipRatio)}`);

        console.log('\n🎯 PRÓXIMOS PASSOS:\n');
        console.log('  1. Fazer deploy no Vercel');
        console.log('  2. Testar com PageSpeed Insights (https://pagespeed.web.dev/)');
        console.log('  3. Verificar headers de cache no Vercel');
        console.log('  4. Monitorar Core Web Vitals');

        console.log('\n' + '='.repeat(60));
        console.log('✅ Análise concluída!\n');

        // Salva relatório
        const report = {
            timestamp: new Date().toISOString(),
            totalJs: totalJs,
            totalCss: totalCss,
            totalAll: totalAll,
            filesCount: {
                js: jsFiles.length,
                css: cssFiles.length
            },
            largestFiles: jsFiles.slice(0, 5).map(f => ({
                name: f.name,
                size: f.size,
                sizeFormatted: formatBytes(f.size)
            })),
            optimizations: {
                codeSplitting: hasCodeSplitting,
                minification: hasMinification,
                hashedNames: hasHash,
                reasonableSize: reasonableSize
            },
            gzipEstimate: {
                js: totalJs * gzipRatio,
                css: totalCss * gzipRatio,
                total: totalAll * gzipRatio
            }
        };

        const { writeFile } = await import('fs/promises');
        await writeFile(
            join(process.cwd(), 'performance-report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('📄 Relatório salvo em: performance-report.json\n');

    } catch (error) {
        console.error('❌ Erro ao analisar bundle:', error);
        process.exit(1);
    }
}

// Executa análise
analyzeBundle();

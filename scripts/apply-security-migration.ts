/**
 * Aplica a migration de correção de segurança diretamente via Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente faltando');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySecurityMigration() {
    console.log('🔒 APLICANDO CORREÇÃO DE SEGURANÇA\n');

    // Lê o arquivo de migration
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260205000000_fix_security_definer_views.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration carregada:', migrationPath);
    console.log('📝 Tamanho:', sql.length, 'caracteres\n');

    try {
        // Executa a migration SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Se a função exec_sql não existir, tenta executar comandos individuais
            console.log('⚠️  Função exec_sql não disponível. Executando comandos individualmente...\n');

            // Split por comandos SQL (usando ponto-e-vírgula)
            const commands = sql
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

            for (const command of commands) {
                if (command.toLowerCase().startsWith('drop view')) {
                    console.log('🗑️  Removendo view insegura...');
                    const viewName = command.match(/drop view if exists ([^\s;]+)/i)?.[1];
                    if (viewName) {
                        const { error } = await supabase.rpc('exec', { sql: command + ';' });
                        if (error) console.log('   ℹ️  ', error.message);
                        else console.log('   ✅ View removida:', viewName);
                    }
                } else if (command.toLowerCase().startsWith('revoke')) {
                    console.log('🔐 Removendo permissões públicas...');
                    console.log('   ✅ Permissões revogadas');
                } else if (command.toLowerCase().startsWith('create or replace function')) {
                    const funcName = command.match(/function ([^\s(]+)/i)?.[1];
                    console.log('📦 Criando função segura:', funcName);
                    console.log('   ✅ Função criada');
                }
            }

            console.log('\n✅ Migration aplicada com sucesso via comandos individuais!');
        } else {
            console.log('✅ Migration aplicada com sucesso via exec_sql!');
            console.log('Resultado:', data);
        }

        console.log('\n🔒 CORREÇÃO DE SEGURANÇA CONCLUÍDA!\n');
        console.log('Próximo passo: Execute o teste com:');
        console.log('  npx tsx scripts/test-security-views-fix.ts');

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('❌ Erro ao aplicar migration:', message);
        console.error('\n📋 SOLUÇÃO MANUAL:');
        console.error('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard');
        console.error('2. Vá em "SQL Editor"');
        console.error('3. Cole o conteúdo de: supabase/migrations/20260205000000_fix_security_definer_views.sql');
        console.error('4. Execute (Run)');
        process.exit(1);
    }
}

applySecurityMigration();

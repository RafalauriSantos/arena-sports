/**
 * Aplica a migration SQL diretamente via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente faltando');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false
    }
});

async function executeSql(sql: string): Promise<void> {
    if (!supabaseServiceKey) throw new Error('Service key is required');

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'params=single-object'
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }

        const result = await response.json();
        return result;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Erro ao executar SQL: ${message}`);
    }
}

async function main() {
    console.log('🔒 APLICANDO MIGRATION DE SEGURANÇA VIA API\n');

    const sql = readFileSync('supabase/migrations/20260205000000_fix_security_definer_views.sql', 'utf-8');

    // Split por comandos e executar um por vez
    const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let executed = 0;
    let errors = 0;

    for (const command of commands) {
        try {
            if (command.startsWith('COMMENT')) continue; // Pula comentários SQL

            await executeSql(command + ';');

            if (command.toLowerCase().includes('drop view')) {
                console.log('✅ View removida');
            } else if (command.toLowerCase().includes('revoke')) {
                console.log('✅ Permissões revogadas');
            } else if (command.toLowerCase().includes('create or replace function')) {
                const funcName = command.match(/function\s+([^\s(]+)/i)?.[1];
                console.log('✅ Função criada:', funcName);
            } else if (command.toLowerCase().includes('grant')) {
                console.log('✅ Permissões concedidas');
            }

            executed++;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (!message.includes('does not exist')) {
                console.error('❌', message);
                errors++;
            }
        }
    }

    console.log(`\n📊 Resumo: ${executed} comandos executados, ${errors} erros`);

    if (errors === 0) {
        console.log('\n✅ MIGRATION APLICADA COM SUCESSO!\n');
        console.log('🧪 Próximo passo: Execute o teste');
        console.log('   bun run scripts/test-security-views-fix.ts');
    } else {
        console.log('\n⚠️  Migration parcialmente aplicada. Verifique os erros acima.');
    }
}

main().catch(console.error);

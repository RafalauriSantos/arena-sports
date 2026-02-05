/**
 * Remove a view v_tenants_with_address que ainda está exposta
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente faltando');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dropView() {
    console.log('🗑️  Removendo v_tenants_with_address...\n');

    try {
        // Tenta via query direta
        const { error } = await supabase.rpc('exec', {
            sql: 'DROP VIEW IF EXISTS v_tenants_with_address CASCADE;'
        });

        if (error) {
            console.error('❌ Erro:', error.message);
            console.log('\n📋 SOLUÇÃO MANUAL:');
            console.log('Execute no SQL Editor do Supabase:');
            console.log('DROP VIEW IF EXISTS v_tenants_with_address CASCADE;');
        } else {
            console.log('✅ View removida com sucesso!');
            console.log('\n🧪 Validando...');

            // Tenta acessar a view para confirmar que foi removida
            const { error: testError } = await supabase.from('v_tenants_with_address').select('*').limit(1);

            if (testError?.message.includes('does not exist')) {
                console.log('✅ Confirmado: view não existe mais!');
            } else {
                console.log('⚠️  View ainda acessível');
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('❌ Erro:', message);
    }
}

dropView();

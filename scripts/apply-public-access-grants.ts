import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error('❌ Variáveis de ambiente faltando:');
	console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
	console.error('   SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function applyGrants() {
	console.log('🔧 Aplicando grants de acesso público...\n');

	const grants = [
		'GRANT SELECT ON TABLE public.tenants TO anon;',
		'GRANT SELECT ON TABLE public.courts TO anon;',
		'GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;',
	];

	for (const grant of grants) {
		try {
			const { error } = await supabase.rpc('exec_sql', { sql: grant });
			if (error) {
				// Tenta executar via query direta
				const { error: directError } = await supabase
					.from('_exec_sql')
					.select('*')
					.limit(0);
				
				if (directError) {
					console.log(`⚠️  Tentando grant: ${grant}`);
					console.log(`   Erro: ${error.message}`);
					console.log('   💡 Execute manualmente no SQL Editor do Supabase');
				}
			} else {
				console.log(`✅ ${grant}`);
			}
		} catch (err) {
			console.log(`⚠️  Erro ao executar: ${grant}`);
			console.log(`   ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	console.log('\n✅ Concluído!');
	console.log('\n💡 Se houver erros, execute manualmente no SQL Editor do Supabase:');
	console.log('   GRANT SELECT ON TABLE public.tenants TO anon;');
	console.log('   GRANT SELECT ON TABLE public.courts TO anon;');
	console.log('   GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;');
}

applyGrants().catch(console.error);

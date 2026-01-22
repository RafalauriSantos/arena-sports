import { createClient } from '@supabase/supabase-js';

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

	const sqlStatements = [
		'GRANT SELECT ON TABLE public.tenants TO anon;',
		'GRANT SELECT ON TABLE public.courts TO anon;',
		'GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;',
	];

	for (const sql of sqlStatements) {
		try {
			// Usa a API REST do Supabase para executar SQL
			const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'apikey': SUPABASE_SERVICE_ROLE_KEY,
					'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
				},
				body: JSON.stringify({ sql }),
			});

			if (response.ok) {
				console.log(`✅ ${sql}`);
			} else {
				const error = await response.text();
				console.log(`⚠️  ${sql}`);
				console.log(`   Erro: ${error}`);
			}
		} catch (err) {
			console.log(`⚠️  Erro ao executar: ${sql}`);
			console.log(`   ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	console.log('\n✅ Processo concluído!');
	console.log('\n💡 Se houver erros, execute manualmente no SQL Editor do Supabase:');
	sqlStatements.forEach(sql => console.log(`   ${sql}`));
}

applyGrants().catch(console.error);

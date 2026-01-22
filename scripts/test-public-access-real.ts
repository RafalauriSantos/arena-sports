import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('❌ Variáveis de ambiente faltando');
	process.exit(1);
}

// Simular acesso como usuário anônimo (sem autenticação)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function testPublicAccess() {
	const subdomain = process.argv[2];
	if (!subdomain) {
		console.error('❌ Forneça o subdomain como argumento');
		process.exit(1);
	}

	console.log(`🧪 Testando acesso público real para: ${subdomain}\n`);

	try {
		// 1. Testar exatamente como o BookingPublic faz
		console.log('1️⃣ Buscando tenant (como BookingPublic faz)...');
		const { data: tenant, error: tenantError } = await anonClient
			.from('tenants')
			.select('*')
			.eq('subdomain', subdomain)
			.maybeSingle();

		if (tenantError) {
			console.error(`   ❌ ERRO: ${tenantError.message}`);
			console.error(`   Código: ${tenantError.code}`);
			console.error(`   Detalhes: ${JSON.stringify(tenantError, null, 2)}`);
			
			if (tenantError.code === 'PGRST301' || tenantError.message.includes('permission denied')) {
				console.error(`\n   💡 PROBLEMA: Permissão negada!`);
				console.error(`   Verifique:`);
				console.error(`   1. A política RLS está ativa?`);
				console.error(`   2. Os grants foram aplicados?`);
				console.error(`   3. O subdomain está correto?`);
			}
			return;
		}

		if (!tenant) {
			console.error(`   ❌ Tenant não encontrado`);
			console.error(`   Verifique se o subdomain "${subdomain}" está correto no banco`);
			
			// Tentar buscar todos os subdomains para debug
			const { data: allTenants } = await anonClient
				.from('tenants')
				.select('subdomain, business_name')
				.not('subdomain', 'is', null)
				.limit(5);
			
			console.log(`\n   📋 Subdomains disponíveis (primeiros 5):`);
			allTenants?.forEach(t => {
				console.log(`      - ${t.subdomain} (${t.business_name})`);
			});
			return;
		}

		console.log(`   ✅ Tenant encontrado: ${tenant.business_name || tenant.id}`);
		console.log(`   📍 Subdomain: ${tenant.subdomain}\n`);

		// 2. Buscar quadras (como BookingPublic faz)
		console.log('2️⃣ Buscando quadras ativas...');
		const { data: courts, error: courtsError } = await anonClient
			.from('courts')
			.select('*')
			.eq('tenant_id', tenant.id)
			.eq('active', true)
			.order('base_price');

		if (courtsError) {
			console.error(`   ❌ ERRO: ${courtsError.message}`);
			console.error(`   Código: ${courtsError.code}`);
			
			if (courtsError.code === 'PGRST301' || courtsError.message.includes('permission denied')) {
				console.error(`\n   💡 PROBLEMA: Permissão negada para ler courts!`);
				console.error(`   Execute: GRANT SELECT ON TABLE public.courts TO anon;`);
			}
			return;
		}

		if (!courts || courts.length === 0) {
			console.warn(`   ⚠️  Nenhuma quadra ativa encontrada`);
			console.warn(`   💡 Isso fará o link não mostrar nada!`);
		} else {
			console.log(`   ✅ ${courts.length} quadra(s) encontrada(s):`);
			courts.forEach(c => {
				console.log(`      - ${c.name} (R$ ${c.base_price || 0})`);
			});
		}
		console.log('');

		// 3. Testar função de horários
		console.log('3️⃣ Testando função de horários ocupados...');
		const today = new Date().toISOString().split('T')[0];
		const { data: slots, error: slotsError } = await anonClient
			.rpc('fn_public_get_occupied_slots', {
				p_subdomain: subdomain,
				p_date: today,
			});

		if (slotsError) {
			console.error(`   ❌ ERRO: ${slotsError.message}`);
			console.error(`   Código: ${slotsError.code}`);
			
			if (slotsError.code === '42501' || slotsError.message.includes('permission denied')) {
				console.error(`\n   💡 PROBLEMA: Permissão negada para executar função!`);
				console.error(`   Execute: GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;`);
			}
			return;
		}

		console.log(`   ✅ Função executada! (${slots?.length || 0} horários ocupados)\n`);

		// Resumo
		console.log('✅ TESTE COMPLETO - Tudo funcionando!');
		console.log(`\n🔗 Link deve funcionar:`);
		console.log(`   https://arenasys.com.br/agendar/${subdomain}`);
		
		if (!courts || courts.length === 0) {
			console.log(`\n⚠️  ATENÇÃO: Sem quadras ativas, o link não mostrará nada!`);
		}

	} catch (error) {
		console.error('❌ Erro inesperado:', error);
		if (error instanceof Error) {
			console.error('   Stack:', error.stack);
		}
	}
}

testPublicAccess().catch(console.error);

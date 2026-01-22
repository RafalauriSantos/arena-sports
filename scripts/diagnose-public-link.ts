import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error('❌ Variáveis de ambiente faltando');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function diagnosePublicLink() {
	console.log('🔍 Diagnóstico completo do link público...\n');

	const subdomain = process.argv[2];
	if (!subdomain) {
		console.error('❌ Por favor, forneça o subdomain como argumento');
		console.error('   Exemplo: bun run scripts/diagnose-public-link.ts grandosportsfutebolsociety-7edd');
		process.exit(1);
	}

	try {
		// 1. Verificar tenant
		console.log('1️⃣ Verificando tenant...');
		const { data: tenant, error: tenantError } = await supabase
			.from('tenants')
			.select('id, business_name, subdomain')
			.eq('subdomain', subdomain)
			.maybeSingle();

		if (tenantError) {
			console.error(`   ❌ Erro: ${tenantError.message}`);
			return;
		}

		if (!tenant) {
			console.error(`   ❌ Tenant não encontrado com subdomain: ${subdomain}`);
			return;
		}

		console.log(`   ✅ Tenant encontrado: ${tenant.business_name || tenant.id}`);
		console.log(`   📍 Subdomain: ${tenant.subdomain}\n`);

		// 2. Verificar quadras
		console.log('2️⃣ Verificando quadras...');
		const { data: courts, error: courtsError } = await supabase
			.from('courts')
			.select('id, name, active, base_price')
			.eq('tenant_id', tenant.id);

		if (courtsError) {
			console.error(`   ❌ Erro: ${courtsError.message}`);
			return;
		}

		const activeCourts = courts?.filter(c => c.active) || [];
		console.log(`   📊 Total de quadras: ${courts?.length || 0}`);
		console.log(`   ✅ Quadras ativas: ${activeCourts.length}`);

		if (activeCourts.length === 0) {
			console.warn(`   ⚠️  PROBLEMA: Nenhuma quadra ativa! O link não vai mostrar nada.`);
			console.warn(`   💡 Solução: Ative pelo menos uma quadra nas Configurações\n`);
		} else {
			console.log(`   📋 Quadras ativas:`);
			activeCourts.forEach(c => {
				console.log(`      - ${c.name} (R$ ${c.base_price})`);
			});
			console.log('');
		}

		// 3. Verificar grants
		console.log('3️⃣ Verificando grants públicos...');
		const anonClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || '', {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});

		const { data: publicTenant, error: publicError } = await anonClient
			.from('tenants')
			.select('id, business_name, subdomain')
			.eq('subdomain', subdomain)
			.maybeSingle();

		if (publicError) {
			console.error(`   ❌ Erro ao acessar como anon: ${publicError.message}`);
			console.error(`   💡 Execute no SQL Editor:`);
			console.error(`      GRANT SELECT ON TABLE public.tenants TO anon;`);
			return;
		}

		if (!publicTenant) {
			console.error(`   ❌ Não conseguiu acessar como anon (problema de RLS ou grants)`);
			return;
		}

		console.log(`   ✅ Grants públicos funcionando!\n`);

		// 4. Verificar função de horários
		console.log('4️⃣ Verificando função de horários ocupados...');
		const today = new Date().toISOString().split('T')[0];
		const { data: slots, error: slotsError } = await anonClient
			.rpc('fn_public_get_occupied_slots', {
				p_subdomain: subdomain,
				p_date: today,
			});

		if (slotsError) {
			console.error(`   ❌ Erro: ${slotsError.message}`);
			console.error(`   💡 Execute no SQL Editor:`);
			console.error(`      GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;`);
			return;
		}

		console.log(`   ✅ Função funcionando! (${slots?.length || 0} horários ocupados hoje)\n`);

		// 5. Resumo e link
		console.log('📊 Resumo:');
		console.log(`   ✅ Tenant: ${tenant.business_name || 'Sem nome'}`);
		console.log(`   ✅ Subdomain: ${tenant.subdomain}`);
		console.log(`   ${activeCourts.length > 0 ? '✅' : '❌'} Quadras ativas: ${activeCourts.length}`);
		console.log(`   ✅ Grants públicos: OK`);
		console.log(`   ✅ Função de horários: OK`);

		console.log(`\n🔗 Link público:`);
		console.log(`   https://arenasys.com.br/agendar/${subdomain}`);

		if (activeCourts.length === 0) {
			console.log(`\n⚠️  AÇÃO NECESSÁRIA:`);
			console.log(`   1. Acesse o Dashboard`);
			console.log(`   2. Vá em Configurações → Quadras`);
			console.log(`   3. Ative pelo menos uma quadra`);
		} else {
			console.log(`\n✅ Tudo parece estar OK!`);
			console.log(`\n💡 Se o link ainda não funcionar:`);
			console.log(`   1. Verifique se o deploy está atualizado`);
			console.log(`   2. Limpe o cache do navegador (Ctrl+Shift+Del)`);
			console.log(`   3. Teste em uma janela anônima`);
			console.log(`   4. Verifique o console do navegador (F12) para erros`);
		}

	} catch (error) {
		console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
	}
}

diagnosePublicLink().catch(console.error);

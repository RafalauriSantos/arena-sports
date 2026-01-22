import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('❌ Variáveis de ambiente faltando:');
	console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
	console.error('   VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY');
	process.exit(1);
}

// Criar cliente anon (sem autenticação)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function testPublicLink() {
	console.log('🧪 Testando acesso público ao link de agendamento...\n');

	const testSubdomain = process.argv[2] || 'grandosportsfutebolsociety-7edd';
	console.log(`📋 Testando subdomain: ${testSubdomain}\n`);

	try {
		// 1. Testar acesso ao tenant
		console.log('1️⃣ Testando acesso ao tenant...');
		const { data: tenant, error: tenantError } = await anonClient
			.from('tenants')
			.select('id, business_name, subdomain, phone, email')
			.eq('subdomain', testSubdomain)
			.maybeSingle();

		if (tenantError) {
			console.error(`   ❌ Erro: ${tenantError.message}`);
			console.error(`   💡 Verifique se os grants foram aplicados:`);
			console.error(`      GRANT SELECT ON TABLE public.tenants TO anon;`);
			return;
		}

		if (!tenant) {
			console.error(`   ❌ Tenant não encontrado com subdomain: ${testSubdomain}`);
			console.error(`   💡 Verifique se o subdomain está correto no banco`);
			return;
		}

		console.log(`   ✅ Tenant encontrado: ${tenant.business_name || tenant.id}`);
		console.log(`   📍 Subdomain: ${tenant.subdomain}\n`);

		// 2. Testar acesso às quadras
		console.log('2️⃣ Testando acesso às quadras...');
		const { data: courts, error: courtsError } = await anonClient
			.from('courts')
			.select('id, name, base_price, half_hour_price, active')
			.eq('tenant_id', tenant.id)
			.eq('active', true);

		if (courtsError) {
			console.error(`   ❌ Erro: ${courtsError.message}`);
			console.error(`   💡 Verifique se os grants foram aplicados:`);
			console.error(`      GRANT SELECT ON TABLE public.courts TO anon;`);
			return;
		}

		if (!courts || courts.length === 0) {
			console.warn(`   ⚠️  Nenhuma quadra ativa encontrada`);
		} else {
			console.log(`   ✅ ${courts.length} quadra(s) encontrada(s):`);
			for (const court of courts) {
				console.log(`      - ${court.name} (R$ ${court.base_price})`);
			}
		}
		console.log('');

		// 3. Testar função de horários ocupados
		console.log('3️⃣ Testando função de horários ocupados...');
		const today = new Date().toISOString().split('T')[0];
		const { data: occupiedSlots, error: slotsError } = await anonClient
			.rpc('fn_public_get_occupied_slots', {
				p_subdomain: testSubdomain,
				p_date: today,
			});

		if (slotsError) {
			console.error(`   ❌ Erro: ${slotsError.message}`);
			console.error(`   💡 Verifique se o grant foi aplicado:`);
			console.error(`      GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;`);
			return;
		}

		console.log(`   ✅ Função executada com sucesso`);
		console.log(`   📅 Horários ocupados hoje: ${occupiedSlots?.length || 0}\n`);

		// 4. Resumo
		console.log('✅ Todos os testes passaram!');
		console.log(`\n🔗 Link público deve funcionar:`);
		console.log(`   https://arenasys.com.br/agendar/${testSubdomain}`);
		console.log(`\n💡 Se ainda não funcionar, verifique:`);
		console.log(`   1. O domínio arenasys.com.br está apontando para o deploy correto`);
		console.log(`   2. O deploy está atualizado com as últimas mudanças`);
		console.log(`   3. Não há problemas de CORS ou cache no navegador`);

	} catch (error) {
		console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
	}
}

testPublicLink().catch(console.error);

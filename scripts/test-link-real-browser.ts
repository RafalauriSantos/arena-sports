import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('❌ Variáveis de ambiente faltando');
	process.exit(1);
}

// Simular exatamente o que o navegador faz
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function testLinkRealBrowser() {
	const subdomain = process.argv[2] || 'sp-center';
	
	console.log(`🌐 Testando link como se fosse um navegador real...\n`);
	console.log(`📋 Subdomain: ${subdomain}\n`);

	try {
		// 1. Simular o que o BookingPublic faz: limpar subdomain
		const cleanSubdomain = subdomain
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove acentos
			.replace(/[^a-z0-9]+/g, '-') // Troca símbolos por hífen
			.replace(/^-+|-+$/g, ''); // Remove hifens das pontas

		console.log(`1️⃣ Subdomain limpo: "${cleanSubdomain}"\n`);

		// 2. Buscar tenant (exatamente como BookingPublic faz)
		console.log('2️⃣ Buscando tenant no banco...');
		const { data: tenant, error: tenantError } = await anonClient
			.from('tenants')
			.select('*')
			.eq('subdomain', cleanSubdomain)
			.maybeSingle();

		if (tenantError) {
			console.error(`   ❌ ERRO: ${tenantError.message}`);
			console.error(`   Código: ${tenantError.code}`);
			console.error(`   Detalhes:`, JSON.stringify(tenantError, null, 2));
			
			if (tenantError.code === 'PGRST301') {
				console.error(`\n   💡 PROBLEMA: Permissão negada (RLS bloqueando)`);
				console.error(`   Verifique a política: tenants_public_read_by_subdomain`);
			}
			return;
		}

		if (!tenant) {
			console.error(`   ❌ Tenant não encontrado!`);
			console.error(`   Tentando busca flexível (ilike)...`);
			
			const { data: retryTenant } = await anonClient
				.from('tenants')
				.select('subdomain, business_name')
				.ilike('subdomain', `%${cleanSubdomain}%`)
				.maybeSingle();
			
			if (retryTenant) {
				console.error(`   ⚠️  Encontrado com busca flexível: ${retryTenant.subdomain}`);
				console.error(`   💡 O subdomain pode estar diferente no banco`);
			} else {
				console.error(`   ❌ Nenhum tenant encontrado mesmo com busca flexível`);
			}
			return;
		}

		console.log(`   ✅ Tenant encontrado: ${tenant.business_name || tenant.id}`);
		console.log(`   📍 Subdomain no banco: ${tenant.subdomain}\n`);

		// 3. Buscar quadras (exatamente como BookingPublic faz)
		console.log('3️⃣ Buscando quadras ativas...');
		const { data: courts, error: courtsError } = await anonClient
			.from('courts')
			.select('*')
			.eq('tenant_id', tenant.id)
			.eq('active', true)
			.order('base_price');

		if (courtsError) {
			console.error(`   ❌ ERRO: ${courtsError.message}`);
			console.error(`   Código: ${courtsError.code}`);
			
			if (courtsError.code === 'PGRST301') {
				console.error(`\n   💡 PROBLEMA: Permissão negada para ler courts`);
				console.error(`   Verifique a política: courts_public_read_active`);
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

		// 4. Testar função de horários
		console.log('4️⃣ Testando função de horários ocupados...');
		const today = new Date().toISOString().split('T')[0];
		const { data: slots, error: slotsError } = await anonClient
			.rpc('fn_public_get_occupied_slots', {
				p_subdomain: cleanSubdomain,
				p_date: today,
			});

		if (slotsError) {
			console.error(`   ❌ ERRO: ${slotsError.message}`);
			console.error(`   Código: ${slotsError.code}`);
			
			if (slotsError.code === '42501') {
				console.error(`\n   💡 PROBLEMA: Permissão negada para executar função`);
			}
			return;
		}

		console.log(`   ✅ Função executada! (${slots?.length || 0} horários ocupados)\n`);

		// 5. Resumo e diagnóstico
		console.log('='.repeat(60));
		console.log('✅ TESTE COMPLETO - Tudo funcionando no backend!');
		console.log('='.repeat(60));
		console.log(`\n🔗 Link público:`);
		console.log(`   https://arenasys.com.br/agendar/${cleanSubdomain}`);
		
		if (courts && courts.length > 0) {
			console.log(`\n✅ Backend está OK! O problema pode ser:`);
			console.log(`   1. Deploy não atualizado (aguarde alguns minutos)`);
			console.log(`   2. Cache do navegador (limpe o cache)`);
			console.log(`   3. Problema de rede no celular`);
			console.log(`   4. Domínio arenasys.com.br não está apontando para o deploy correto`);
			console.log(`   5. Problema de CORS (verifique console do navegador)`);
			
			console.log(`\n💡 Para diagnosticar:`);
			console.log(`   1. Abra o link em uma janela anônima no PC primeiro`);
			console.log(`   2. Abra o DevTools (F12) e vá na aba Console`);
			console.log(`   3. Veja se há erros no console`);
			console.log(`   4. Vá na aba Network e verifique se as requisições ao Supabase estão funcionando`);
			console.log(`   5. Se funcionar no PC mas não no celular, pode ser problema de rede ou cache`);
		} else {
			console.log(`\n⚠️  ATENÇÃO: Sem quadras ativas, o link não mostrará nada!`);
		}

	} catch (error) {
		console.error('❌ Erro inesperado:', error);
		if (error instanceof Error) {
			console.error('   Stack:', error.stack);
		}
	}
}

testLinkRealBrowser().catch(console.error);

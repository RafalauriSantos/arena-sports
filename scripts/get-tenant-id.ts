import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('❌ Variáveis de ambiente faltando:');
	console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
	console.error('   VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getTenantId() {
	console.log('🔍 Buscando tenant_id...\n');

	try {
		// 1. Tentar pegar da sessão atual (se estiver logado)
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		
		if (sessionError) {
			console.log('⚠️  Não há sessão ativa. Você precisa estar logado.');
			console.log('\n💡 Alternativas:');
			console.log('   1. Execute no SQL Editor do Supabase:');
			console.log('      SELECT id, email, tenant_id FROM profiles WHERE email = \'SEU_EMAIL\';');
			console.log('   2. Ou veja todos os tenants:');
			console.log('      SELECT id, business_name, subdomain FROM tenants;');
			return;
		}

		if (!session?.user) {
			console.log('⚠️  Nenhum usuário logado.');
			return;
		}

		console.log(`✅ Usuário logado: ${session.user.email}`);
		console.log(`   User ID: ${session.user.id}\n`);

		// 2. Buscar profile com tenant_id
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, email, tenant_id, full_name')
			.eq('id', session.user.id)
			.single();

		if (profileError) {
			console.error('❌ Erro ao buscar profile:', profileError.message);
			return;
		}

		if (!profile) {
			console.log('⚠️  Profile não encontrado.');
			return;
		}

		console.log('📋 Dados do Profile:');
		console.log(`   Nome: ${profile.full_name || 'Não informado'}`);
		console.log(`   Email: ${profile.email || 'Não informado'}`);
		console.log(`   Tenant ID: ${profile.tenant_id || '❌ NÃO CONFIGURADO'}\n`);

		if (profile.tenant_id) {
			// 3. Buscar dados do tenant
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('id, business_name, subdomain, phone')
				.eq('id', profile.tenant_id)
				.single();

			if (tenantError) {
				console.log('⚠️  Erro ao buscar tenant:', tenantError.message);
			} else if (tenant) {
				console.log('🏢 Dados do Tenant:');
				console.log(`   ID: ${tenant.id}`);
				console.log(`   Nome: ${tenant.business_name || 'Não informado'}`);
				console.log(`   Subdomain: ${tenant.subdomain || '❌ NÃO CONFIGURADO'}`);
				console.log(`   Telefone: ${tenant.phone || 'Não informado'}\n`);

				if (tenant.subdomain) {
					const origin = SUPABASE_URL.includes('localhost') 
						? 'http://localhost:5173' 
						: SUPABASE_URL.replace('.supabase.co', '');
					console.log('🔗 Link Público:');
					console.log(`   ${origin}/agendar/${tenant.subdomain}\n`);
				} else {
					console.log('⚠️  Subdomain não configurado!');
					console.log('   Configure nas Configurações do Dashboard.\n');
				}
			}
		} else {
			console.log('⚠️  Você não tem tenant_id associado!');
			console.log('   Complete o onboarding no Dashboard.\n');
		}
	} catch (error) {
		console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
	}
}

getTenantId().catch(console.error);

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

async function checkSubdomainAndGrants() {
	console.log('🔍 Verificando subdomain e grants públicos...\n');

	try {
		// 1. Buscar todos os tenants
		const { data: tenants, error: tenantsError } = await supabase
			.from('tenants')
			.select('id, business_name, subdomain, owner_id')
			.order('created_at', { ascending: false })
			.limit(10);

		if (tenantsError) {
			console.error('❌ Erro ao buscar tenants:', tenantsError.message);
			return;
		}

		if (!tenants || tenants.length === 0) {
			console.log('⚠️  Nenhum tenant encontrado.');
			return;
		}

		console.log(`📋 Encontrados ${tenants.length} tenant(s):\n`);

		for (const tenant of tenants) {
			console.log(`🏢 Tenant: ${tenant.business_name || 'Sem nome'}`);
			console.log(`   ID: ${tenant.id}`);
			console.log(`   Subdomain: ${tenant.subdomain || '❌ NÃO CONFIGURADO'}`);
			
			if (tenant.subdomain) {
				const origin = SUPABASE_URL.includes('localhost') 
					? 'http://localhost:5173' 
					: SUPABASE_URL.replace('.supabase.co', '').replace('https://', 'https://');
				console.log(`   🔗 Link: ${origin}/agendar/${tenant.subdomain}`);
			} else {
				console.log(`   ⚠️  Subdomain não configurado! Configure nas Configurações.`);
			}
			console.log('');
		}

		// 2. Verificar grants para anon
		console.log('🔐 Verificando grants públicos...\n');

		// Tentar acessar como anon (sem autenticação)
		const anonClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || '', {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});

		// Testar acesso a tenants com subdomain
		const tenantWithSubdomain = tenants.find(t => t.subdomain);
		if (tenantWithSubdomain?.subdomain) {
			console.log(`🧪 Testando acesso público ao tenant: ${tenantWithSubdomain.subdomain}`);
			
			const { data: publicTenant, error: publicError } = await anonClient
				.from('tenants')
				.select('id, business_name, subdomain')
				.eq('subdomain', tenantWithSubdomain.subdomain)
				.maybeSingle();

			if (publicError) {
				console.log(`   ❌ Erro ao acessar: ${publicError.message}`);
				console.log(`   💡 Execute no SQL Editor:`);
				console.log(`      GRANT SELECT ON TABLE public.tenants TO anon;`);
			} else if (publicTenant) {
				console.log(`   ✅ Acesso público funcionando!`);
			} else {
				console.log(`   ⚠️  Tenant não encontrado (pode ser problema de RLS)`);
			}
		} else {
			console.log('⚠️  Nenhum tenant com subdomain para testar.');
		}

		console.log('\n📝 Resumo:');
		const tenantsWithoutSubdomain = tenants.filter(t => !t.subdomain);
		if (tenantsWithoutSubdomain.length > 0) {
			console.log(`   ⚠️  ${tenantsWithoutSubdomain.length} tenant(s) sem subdomain configurado`);
		}
		const tenantsWithSubdomain = tenants.filter(t => t.subdomain);
		if (tenantsWithSubdomain.length > 0) {
			console.log(`   ✅ ${tenantsWithSubdomain.length} tenant(s) com subdomain configurado`);
		}

	} catch (error) {
		console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
	}
}

checkSubdomainAndGrants().catch(console.error);

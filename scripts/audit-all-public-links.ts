import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
	console.error('❌ Variáveis de ambiente faltando');
	process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function auditAllPublicLinks() {
	console.log('🔍 Auditoria completa de todos os links públicos...\n');

	try {
		// 1. Buscar todos os tenants com subdomain
		const { data: allTenants, error: tenantsError } = await adminClient
			.from('tenants')
			.select('id, business_name, subdomain, owner_id, created_at')
			.not('subdomain', 'is', null)
			.order('created_at', { ascending: false });

		if (tenantsError) {
			console.error('❌ Erro ao buscar tenants:', tenantsError.message);
			return;
		}

		if (!allTenants || allTenants.length === 0) {
			console.log('⚠️  Nenhum tenant com subdomain encontrado');
			return;
		}

		console.log(`📋 Encontrados ${allTenants.length} tenant(s) com subdomain\n`);

		const results: Array<{
			tenant: typeof allTenants[0];
			publicAccess: boolean;
			courtsCount: number;
			activeCourtsCount: number;
			issues: string[];
		}> = [];

		// 2. Testar cada tenant
		for (const tenant of allTenants) {
			const issues: string[] = [];
			let publicAccess = false;
			let courtsCount = 0;
			let activeCourtsCount = 0;

			console.log(`\n🏢 Testando: ${tenant.business_name || 'Sem nome'}`);
			console.log(`   Subdomain: ${tenant.subdomain}`);

			// Testar acesso público ao tenant
			const { data: publicTenant, error: publicError } = await anonClient
				.from('tenants')
				.select('id, business_name, subdomain')
				.eq('subdomain', tenant.subdomain)
				.maybeSingle();

			if (publicError) {
				issues.push(`❌ Erro ao acessar tenant: ${publicError.message}`);
			} else if (!publicTenant) {
				issues.push(`❌ Tenant não acessível publicamente (problema de RLS ou grants)`);
			} else {
				publicAccess = true;
				console.log(`   ✅ Acesso público: OK`);
			}

			// Verificar quadras
			const { data: courts, error: courtsError } = await adminClient
				.from('courts')
				.select('id, name, active, base_price')
				.eq('tenant_id', tenant.id);

			if (courtsError) {
				issues.push(`❌ Erro ao buscar quadras: ${courtsError.message}`);
			} else {
				courtsCount = courts?.length || 0;
				activeCourtsCount = courts?.filter(c => c.active).length || 0;
				
				if (courtsCount === 0) {
					issues.push(`⚠️  Nenhuma quadra cadastrada`);
				} else if (activeCourtsCount === 0) {
					issues.push(`⚠️  Nenhuma quadra ativa (${courtsCount} inativa(s))`);
				} else {
					console.log(`   ✅ Quadras: ${activeCourtsCount} ativa(s) de ${courtsCount} total`);
				}
			}

			// Testar acesso público às quadras
			if (publicAccess && activeCourtsCount > 0) {
				const { data: publicCourts, error: publicCourtsError } = await anonClient
					.from('courts')
					.select('id, name')
					.eq('tenant_id', tenant.id)
					.eq('active', true);

				if (publicCourtsError) {
					issues.push(`❌ Erro ao acessar quadras publicamente: ${publicCourtsError.message}`);
				} else if (!publicCourts || publicCourts.length === 0) {
					issues.push(`❌ Quadras não acessíveis publicamente (problema de RLS)`);
				} else {
					console.log(`   ✅ Acesso público às quadras: OK`);
				}
			}

			// Testar função de horários
			if (publicAccess) {
				const today = new Date().toISOString().split('T')[0];
				const { data: slots, error: slotsError } = await anonClient
					.rpc('fn_public_get_occupied_slots', {
						p_subdomain: tenant.subdomain,
						p_date: today,
					});

				if (slotsError) {
					issues.push(`❌ Erro na função de horários: ${slotsError.message}`);
				} else {
					console.log(`   ✅ Função de horários: OK`);
				}
			}

			results.push({
				tenant,
				publicAccess,
				courtsCount,
				activeCourtsCount,
				issues,
			});
		}

		// 3. Resumo final
		console.log('\n\n' + '='.repeat(60));
		console.log('📊 RESUMO DA AUDITORIA');
		console.log('='.repeat(60) + '\n');

		const working = results.filter(r => r.publicAccess && r.activeCourtsCount > 0 && r.issues.length === 0);
		const withIssues = results.filter(r => r.issues.length > 0);

		console.log(`✅ Links funcionando: ${working.length}`);
		console.log(`⚠️  Links com problemas: ${withIssues.length}\n`);

		if (working.length > 0) {
			console.log('✅ TENANTS COM LINKS FUNCIONANDO:');
			working.forEach(r => {
				console.log(`   - ${r.tenant.business_name || r.tenant.id}`);
				console.log(`     Link: https://arenasys.com.br/agendar/${r.tenant.subdomain}`);
			});
			console.log('');
		}

		if (withIssues.length > 0) {
			console.log('⚠️  TENANTS COM PROBLEMAS:');
			withIssues.forEach(r => {
				console.log(`\n   🏢 ${r.tenant.business_name || r.tenant.id}`);
				console.log(`      Subdomain: ${r.tenant.subdomain}`);
				r.issues.forEach(issue => {
					console.log(`      ${issue}`);
				});
				console.log(`      Link: https://arenasys.com.br/agendar/${r.tenant.subdomain}`);
			});
		}

		// 4. Ações recomendadas
		console.log('\n' + '='.repeat(60));
		console.log('💡 AÇÕES RECOMENDADAS');
		console.log('='.repeat(60) + '\n');

		const noCourts = results.filter(r => r.courtsCount === 0);
		const noActiveCourts = results.filter(r => r.courtsCount > 0 && r.activeCourtsCount === 0);
		const noPublicAccess = results.filter(r => !r.publicAccess);

		if (noCourts.length > 0) {
			console.log(`📋 ${noCourts.length} tenant(s) sem quadras cadastradas:`);
			noCourts.forEach(r => {
				console.log(`   - ${r.tenant.business_name || r.tenant.id}`);
				console.log(`     Ação: Criar pelo menos uma quadra nas Configurações`);
			});
			console.log('');
		}

		if (noActiveCourts.length > 0) {
			console.log(`📋 ${noActiveCourts.length} tenant(s) sem quadras ativas:`);
			noActiveCourts.forEach(r => {
				console.log(`   - ${r.tenant.business_name || r.tenant.id}`);
				console.log(`     Ação: Ativar pelo menos uma quadra nas Configurações`);
			});
			console.log('');
		}

		if (noPublicAccess.length > 0) {
			console.log(`📋 ${noPublicAccess.length} tenant(s) com problema de acesso público:`);
			console.log(`   Ação: Verificar grants e políticas RLS`);
			console.log(`   Execute no SQL Editor:`);
			console.log(`   GRANT SELECT ON TABLE public.tenants TO anon;`);
			console.log(`   GRANT SELECT ON TABLE public.courts TO anon;`);
			console.log(`   GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;`);
		}

	} catch (error) {
		console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
	}
}

auditAllPublicLinks().catch(console.error);

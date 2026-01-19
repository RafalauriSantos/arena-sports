/**
 * Testa se a RPC fn_update_tenant_hours existe no banco
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
	console.error("❌ Faltam variáveis de ambiente!");
	console.error("   VITE_SUPABASE_URL:", !!supabaseUrl);
	console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseKey);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
	console.log("🔍 Verificando se a RPC fn_update_tenant_hours existe...\n");

	// 1. Testa se a função existe chamando com dados falsos (vai dar erro mas confirma que existe)
	const { data, error } = await supabase.rpc("fn_update_tenant_hours", {
		p_tenant_id: "00000000-0000-0000-0000-000000000000",
		p_sunday_start: 7,
		p_sunday_end: 13,
		p_weekday_start: 7,
		p_weekday_end: 23,
	});

	console.log("📊 Resultado do teste:");
	console.log("   Data:", data);
	console.log("   Error:", error);

	if (error) {
		// Se o erro for "permission denied" ou "not found", a RPC não existe ou não tem permissão
		if (
			error.message.includes("not found") ||
			error.message.includes("does not exist")
		) {
			console.error("\n❌ A RPC fn_update_tenant_hours NÃO EXISTE no banco!");
			console.error(
				"   Você precisa aplicar a migration: supabase/migrations/20260118000001_tenant_hours_rpc.sql"
			);
			console.error(
				"\n   Opções:\n   1. npx supabase db push\n   2. Copiar SQL no Dashboard do Supabase"
			);
		} else if (error.message.includes("No rows found")) {
			console.log(
				"\n✅ A RPC EXISTE! (O erro 'No rows found' é esperado com UUID fake)"
			);
			console.log("   O problema deve ser outro. Vou buscar um tenant real...\n");

			// Busca um tenant real
			const { data: tenant } = await supabase
				.from("tenants")
				.select("id, business_name")
				.limit(1)
				.single();

			if (tenant) {
				console.log(`🎯 Testando com tenant real: ${tenant.business_name}`);
				const { data: result, error: realError } = await supabase.rpc(
					"fn_update_tenant_hours",
					{
						p_tenant_id: tenant.id,
						p_sunday_start: 7,
						p_sunday_end: 13,
						p_weekday_start: 7,
						p_weekday_end: 23,
					}
				);

				if (realError) {
					console.error("❌ Erro ao chamar RPC:", realError);
				} else {
					console.log("✅ RPC executada com sucesso!");
					console.log("📦 Settings retornado:", JSON.stringify(result, null, 2));
				}
			}
		} else {
			console.error("\n⚠️ Erro inesperado:", error.message);
		}
	} else {
		console.log("\n✅ RPC funcionando perfeitamente!");
	}
}

testRPC();

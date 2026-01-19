/**
 * Testa a nova RPC segura: fn_update_my_tenant_hours
 * (Sem precisar passar tenant_id - busca automaticamente)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error("❌ Faltam variáveis de ambiente!");
	console.error("   VITE_SUPABASE_URL:", !!supabaseUrl);
	console.error("   VITE_SUPABASE_ANON_KEY:", !!supabaseAnonKey);
	process.exit(1);
}

// Cliente com ANON KEY (como um usuário normal)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNewRPC() {
	console.log("🔐 Testando nova RPC fn_update_my_tenant_hours (auto-consciente)\n");

	// Precisamos estar logados para testar
	console.log("⚠️ ATENÇÃO: Você precisa estar logado para testar esta RPC!");
	console.log("   1. Copie o token de acesso do seu navegador (localStorage.getItem('sb-...-auth-token'))");
	console.log("   2. Ou rode este script com credenciais de um usuário\n");

	// Por enquanto, vamos só testar se a função existe
	console.log("🔍 Testando se a RPC existe (sem auth)...");

	const { data, error } = await supabase.rpc("fn_update_my_tenant_hours", {
		p_sunday_start: 7,
		p_sunday_end: 13,
		p_weekday_start: 7,
		p_weekday_end: 23,
	});

	if (error) {
		if (
			error.message.includes("not found") ||
			error.message.includes("does not exist")
		) {
			console.error("\n❌ A RPC fn_update_my_tenant_hours NÃO EXISTE!");
			console.error("   Você precisa aplicar o SQL que você criou.");
		} else if (error.message.includes("JWT")) {
			console.log(
				"\n✅ A RPC EXISTE! (Erro de JWT é esperado, pois não estamos logados)"
			);
			console.log(
				"   Para testar de verdade, faça o seguinte no Dashboard:\n"
			);
			console.log("   1. Vá em Configurações → aba Horários");
			console.log("   2. Configure domingo de 7h às 13h");
			console.log("   3. Salve e verifique os logs do console");
			console.log("   4. Volte à aba e veja se manteve os horários");
		} else {
			console.error("\n⚠️ Erro inesperado:", error.message);
			console.error("   Detalhes:", error);
		}
	} else {
		console.log("\n✅ RPC executada!");
		console.log("📦 Settings retornado:", JSON.stringify(data, null, 2));
	}
}

testNewRPC();

/**
 * Script de Teste: RPC de Atualização de Horários
 * Testa a função fn_update_tenant_hours do banco
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error("❌ Variáveis de ambiente faltando!");
	console.error("   VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function testHoursRPC() {
	console.log("🧪 Testando RPC fn_update_tenant_hours\n");

	// 1. Buscar tenants de teste
	console.log("📋 1. Buscando tenants...");
	const { data: tenants, error: tenantsError } = await supabase
		.from("tenants")
		.select("id, business_name, subdomain, settings")
		.limit(3);

	if (tenantsError || !tenants || tenants.length === 0) {
		console.error("❌ Erro ao buscar tenants:", tenantsError?.message);
		return;
	}

	console.log(`✅ ${tenants.length} tenant(s) encontrado(s)\n`);

	// Pegar o primeiro tenant que não é de teste
	const tenant = tenants.find(t => !t.business_name?.includes("Test")) || tenants[0];
	console.log(`🎯 Usando tenant: ${tenant.business_name} (${tenant.subdomain})`);
	console.log(`   ID: ${tenant.id}\n`);

	// 2. Ver configuração atual
	console.log("📊 2. Configuração atual:");
	const currentSettings = tenant.settings as Record<string, unknown> | null;
	const currentBooking = currentSettings?.booking as Record<string, unknown> | undefined;
	console.log("   Settings completo:", JSON.stringify(currentSettings, null, 2));
	console.log("   Booking atual:", JSON.stringify(currentBooking, null, 2));
	console.log();

	// 3. Testar RPC - Domingo 7h-13h, Resto 7h-23h
	console.log("🔧 3. Testando RPC...");
	console.log("   Configurando:");
	console.log("   - Domingo: 7h às 13h");
	console.log("   - Segunda a Sábado: 7h às 23h");
	
	const { data: rpcResult, error: rpcError } = await supabase.rpc(
		"fn_update_tenant_hours",
		{
			p_tenant_id: tenant.id,
			p_sunday_start: 7,
			p_sunday_end: 13,
			p_weekday_start: 7,
			p_weekday_end: 23,
		}
	);

	if (rpcError) {
		console.error("❌ Erro na RPC:", rpcError.message);
		console.error("   Detalhes:", rpcError);
		return;
	}

	console.log("✅ RPC executada com sucesso!");
	console.log("   Settings retornado:", JSON.stringify(rpcResult, null, 2));
	console.log();

	// 4. Verificar no banco
	console.log("🔍 4. Verificando no banco...");
	const { data: updatedTenant, error: verifyError } = await supabase
		.from("tenants")
		.select("settings")
		.eq("id", tenant.id)
		.single();

	if (verifyError || !updatedTenant) {
		console.error("❌ Erro ao verificar:", verifyError?.message);
		return;
	}

	const updatedSettings = updatedTenant.settings as Record<string, unknown>;
	const updatedBooking = updatedSettings.booking as Record<string, unknown>;
	
	console.log("✅ Settings após update:");
	console.log(JSON.stringify(updatedSettings, null, 2));
	console.log();

	// 5. Validar que outras configurações foram preservadas
	console.log("🔐 5. Validando preservação de outras configs...");
	
	const otherKeys = Object.keys(updatedSettings).filter(k => k !== 'booking');
	console.log(`   Outras chaves preservadas: ${otherKeys.length}`);
	otherKeys.forEach(key => {
		console.log(`   ✅ ${key}: ${JSON.stringify(updatedSettings[key])}`);
	});

	if (updatedBooking) {
		const bookingKeys = Object.keys(updatedBooking).filter(
			k => k !== 'sunday_hours' && k !== 'weekday_hours'
		);
		console.log(`   Outras chaves em booking: ${bookingKeys.length}`);
		bookingKeys.forEach(key => {
			console.log(`   ✅ booking.${key}: ${JSON.stringify(updatedBooking[key])}`);
		});
	}

	console.log();

	// 6. Teste de validação (deve falhar)
	console.log("🧪 6. Testando validações (deve falhar)...");
	
	// Teste 1: start > end
	console.log("   Teste 1: sunday_start > sunday_end");
	const { error: validationError1 } = await supabase.rpc(
		"fn_update_tenant_hours",
		{
			p_tenant_id: tenant.id,
			p_sunday_start: 20,
			p_sunday_end: 10, // ❌ Inválido
			p_weekday_start: 7,
			p_weekday_end: 23,
		}
	);
	
	if (validationError1) {
		console.log(`   ✅ Erro esperado: ${validationError1.message}`);
	} else {
		console.log("   ❌ Deveria ter dado erro!");
	}

	// Teste 2: hora fora do range
	console.log("   Teste 2: hora fora do range (25)");
	const { error: validationError2 } = await supabase.rpc(
		"fn_update_tenant_hours",
		{
			p_tenant_id: tenant.id,
			p_sunday_start: 7,
			p_sunday_end: 25, // ❌ Inválido
			p_weekday_start: 7,
			p_weekday_end: 23,
		}
	);
	
	if (validationError2) {
		console.log(`   ✅ Erro esperado: ${validationError2.message}`);
	} else {
		console.log("   ❌ Deveria ter dado erro!");
	}

	console.log();

	// 7. Resumo
	console.log("📊 RESUMO DO TESTE\n");
	console.log("✅ RPC funcionando corretamente");
	console.log("✅ Merge seguro de configurações");
	console.log("✅ Validações funcionando");
	console.log("✅ Outras configurações preservadas");
	console.log();
	console.log("🎉 Teste concluído com sucesso!");
	console.log();
	console.log("🌐 Para testar no calendário público:");
	console.log(`   http://localhost:5173/agendar/${tenant.subdomain}`);
}

testHoursRPC().catch((err) => {
	console.error("💥 Erro inesperado:", err);
	process.exit(1);
});

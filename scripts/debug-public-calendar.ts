#!/usr/bin/env bun
/**
 * Script de Diagnóstico: Calendário Público
 * Identifica por que os horários não aparecem na página pública
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error("❌ Variáveis de ambiente faltando!");
	console.error("   VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias");
	console.error("   (Usando SERVICE_ROLE_KEY para acesso admin)");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function debugPublicCalendar() {
	console.log("🔍 Diagnóstico do Calendário Público\n");

	// 1. Listar todos os tenants
	console.log("📋 1. Listando tenants...");
	const { data: tenants, error: tenantsError } = await supabase
		.from("tenants")
		.select("id, business_name, subdomain, owner_id, created_at");

	if (tenantsError) {
		console.error("❌ Erro ao buscar tenants:", tenantsError.message);
		return;
	}

	if (!tenants || tenants.length === 0) {
		console.log("⚠️  Nenhum tenant encontrado no banco!");
		return;
	}

	console.log(`✅ ${tenants.length} tenant(s) encontrado(s):\n`);

	// Filtrar apenas tenants reais (não de teste)
	const realTenants = tenants.filter(
		(t) => !t.business_name.toLowerCase().includes("test tenant")
	);

	if (realTenants.length === 0) {
		console.log(
			"⚠️  Apenas tenants de teste encontrados. Usando o primeiro da lista..."
		);
	}

	const tenant = realTenants.length > 0 ? realTenants[0] : tenants[0];

	console.log("📋 Tenants reais no banco:");
	realTenants.forEach((t, i) => {
		console.log(
			`   ${i + 1}. ${t.business_name} (subdomain: ${t.subdomain || "N/A"})`
		);
	});

	console.log(`\n🎯 Testando com: ${tenant.business_name}\n`);

	// 2. Verificar assinatura/trial
	console.log("💳 2. Verificando assinatura...");
	const { data: subscription, error: subError } = await supabase
		.from("tenant_subscriptions")
		.select("*")
		.eq("tenant_id", tenant.id)
		.single();

	if (subError || !subscription) {
		console.log("⚠️  Sem assinatura encontrada - trial padrão (21 dias)");
	} else {
		console.log(`   Status: ${subscription.status}`);
		console.log(`   Plano: ${subscription.plan_name || subscription.plan_code}`);
		if (subscription.trial_ends_at) {
			const trialEnds = new Date(subscription.trial_ends_at);
			const now = new Date();
			const daysLeft = Math.ceil(
				(trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
			console.log(
				`   Trial expira em: ${trialEnds.toLocaleDateString()} (${daysLeft} dias)`
			);

			if (daysLeft < 0) {
				console.log("   ⚠️  TRIAL EXPIRADO - Isso bloqueia o calendário público!");
			}
		}
	}

	// 3. Verificar quadras ativas
	console.log("\n🏟️  3. Verificando quadras...");
	const { data: courts, error: courtsError } = await supabase
		.from("courts")
		.select("id, name, base_price, active, tenant_id")
		.eq("tenant_id", tenant.id);

	if (courtsError) {
		console.error("❌ Erro ao buscar quadras:", courtsError.message);
		return;
	}

	if (!courts || courts.length === 0) {
		console.log("❌ Nenhuma quadra encontrada para este tenant!");
		console.log(
			"   Solução: Crie ao menos uma quadra no dashboard admin (/quadras)"
		);
		return;
	}

	const activeCourts = courts.filter((c) => c.active);
	console.log(`   Total: ${courts.length} quadra(s)`);
	console.log(`   Ativas: ${activeCourts.length} quadra(s)`);

	if (activeCourts.length === 0) {
		console.log(
			"⚠️  Nenhuma quadra ATIVA - ative ao menos uma no dashboard!"
		);
		return;
	}

	activeCourts.forEach((c, i) => {
		console.log(
			`   ${i + 1}. ${c.name} - R$ ${c.base_price} ${c.active ? "✅" : "❌"}`
		);
	});

	// 4. Testar RPC pública (com paywall)
	console.log("\n📞 4. Testando RPC pública (fn_public_get_occupied_slots)...");

	if (!tenant.subdomain) {
		console.log(
			"⚠️  Subdomain não configurado - não é possível testar RPC pública"
		);
		return;
	}

	const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
	const { data: occupiedSlots, error: rpcError } = await supabase.rpc(
		"fn_public_get_occupied_slots",
		{
			p_subdomain: tenant.subdomain,
			p_date: today,
		}
	);

	if (rpcError) {
		console.error("❌ Erro ao chamar RPC:", rpcError.message);
		console.log(
			"   Possível causa: Tenant bloqueado por trial expirado ou erro na função"
		);
		return;
	}

	console.log(`   ✅ RPC funcionou! Horários ocupados: ${occupiedSlots?.length || 0}`);

	interface OccupiedSlot {
		court_id: string;
		slot_time: string;
	}

	if (occupiedSlots && occupiedSlots.length > 0) {
		console.log("\n   Horários ocupados hoje:");
		(occupiedSlots as OccupiedSlot[]).forEach((slot) => {
			const court = courts.find((c) => c.id === slot.court_id);
			console.log(
				`   - ${court?.name || "Quadra desconhecida"} às ${slot.slot_time}`
			);
		});
	}

	// 5. Simular geração de slots (como no BookingPublic.tsx)
	console.log("\n⏰ 5. Simulando geração de horários...");
	const now = new Date();
	const nowHour = now.getHours();

	let totalSlotsGenerated = 0;
	let totalSlotsFree = 0;

	const occupiedSet = new Set(
		(occupiedSlots || []).map(
			(s: OccupiedSlot) => `${s.court_id}-${s.slot_time.slice(0, 5)}`
		)
	);

	activeCourts.forEach((court) => {
		let courtSlots = 0;
		for (let h = 7; h <= 23; h++) {
			totalSlotsGenerated++;
			const time = `${h.toString().padStart(2, "0")}:00`;
			const slotKey = `${court.id}-${time}`;

			// Bloqueio 1: Já passou (se for hoje)
			if (h <= nowHour) continue;

			// Bloqueio 2: Ocupado
			if (occupiedSet.has(slotKey)) continue;

			// Livre!
			courtSlots++;
			totalSlotsFree++;
		}

		console.log(
			`   ${court.name}: ${courtSlots} horários livres (hoje, após as ${nowHour}h)`
		);
	});

	console.log(
		`\n📊 Resumo: ${totalSlotsFree}/${totalSlotsGenerated} slots disponíveis`
	);

	// 6. Diagnóstico final
	console.log("\n\n✅ DIAGNÓSTICO COMPLETO\n");

	if (totalSlotsFree === 0) {
		console.log("❌ PROBLEMA IDENTIFICADO:");
		if (nowHour >= 23) {
			console.log(
				"   - Já é muito tarde (depois das 23h). Teste amanhã ou selecione outro dia."
			);
		} else if (activeCourts.length === 0) {
			console.log("   - Nenhuma quadra ativa.");
		} else if (subscription && subscription.status === "trial") {
			const trialEnds = new Date(subscription.trial_ends_at);
			if (trialEnds < now) {
				console.log(
					"   - Trial expirado - o paywall bloqueia o calendário público!"
				);
				console.log(
					"     Solução: Renovar assinatura ou estender trial manualmente."
				);
			}
		} else {
			console.log("   - Todos os horários estão ocupados ou o RPC falhou.");
		}
	} else {
		console.log("✅ TUDO OK! Horários disponíveis:");
		console.log(`   URL pública: /agendar/${tenant.subdomain}`);
		console.log(
			`   Horários livres: ${totalSlotsFree} (para hoje após ${nowHour}h)`
		);
		console.log(
			"\n💡 Se ainda não aparecer na UI, verifique o console do navegador (F12)"
		);
	}
}

debugPublicCalendar().catch((err) => {
	console.error("💥 Erro inesperado:", err);
	process.exit(1);
});

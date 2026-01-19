/**
 * Serviço para gerenciar configurações do tenant de forma segura
 * Usa RPCs do Supabase para evitar race conditions no JSONB settings
 */

import { supabase } from "@/lib/supabaseClient";

/**
 * Horários de funcionamento (start e end em formato 24h: 0-23)
 */
export interface OperatingHours {
	start: number;
	end: number;
}

/**
 * Configuração completa de horários
 */
export interface TenantHoursConfig {
	sunday: OperatingHours;
	weekday: OperatingHours;
}

/**
 * Resposta da RPC de atualização
 */
interface UpdateHoursResponse {
	data: Record<string, unknown> | null;
	error: Error | null;
}

/**
 * Atualiza os horários de funcionamento do tenant de forma segura
 * usando RPC do Postgres para fazer merge no JSONB sem sobrescrever outras configs
 * 
 * A RPC busca automaticamente o tenant do usuário logado (mais seguro!)
 *
 * @param config - Configuração de horários (domingo e dias da semana)
 * @returns Promise com resultado da operação
 *
 * @example
 * ```typescript
 * await updateTenantHours({
 *   sunday: { start: 7, end: 13 },
 *   weekday: { start: 7, end: 23 }
 * });
 * ```
 */
export async function updateTenantHours(
	config: TenantHoursConfig
): Promise<UpdateHoursResponse> {
	try {
		// Validações no client-side (defesa em profundidade)
		if (
			config.sunday.start < 0 ||
			config.sunday.start > 23 ||
			config.sunday.end < 0 ||
			config.sunday.end > 23
		) {
			throw new Error("Horários de domingo devem estar entre 0 e 23");
		}

		if (
			config.weekday.start < 0 ||
			config.weekday.start > 23 ||
			config.weekday.end < 0 ||
			config.weekday.end > 23
		) {
			throw new Error("Horários de dias da semana devem estar entre 0 e 23");
		}

		if (config.sunday.start >= config.sunday.end) {
			throw new Error(
				"Horário de início não pode ser maior que horário de fim (domingo)"
			);
		}

		if (config.weekday.start >= config.weekday.end) {
			throw new Error(
				"Horário de início não pode ser maior que horário de fim (dias da semana)"
			);
		}

		// Chama a nova RPC segura (sem precisar passar tenant_id)
		console.log("🔄 Chamando RPC fn_update_my_tenant_hours com:", {
			p_sunday_start: config.sunday.start,
			p_sunday_end: config.sunday.end,
			p_weekday_start: config.weekday.start,
			p_weekday_end: config.weekday.end,
		});

		const { data, error } = await supabase.rpc("fn_update_my_tenant_hours", {
			p_sunday_start: config.sunday.start,
			p_sunday_end: config.sunday.end,
			p_weekday_start: config.weekday.start,
			p_weekday_end: config.weekday.end,
		});

		if (error) {
			console.error("❌ Erro ao atualizar horários:", error);
			throw error;
		}

		console.log("✅ Horários atualizados com sucesso! Settings retornado:", data);
		return { data, error: null };
	} catch (error) {
		console.error("Erro inesperado ao atualizar horários:", error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * Busca os horários atuais do tenant
 *
 * @param tenantId - UUID do tenant
 * @returns Configuração de horários ou null se não encontrado
 */
export async function getTenantHours(
	tenantId: string
): Promise<TenantHoursConfig | null> {
	try {
		console.log("🔍 Buscando horários para tenant:", tenantId);

		const { data, error } = await supabase
			.from("tenants")
			.select("settings")
			.eq("id", tenantId)
			.single();

		if (error || !data) {
			console.error("❌ Erro ao buscar horários:", error);
			return null;
		}

		console.log("📦 Settings completo do banco:", JSON.stringify(data.settings, null, 2));

		const settings = data.settings as Record<string, unknown> | null;
		const booking = settings?.booking as Record<string, unknown> | undefined;

		console.log("📖 Booking extraído:", JSON.stringify(booking, null, 2));

		// Valores padrão
		const defaultHours: TenantHoursConfig = {
			sunday: { start: 7, end: 23 },
			weekday: { start: 7, end: 23 },
		};

		if (!booking) {
			console.log("⚠️ Sem configuração de booking, usando padrão");
			return defaultHours;
		}

		const sundayHours = booking.sunday_hours as
			| { start: number; end: number }
			| undefined;
		const weekdayHours = booking.weekday_hours as
			| { start: number; end: number }
			| undefined;

		console.log("🕐 Sunday hours:", sundayHours);
		console.log("📅 Weekday hours:", weekdayHours);

		const result = {
			sunday: sundayHours || defaultHours.sunday,
			weekday: weekdayHours || defaultHours.weekday,
		};

		console.log("✅ Retornando horários:", result);
		return result;
	} catch (error) {
		console.error("❌ Erro inesperado ao buscar horários:", error);
		return null;
	}
}

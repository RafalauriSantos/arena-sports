// Supabase Edge Function: asaas-create-checkout
// Fluxo correto: Cliente → Subscription → Fatura
// Implementação seguindo o padrão Asaas oficial

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { corsHeaders } from "../_shared/cors.ts";

const ASAAS_API_KEY =
	Deno.env.get("ASAAS_API_KEY") ?? Deno.env.get("ASAAS_ACCESS_TOKEN");
const ASAAS_URL =
	Deno.env.get("ASAAS_API_URL") ||
	Deno.env.get("ASAAS_BASE_URL") ||
	"https://sandbox.asaas.com/api/v3";

// Preços base (sem desconto)
const BASE_PRICE = {
	month: 97, // R$ 97/mês
	year: 970, // R$ 970/ano (2 meses grátis = 17% off)
} as const;

// Desconto de 30% para Founders 20
const FOUNDERS_DISCOUNT = 0.3; // 30%
const FOUNDERS_CAP = 20; // Apenas 20 primeiros clientes

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? "",
			{
				global: {
					headers: {
						Authorization: req.headers.get("Authorization")!,
					},
				},
			}
		);

		// Cliente admin para operações que precisam bypassar RLS
		const supabaseAdmin = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		const {
			plan_code,
			interval,
			// Dados do cliente para criação no Asaas (opcionais - serão buscados do banco se não enviados)
			customer: customerDataFromRequest,
		} = await req.json();

		// Validação e debug da chave de API
		if (!ASAAS_API_KEY) {
			console.error("❌ ASAAS_API_KEY não encontrada");
			console.error("Variáveis de ambiente disponíveis:", Array.from(Object.keys(Deno.env)).filter((k: string) => k.includes("ASAAS")));
			throw new Error("ASAAS_API_KEY não configurado");
		}

		// Verificar se a chave não está vazia
		if (ASAAS_API_KEY.trim() === "") {
			console.error("❌ ASAAS_API_KEY está vazia");
			throw new Error("ASAAS_API_KEY está vazia");
		}

		console.log("✅ ASAAS_API_KEY encontrada:", ASAAS_API_KEY.substring(0, 20) + "...");
		console.log("✅ ASAAS_API_KEY tamanho:", ASAAS_API_KEY.length);
		console.log("🌐 ASAAS_URL:", ASAAS_URL);

		// Apenas um plano agora (removido start/pro)
		const normalizedInterval: "month" | "year" =
			interval === "year" || interval === "month" ? interval : "month";

		// Verificar autenticação
		const { data, error: authError } = await supabaseClient.auth.getUser();
		const user = data?.user || null;
		if (authError || !user) {
			return new Response(
				JSON.stringify({ error: "Unauthorized - Invalid token" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// 1. Buscar profile do usuário para obter tenant_id
		const { data: profile, error: profileError } = await supabaseClient
			.from("profiles")
			.select("tenant_id")
			.eq("id", user.id)
			.single();

		if (profileError || !profile?.tenant_id) {
			throw new Error(
				"Profile não encontrado ou sem tenant_id. Complete o onboarding primeiro."
			);
		}

		const tenant_id = profile.tenant_id;

		// 1.5. Verificar se ainda há vagas para Founders 20 e calcular preço
		const { data: foundersData, error: foundersError } = await supabaseAdmin
			.from("tenant_subscriptions")
			.select("id")
			.eq("is_founder", true)
			.in("status", ["active", "trial", "past_due"]);

		if (foundersError) {
			console.error("Error fetching founder subscriptions:", foundersError);
			// Decide how to handle this error. For now, let's assume 0 founders if error.
		}

		const currentFoundersCount = foundersData?.length || 0;
		const isFounder = currentFoundersCount < FOUNDERS_CAP;
		const foundersRemaining = Math.max(0, FOUNDERS_CAP - currentFoundersCount);

		// Calcular preço com desconto se for founder
		const basePrice = BASE_PRICE[normalizedInterval];
		const finalPrice = isFounder
			? Math.round(basePrice * (1 - FOUNDERS_DISCOUNT) * 100) / 100 // Aplicar 30% desconto
			: basePrice;

		// Preço mensal equivalente (para salvar no banco)
		const monthlyPriceEquivalent = normalizedInterval === "year"
			? finalPrice / 12 // Se anual, dividir por 12
			: finalPrice; // Se mensal, usar direto

		console.log(`📊 Founders: ${currentFoundersCount}/${FOUNDERS_CAP}, Vagas restantes: ${foundersRemaining}`);
		console.log(`💰 Preço base: R$ ${basePrice}, Preço final: R$ ${finalPrice} ${isFounder ? "(Founder - 30% OFF)" : ""}`);

		// 2. Buscar dados do Tenant
		const { data: tenant, error: tenantError } = await supabaseClient
			.from("tenants")
			.select("*")
			.eq("id", tenant_id)
			.single();

		if (tenantError || !tenant) {
			throw new Error("Tenant not found");
		}

		// Verificar se o usuário tem permissão (deve ser owner do tenant)
		if (tenant.owner_id !== user.id) {
			return new Response(
				JSON.stringify({
					error: "Forbidden - You are not the owner of this tenant",
				}),
				{
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// 3. Buscar profile do owner (para usar como fallback nos dados do cliente)
		const { data: owner, error: ownerError } = await supabaseClient
			.from("profiles")
			.select("*")
			.eq("id", tenant.owner_id)
			.single();

		if (ownerError || !owner) {
			throw new Error("Owner profile not found");
		}

		// 4. Preparar dados do cliente para o Asaas
		// Prioridade: dados do request > dados do banco > erro
		const customerName =
			customerDataFromRequest?.name ||
			tenant.business_name ||
			owner.full_name ||
			user.email ||
			"Cliente";

		const customerEmail =
			customerDataFromRequest?.email || owner.email || user.email || "";

		// CPF/CNPJ é OBRIGATÓRIO para criar Subscription no Asaas
		// Prioridade: dados do request > tenant.document > owner.cpf_cnpj
		const customerCpfCnpj =
			customerDataFromRequest?.cpfCnpj ||
			(tenant as any).document || // Se existir no tenant (campo pode ser 'document')
			(owner as any).cpf_cnpj || // Se existir no profile
			null;

		if (!customerCpfCnpj) {
			return new Response(
				JSON.stringify({
					error: "CPF_CNPJ_REQUIRED",
					message:
						"CPF ou CNPJ é obrigatório para realizar a assinatura. Por favor, preencha seus dados cadastrais antes de continuar.",
					requiredFields: ["cpfCnpj", "phone"],
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Telefone é OBRIGATÓRIO para criar Subscription no Asaas
		const customerPhone =
			customerDataFromRequest?.phone || tenant.phone || owner.whatsapp || null;

		if (!customerPhone) {
			return new Response(
				JSON.stringify({
					error: "PHONE_REQUIRED",
					message:
						"Telefone é obrigatório para realizar a assinatura. Por favor, preencha seus dados cadastrais antes de continuar.",
					requiredFields: ["cpfCnpj", "phone"],
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// 4. Garantir que existe um Cliente no Asaas (Customer)
		// Nota: asaas_customer_id está em tenant_subscriptions
		let asaasCustomerId: string | null = null;

		// Buscar customer_id existente em tenant_subscriptions
		const { data: existingSubscription } = await supabaseClient
			.from("tenant_subscriptions")
			.select("asaas_customer_id")
			.eq("tenant_id", tenant_id)
			.maybeSingle();

		asaasCustomerId = existingSubscription?.asaas_customer_id || null;

		// Função auxiliar para formatar telefone no padrão esperado pelo Asaas
		// O Asaas espera telefone no formato brasileiro: DDD + número (apenas números)
		// Formato válido: 10 dígitos (2 DDD + 8 número fixo) ou 11 dígitos (2 DDD + 9 número celular)
		// IMPORTANTE: O telefone deve ter DDD válido (11-99) e número válido
		const formatPhone = (phone: string | null | undefined): string | null => {
			if (!phone) {
				return null;
			}

			// Remove tudo que não é número
			let numbers = phone.replace(/\D/g, "");

			// Se tiver prefixo 55 (código do país), remove
			if (numbers.startsWith("55") && numbers.length > 11) {
				numbers = numbers.slice(2);
			}

			// Se não tiver números válidos, retorna null
			if (numbers.length === 0) {
				return null;
			}

			// Telefone brasileiro: 10 dígitos (fixo) ou 11 dígitos (celular)
			// DDD (2 dígitos, válido entre 11-99) + número (8 ou 9 dígitos)

			// Se tiver menos de 10 dígitos, não é válido
			if (numbers.length < 10) {
				return null;
			}

			// Se tiver exatamente 10 dígitos, está válido (DDD + 8 dígitos fixo)
			if (numbers.length === 10) {
				// Valida DDD (deve estar entre 11-99)
				const ddd = parseInt(numbers.substring(0, 2));
				if (ddd >= 11 && ddd <= 99) {
					return numbers;
				}
				return null;
			}

			// Se tiver 11 dígitos, está válido (DDD + 9 dígitos celular)
			if (numbers.length === 11) {
				// Valida DDD (deve estar entre 11-99)
				const ddd = parseInt(numbers.substring(0, 2));
				if (ddd >= 11 && ddd <= 99) {
					return numbers;
				}
				return null;
			}

			// Se tiver mais de 11, pega os últimos 11 e valida
			if (numbers.length > 11) {
				const last11 = numbers.slice(-11);
				const ddd = parseInt(last11.substring(0, 2));
				if (ddd >= 11 && ddd <= 99) {
					return last11;
				}
			}

			return null;
		};

		// Formatar telefone do cliente
		const formattedPhone = formatPhone(customerPhone);
		if (!formattedPhone) {
			return new Response(
				JSON.stringify({
					error: "INVALID_PHONE",
					message:
						"Telefone inválido. Use DDD + número (10 ou 11 dígitos). Exemplo: 11987654321",
					requiredFields: ["cpfCnpj", "phone"],
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// 5. Garantir que existe um Cliente no Asaas (Customer) COM CPF/CNPJ
		// IMPORTANTE: O Asaas exige CPF/CNPJ para criar Subscriptions
		if (!asaasCustomerId) {
			console.log("Criando cliente no Asaas...");

			// Preparar dados do cliente usando dados reais coletados
			const customerPayload: Record<string, string> = {
				name: customerName,
				email: customerEmail,
				externalReference: tenant_id,
				cpfCnpj: customerCpfCnpj.replace(/\D/g, ""), // Remove formatação (apenas números)
				phone: formattedPhone,
			};

			// Adicionar campos opcionais se disponíveis
			if (customerDataFromRequest?.address) {
				customerPayload.address = customerDataFromRequest.address;
			}
			if (customerDataFromRequest?.addressNumber) {
				customerPayload.addressNumber = customerDataFromRequest.addressNumber;
			}
			if (customerDataFromRequest?.postalCode) {
				customerPayload.postalCode = customerDataFromRequest.postalCode.replace(
					/\D/g,
					""
				);
			}
			if (customerDataFromRequest?.province) {
				customerPayload.province = customerDataFromRequest.province;
			}
			if (customerDataFromRequest?.city) {
				customerPayload.city = customerDataFromRequest.city;
			}

			console.log("Dados do cliente para Asaas:", {
				name: customerPayload.name,
				email: customerPayload.email,
				cpfCnpj: customerPayload.cpfCnpj
					? `${customerPayload.cpfCnpj.substring(0, 3)}***`
					: null, // Log parcial por segurança
				phone: customerPayload.phone
					? `${customerPayload.phone.substring(0, 5)}***`
					: null,
			});

			// Validar chave antes de fazer requisição
			if (!ASAAS_API_KEY || ASAAS_API_KEY.trim() === "") {
				throw new Error("ASAAS_API_KEY não está configurada ou está vazia");
			}

			console.log("📤 Fazendo requisição para criar customer no Asaas...");
			console.log("URL:", `${ASAAS_URL}/customers`);
			console.log("Chave presente:", !!ASAAS_API_KEY);
			console.log("Chave tamanho:", ASAAS_API_KEY?.length || 0);
			console.log("Chave início:", ASAAS_API_KEY?.substring(0, 20) || "vazia");

			// Garantir que a chave não está vazia antes de fazer a requisição
			if (!ASAAS_API_KEY || ASAAS_API_KEY.trim() === "") {
				throw new Error("ASAAS_API_KEY está vazia ou não foi configurada");
			}

			const requestHeaders = {
				"Content-Type": "application/json",
				"access_token": ASAAS_API_KEY.trim(),
			};

			console.log("Headers sendo enviados:", {
				"Content-Type": requestHeaders["Content-Type"],
				"access_token": requestHeaders["access_token"].substring(0, 20) + "...",
			});

			const customerRes = await fetch(`${ASAAS_URL}/customers`, {
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(customerPayload),
			});

			const customerResponse = await customerRes.json();
			if (customerResponse.errors) {
				throw new Error(
					`Erro Asaas Customer: ${customerResponse.errors[0]?.description ||
					customerResponse.errors[0]?.message ||
					"Erro desconhecido"
					}`
				);
			}

			asaasCustomerId = customerResponse.id;

			// Salvar customer_id em tenant_subscriptions
			const { error: updateError } = await supabaseClient
				.from("tenant_subscriptions")
				.upsert(
					{
						tenant_id: tenant_id,
						asaas_customer_id: asaasCustomerId,
					},
					{
						onConflict: "tenant_id",
					}
				);

			if (updateError) {
				console.error("Erro ao salvar asaas_customer_id:", updateError);
			}
		} else {
			// Se o customer já existe, verificar se tem CPF/CNPJ
			// Se não tiver, atualizar com CPF de teste (para sandbox)
			try {
				const customerCheckRes = await fetch(
					`${ASAAS_URL}/customers/${asaasCustomerId}`,
					{
						headers: { access_token: ASAAS_API_KEY! },
					}
				);

				if (customerCheckRes.ok) {
					const customerData = await customerCheckRes.json();
					// Se não tiver CPF/CNPJ ou telefone, atualizar com dados reais
					if (!customerData.cpfCnpj || !customerData.phone) {
						console.log(
							"Atualizando customer existente com dados cadastrais..."
						);

						const updatePayload: Record<string, string> = {};
						if (!customerData.cpfCnpj && customerCpfCnpj) {
							updatePayload.cpfCnpj = customerCpfCnpj.replace(/\D/g, "");
						}
						if (!customerData.phone && formattedPhone) {
							updatePayload.phone = formattedPhone;
						}

						if (Object.keys(updatePayload).length > 0) {
							const updateRes = await fetch(
								`${ASAAS_URL}/customers/${asaasCustomerId}`,
								{
									method: "PUT",
									headers: {
										"Content-Type": "application/json",
										access_token: ASAAS_API_KEY!,
									},
									body: JSON.stringify(updatePayload),
								}
							);
							const updateData = await updateRes.json();
							if (updateData.errors) {
								console.warn(
									"Aviso: não foi possível atualizar dados do customer:",
									updateData.errors
								);
							}
						}
					}
				}
			} catch (error) {
				console.warn(
					"Aviso: não foi possível verificar/atualizar customer:",
					error
				);
				// Não falhar - tentar continuar mesmo assim
			}
		}

		// 6. Criar a Assinatura (Subscription)
		console.log("Criando assinatura...");

		// Usar preço calculado (com desconto se for founder)
		const value = finalPrice;
		const cycle = normalizedInterval === "year" ? "YEARLY" : "MONTHLY";

		const subscriptionRes = await fetch(`${ASAAS_URL}/subscriptions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				access_token: ASAAS_API_KEY!,
			},
			body: JSON.stringify({
				customer: asaasCustomerId,
				billingType: "UNDEFINED", // UNDEFINED permite pagamento via boleto, PIX ou cartão
				value: value,
				nextDueDate: new Date(Date.now() + 86400000)
					.toISOString()
					.split("T")[0], // Cobrar amanhã
				cycle: cycle === "YEARLY" ? "YEARLY" : "MONTHLY",
				description: `Assinatura Arena System - ${normalizedInterval === "year" ? "Anual" : "Mensal"}${isFounder ? " (Founder 20 - 30% OFF)" : ""}`,
			}),
		});

		const subscriptionData = await subscriptionRes.json();
		if (subscriptionData.errors) {
			throw new Error(
				`Erro Asaas Subscription: ${subscriptionData.errors[0].description}`
			);
		}

		const subscriptionId = subscriptionData.id;
		console.log('ID do Asaas recebido:', subscriptionId);

		// Atualizar tabela tenant_subscriptions (usando admin para bypassar RLS)
		const { error: subscriptionUpdateError } = await supabaseAdmin
			.from("tenant_subscriptions")
			.upsert(
				{
					tenant_id: tenant_id,
					asaas_subscription_id: subscriptionId,
					asaas_customer_id: asaasCustomerId,
					plan_code: "arena", // Plano único ArenaSys
					plan_name: `ArenaSys${isFounder ? " (Founder 20)" : ""}`,
					status: "trial", // Status inicial - será atualizado pelo webhook quando pagar
					billing_interval: normalizedInterval,
					monthly_price: Math.round(monthlyPriceEquivalent * 100), // Preço mensal equivalente em centavos
					is_founder: isFounder, // Marcar como founder se aplicável
				},
				{
					onConflict: "tenant_id",
				}
			);

		if (subscriptionUpdateError) {
			console.error(
				"Erro ao atualizar tenant_subscriptions:",
				subscriptionUpdateError
			);
			// Não falhar se não conseguir salvar - o webhook pode atualizar depois
		}

		// 7. Criar Payment (Cobrança) para gerar URL de Checkout
		// IMPORTANTE: No Asaas, você precisa criar um Payment para obter a invoiceUrl (URL do checkout)
		console.log("Criando cobrança/payment para gerar URL de checkout...");

		// Criar payment vinculado à subscription com data de vencimento imediata (hoje ou amanhã)
		const dueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0]; // Amanhã

		// Criar Payment SEM callback primeiro (prioridade: funcionar sempre)
		const paymentBody: Record<string, any> = {
			customer: asaasCustomerId,
			billingType: "UNDEFINED", // Permite PIX, boleto ou cartão
			value: value,
			dueDate: dueDate,
			description: `Assinatura Arena System - ${normalizedInterval === "year" ? "Anual" : "Mensal"}${isFounder ? " (Founder 20 - 30% OFF)" : ""}`,
			subscription: subscriptionId, // Vincular à subscription criada
		};

		// Criar payment primeiro (sem callback para garantir que funciona)
		let paymentRes = await fetch(`${ASAAS_URL}/payments`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				access_token: ASAAS_API_KEY!,
			},
			body: JSON.stringify(paymentBody),
		});

		let paymentData = await paymentRes.json();

		// Se falhar, lançar erro (sem tentar callback)
		if (paymentData.errors) {
			console.error("Erro ao criar payment:", paymentData.errors);
			throw new Error(
				`Erro ao criar cobrança: ${paymentData.errors[0]?.description ||
				paymentData.errors[0]?.message ||
				"Erro desconhecido"
				}`
			);
		}

		// ✅ Payment criado com sucesso! Agora tentar adicionar callback (prioridade baixa)
		// Nota: O Asaas não permite atualizar callback depois, então tentamos criar com callback
		// apenas como fallback. Mas como isso pode falhar, priorizamos criar sem callback.

		// Tentar obter URL para callback (opcional - última prioridade)
		let frontendUrl = "";

		// Tentar 1: Pegar do header Referer ou Origin do request
		const referer = req.headers.get("referer") || req.headers.get("origin");
		if (referer) {
			try {
				const url = new URL(referer);
				frontendUrl = url.origin;
				console.log("URL base obtida do header:", frontendUrl);
			} catch (e) {
				console.warn("Erro ao parsear URL do header:", referer);
			}
		}

		// Tentar 2: Usar variável de ambiente FRONTEND_URL
		if (!frontendUrl) {
			frontendUrl = Deno.env.get("FRONTEND_URL") || "";
			if (frontendUrl) {
				console.log("URL base obtida de FRONTEND_URL:", frontendUrl);
			}
		}

		// Se tiver URL e quiser tentar callback, poderia tentar atualizar o payment
		// Mas o Asaas não permite atualizar payment após criação, então deixamos sem callback
		// O webhook e redirecionamento manual funcionam perfeitamente
		if (!frontendUrl) {
			console.log("ℹ️ Callback não configurado. Webhook atualizará status automaticamente.");
			console.log("   Para redirecionamento automático, configure FRONTEND_URL e cadastre domínio no Asaas.");
		}

		// A invoiceUrl é a URL do checkout do Asaas
		let checkoutUrl = paymentData.invoiceUrl;

		// Se não tiver invoiceUrl diretamente, tentar buscar em outros campos ou construir
		if (!checkoutUrl) {
			// No Asaas, a URL do checkout pode estar em diferentes campos
			// Tentar invoiceUrl primeiro, depois construir manualmente
			if (paymentData.id) {
				// Determinar base URL baseado no ambiente (sandbox vs produção)
				const baseUrl = ASAAS_URL.includes("sandbox")
					? "https://sandbox.asaas.com"
					: "https://www.asaas.com";

				// URL padrão do Asaas para checkout de pagamento
				checkoutUrl = `${baseUrl}/c/${paymentData.id}`;
				console.log("Usando URL construída do payment ID:", checkoutUrl);
			} else if (paymentData.invoiceNumber) {
				// Fallback: tentar construir com invoiceNumber
				const baseUrl = ASAAS_URL.includes("sandbox")
					? "https://sandbox.asaas.com"
					: "https://www.asaas.com";
				checkoutUrl = `${baseUrl}/c/${paymentData.invoiceNumber}`;
				console.log("Usando URL construída do invoiceNumber:", checkoutUrl);
			}
		} else {
			// Se tiver invoiceUrl, garantir que está usando o domínio correto para sandbox
			if (
				ASAAS_URL.includes("sandbox") &&
				checkoutUrl.includes("asaas.com") &&
				!checkoutUrl.includes("sandbox")
			) {
				checkoutUrl = checkoutUrl.replace("www.asaas.com", "sandbox.asaas.com");
				console.log("Ajustando URL para sandbox:", checkoutUrl);
			}
		}

		// Log para debug
		console.log("Payment criado:", {
			id: paymentData.id,
			invoiceUrl: paymentData.invoiceUrl,
			invoiceNumber: paymentData.invoiceNumber,
			status: paymentData.status,
			checkoutUrlFinal: checkoutUrl,
		});

		if (!checkoutUrl) {
			throw new Error(
				"Assinatura criada, mas não foi possível gerar link de pagamento. Entre em contato com o suporte."
			);
		}

		return new Response(
			JSON.stringify({
				url: checkoutUrl,
				subscriptionId: subscriptionId,
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("[ASAAS CHECKOUT ERROR]:", error);
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : "Erro interno do servidor",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});

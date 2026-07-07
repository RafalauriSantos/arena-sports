// Supabase Edge Function: asaas-create-checkout
// Fluxo correto: Cliente → Subscription → Fatura
// Implementação seguindo o padrão Asaas oficial

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { recordBillingOperationalEvent } from "../_shared/billing-ops.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
	createRequestContext,
	errorMessage,
	jsonResponse,
	logEvent,
	withLogFields,
} from "../_shared/observability.ts";

const FUNCTION_NAME = "asaas-create-checkout";

const ASAAS_API_KEY =
	Deno.env.get("ASAAS_API_KEY") ?? Deno.env.get("ASAAS_ACCESS_TOKEN");
const ASAAS_URL =
	Deno.env.get("ASAAS_API_URL") ||
	Deno.env.get("ASAAS_BASE_URL") ||
	"https://sandbox.asaas.com/api/v3";

// Oferta comercial atual
const OFFER_PRICE = {
	month: 69.9, // R$ 69,90/mês sem fidelidade
	year: 597, // R$ 597/ano preço cheio futuro
	founderYear: 397, // R$ 397/ano para Founder 20
} as const;

const FOUNDERS_CAP = 20; // Apenas 20 primeiros clientes

Deno.serve(async (req) => {
	let logContext = createRequestContext(FUNCTION_NAME, req);
	let supabaseAdmin: any | null = null;

	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		logEvent(logContext, "info", "request_started", {
			method: req.method,
		});

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
		supabaseAdmin = createClient(
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
			logEvent(logContext, "error", "config_missing", {
				config_key: "ASAAS_API_KEY",
			});
			throw new Error("ASAAS_API_KEY não configurado");
		}

		// Verificar se a chave não está vazia
		if (ASAAS_API_KEY.trim() === "") {
			logEvent(logContext, "error", "config_empty", {
				config_key: "ASAAS_API_KEY",
			});
			throw new Error("ASAAS_API_KEY está vazia");
		}

		logEvent(logContext, "info", "config_loaded", {
			asaas_environment: ASAAS_URL.includes("sandbox") ? "sandbox" : "production",
		});

		// Apenas um plano agora (removido start/pro)
		const normalizedInterval: "month" | "year" =
			interval === "year" || interval === "month" ? interval : "month";

		// Verificar autenticação
		const { data, error: authError } = await supabaseClient.auth.getUser();
		const user = data?.user || null;
		if (authError || !user) {
			logEvent(logContext, "warn", "auth_failed", {
				error: authError,
			});
			return jsonResponse(
				{ error: "Unauthorized - Invalid token" },
				401,
				logContext,
				corsHeaders
			);
		}
		logContext = withLogFields(logContext, { user_id: user.id });

		// 1. Buscar profile do usuário para obter tenant_id
		const { data: profile, error: profileError } = await supabaseClient
			.from("profiles")
			.select("tenant_id")
			.eq("id", user.id)
			.single();

		if (profileError || !profile?.tenant_id) {
			logEvent(logContext, "error", "profile_lookup_failed", {
				error: profileError,
			});
			throw new Error(
				"Profile não encontrado ou sem tenant_id. Complete o onboarding primeiro."
			);
		}

		const tenant_id = profile.tenant_id;
		logContext = withLogFields(logContext, { tenant_id });

		// 1.5. Verificar se ainda há vagas para Founders 20 e calcular preço
		const { data: foundersData, error: foundersError } = await supabaseAdmin
			.from("tenant_subscriptions")
			.select("id")
			.eq("is_founder", true)
			.eq("billing_interval", "year")
			.in("status", ["active", "trial", "past_due"]);

		if (foundersError) {
			logEvent(logContext, "error", "founder_subscriptions_lookup_failed", {
				error: foundersError,
			});
			// Decide how to handle this error. For now, let's assume 0 founders if error.
		}

		const currentFoundersCount = foundersData?.length || 0;
		const isFounder =
			normalizedInterval === "year" && currentFoundersCount < FOUNDERS_CAP;
		const foundersRemaining = Math.max(0, FOUNDERS_CAP - currentFoundersCount);

		const finalPrice =
			normalizedInterval === "month" ? OFFER_PRICE.month
			: isFounder ? OFFER_PRICE.founderYear
			: OFFER_PRICE.year;

		// Preço mensal equivalente (para salvar no banco)
		const monthlyPriceEquivalent = normalizedInterval === "year"
			? finalPrice / 12 // Se anual, dividir por 12
			: finalPrice; // Se mensal, usar direto

		logEvent(logContext, "info", "offer_resolved", {
			billing_interval: normalizedInterval,
			is_founder: isFounder,
			founders_count: currentFoundersCount,
			founders_remaining: foundersRemaining,
			price_cents: Math.round(finalPrice * 100),
		});

		// 2. Buscar dados do Tenant
		const { data: tenant, error: tenantError } = await supabaseClient
			.from("tenants")
			.select("*")
			.eq("id", tenant_id)
			.single();

		if (tenantError || !tenant) {
			logEvent(logContext, "error", "tenant_lookup_failed", {
				error: tenantError,
			});
			throw new Error("Tenant not found");
		}

		// Verificar se o usuário tem permissão (deve ser owner do tenant)
		if (tenant.owner_id !== user.id) {
			logEvent(logContext, "warn", "tenant_owner_check_failed");
			return jsonResponse(
				{
					error: "Forbidden - You are not the owner of this tenant",
				},
				403,
				logContext,
				corsHeaders
			);
		}

		// 3. Buscar profile do owner (para usar como fallback nos dados do cliente)
		const { data: owner, error: ownerError } = await supabaseClient
			.from("profiles")
			.select("*")
			.eq("id", tenant.owner_id)
			.single();

		if (ownerError || !owner) {
			logEvent(logContext, "error", "owner_profile_lookup_failed", {
				error: ownerError,
			});
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
			logEvent(logContext, "warn", "checkout_validation_failed", {
				reason: "missing_cpf_cnpj",
			});
			return jsonResponse(
				{
					error: "CPF_CNPJ_REQUIRED",
					message:
						"CPF ou CNPJ é obrigatório para realizar a assinatura. Por favor, preencha seus dados cadastrais antes de continuar.",
					requiredFields: ["cpfCnpj", "phone"],
				},
				400,
				logContext,
				corsHeaders
			);
		}

		// Telefone é OBRIGATÓRIO para criar Subscription no Asaas
		const customerPhone =
			customerDataFromRequest?.phone || tenant.phone || owner.whatsapp || null;

		if (!customerPhone) {
			logEvent(logContext, "warn", "checkout_validation_failed", {
				reason: "missing_phone",
			});
			return jsonResponse(
				{
					error: "PHONE_REQUIRED",
					message:
						"Telefone é obrigatório para realizar a assinatura. Por favor, preencha seus dados cadastrais antes de continuar.",
					requiredFields: ["cpfCnpj", "phone"],
				},
				400,
				logContext,
				corsHeaders
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
			logEvent(logContext, "warn", "checkout_validation_failed", {
				reason: "invalid_phone",
			});
			return jsonResponse(
				{
					error: "INVALID_PHONE",
					message:
						"Telefone inválido. Use DDD + número (10 ou 11 dígitos). Exemplo: 11987654321",
					requiredFields: ["cpfCnpj", "phone"],
				},
				400,
				logContext,
				corsHeaders
			);
		}

		// 5. Garantir que existe um Cliente no Asaas (Customer) COM CPF/CNPJ
		// IMPORTANTE: O Asaas exige CPF/CNPJ para criar Subscriptions
		if (!asaasCustomerId) {
			logEvent(logContext, "info", "asaas_customer_create_started");

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

			// Validar chave antes de fazer requisição
			if (!ASAAS_API_KEY || ASAAS_API_KEY.trim() === "") {
				logEvent(logContext, "error", "config_empty", {
					config_key: "ASAAS_API_KEY",
				});
				throw new Error("ASAAS_API_KEY não está configurada ou está vazia");
			}

			logEvent(logContext, "info", "asaas_api_request_started", {
				operation: "create_customer",
				method: "POST",
				endpoint: "/customers",
			});

			// Garantir que a chave não está vazia antes de fazer a requisição
			if (!ASAAS_API_KEY || ASAAS_API_KEY.trim() === "") {
				logEvent(logContext, "error", "config_empty", {
					config_key: "ASAAS_API_KEY",
				});
				throw new Error("ASAAS_API_KEY está vazia ou não foi configurada");
			}

			const requestHeaders = {
				"Content-Type": "application/json",
				"access_token": ASAAS_API_KEY.trim(),
			};

			const customerRes = await fetch(`${ASAAS_URL}/customers`, {
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(customerPayload),
			});

			const customerResponse = await customerRes.json();
			if (customerResponse.errors) {
				logEvent(logContext, "error", "asaas_api_request_failed", {
					operation: "create_customer",
					status: customerRes.status,
					errors: customerResponse.errors,
				});
				throw new Error(
					`Erro Asaas Customer: ${customerResponse.errors[0]?.description ||
					customerResponse.errors[0]?.message ||
					"Erro desconhecido"
					}`
				);
			}

			asaasCustomerId = customerResponse.id;
			logEvent(logContext, "info", "asaas_customer_created", {
				customer_id: asaasCustomerId,
			});

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
				logEvent(logContext, "error", "subscription_customer_update_failed", {
					customer_id: asaasCustomerId,
					error: updateError,
				});
			}
		} else {
			logEvent(logContext, "info", "asaas_customer_reused", {
				customer_id: asaasCustomerId,
			});
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
						logEvent(logContext, "info", "asaas_customer_update_started", {
							customer_id: asaasCustomerId,
							update_missing_cpf_cnpj: !customerData.cpfCnpj,
							update_missing_phone: !customerData.phone,
						});

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
								logEvent(logContext, "warn", "asaas_customer_update_failed", {
									customer_id: asaasCustomerId,
									status: updateRes.status,
									errors: updateData.errors,
								});
							}
						}
					}
				}
			} catch (error) {
				logEvent(logContext, "warn", "asaas_customer_check_failed", {
					customer_id: asaasCustomerId,
					error,
				});
				// Não falhar - tentar continuar mesmo assim
			}
		}

		const offerLabel =
			normalizedInterval === "month" ? "Mensal sem fidelidade"
			: isFounder ? "Anual Founder 20"
			: "Anual";

		// 6. Criar a Assinatura (Subscription)
		logEvent(logContext, "info", "asaas_subscription_create_started", {
			customer_id: asaasCustomerId,
			billing_interval: normalizedInterval,
		});

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
				description: `Assinatura Arena System - ${offerLabel}`,
			}),
		});

		const subscriptionData = await subscriptionRes.json();
		if (subscriptionData.errors) {
			logEvent(logContext, "error", "asaas_api_request_failed", {
				operation: "create_subscription",
				status: subscriptionRes.status,
				errors: subscriptionData.errors,
			});
			throw new Error(
				`Erro Asaas Subscription: ${subscriptionData.errors[0].description}`
			);
		}

		const subscriptionId = subscriptionData.id;
		logContext = withLogFields(logContext, { subscription_id: subscriptionId });
		logEvent(logContext, "info", "asaas_subscription_created");

		// Atualizar tabela tenant_subscriptions (usando admin para bypassar RLS)
		const { error: subscriptionUpdateError } = await supabaseAdmin
			.from("tenant_subscriptions")
			.upsert(
				{
					tenant_id: tenant_id,
					asaas_subscription_id: subscriptionId,
					asaas_customer_id: asaasCustomerId,
					plan_code: "arena", // Plano único ArenaSys
					plan_name: `ArenaSys${isFounder ? " (Founder anual)" : ""}`,
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
			logEvent(logContext, "error", "subscription_upsert_failed", {
				error: subscriptionUpdateError,
			});
			// Não falhar se não conseguir salvar - o webhook pode atualizar depois
		}

		// 7. Buscar a cobrança gerada pela assinatura.
		// O Asaas já cria a primeira cobrança ao criar a subscription. Criar outro
		// payment aqui gera cobrança duplicada e pode retornar uma URL sem vínculo
		// com a assinatura, impedindo o webhook de ativar o tenant corretamente.
		logEvent(logContext, "info", "asaas_payment_lookup_started");

		const paymentsRes = await fetch(
			`${ASAAS_URL}/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=10`,
			{
				headers: {
					access_token: ASAAS_API_KEY!,
				},
			}
		);

		const paymentsData = await paymentsRes.json();
		if (paymentsData.errors) {
			logEvent(logContext, "error", "asaas_api_request_failed", {
				operation: "lookup_subscription_payment",
				status: paymentsRes.status,
				errors: paymentsData.errors,
			});
			throw new Error(
				`Erro ao buscar cobrança: ${paymentsData.errors[0]?.description ||
				paymentsData.errors[0]?.message ||
				"Erro desconhecido"
				}`
			);
		}

		const payments = Array.isArray(paymentsData.data) ? paymentsData.data : [];
		const paymentData =
			payments.find((payment: any) => payment.status === "PENDING") ||
			payments[0];

		if (!paymentData?.id) {
			logEvent(logContext, "error", "asaas_payment_missing");
			throw new Error(
				"Assinatura criada, mas nenhuma cobrança vinculada foi encontrada. Entre em contato com o suporte."
			);
		}

		// Tentar obter URL para callback (opcional - última prioridade)
		let frontendUrl = "";

		// Tentar 1: Pegar do header Referer ou Origin do request
		const referer = req.headers.get("referer") || req.headers.get("origin");
		if (referer) {
			try {
				const url = new URL(referer);
				frontendUrl = url.origin;
				logEvent(logContext, "info", "frontend_origin_resolved", {
					source: "request_header",
				});
			} catch (e) {
				logEvent(logContext, "warn", "frontend_origin_parse_failed", {
					error: e,
				});
			}
		}

		// Tentar 2: Usar variável de ambiente FRONTEND_URL
		if (!frontendUrl) {
			frontendUrl = Deno.env.get("FRONTEND_URL") || "";
			if (frontendUrl) {
				logEvent(logContext, "info", "frontend_origin_resolved", {
					source: "FRONTEND_URL",
				});
			}
		}

		if (!frontendUrl) {
			logEvent(logContext, "warn", "frontend_callback_not_configured");
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
				logEvent(logContext, "info", "checkout_url_derived", {
					source: "payment_id",
				});
			} else if (paymentData.invoiceNumber) {
				// Fallback: tentar construir com invoiceNumber
				const baseUrl = ASAAS_URL.includes("sandbox")
					? "https://sandbox.asaas.com"
					: "https://www.asaas.com";
				checkoutUrl = `${baseUrl}/c/${paymentData.invoiceNumber}`;
				logEvent(logContext, "info", "checkout_url_derived", {
					source: "invoice_number",
				});
			}
		} else {
			// Se tiver invoiceUrl, garantir que está usando o domínio correto para sandbox
			if (
				ASAAS_URL.includes("sandbox") &&
				checkoutUrl.includes("asaas.com") &&
				!checkoutUrl.includes("sandbox")
			) {
				checkoutUrl = checkoutUrl.replace("www.asaas.com", "sandbox.asaas.com");
				logEvent(logContext, "info", "checkout_url_environment_adjusted", {
					asaas_environment: "sandbox",
				});
			}
		}

		logContext = withLogFields(logContext, { payment_id: paymentData.id });
		logEvent(logContext, "info", "asaas_payment_found", {
			payment_status: paymentData.status,
			has_invoice_url: Boolean(paymentData.invoiceUrl),
		});

		if (!checkoutUrl) {
			logEvent(logContext, "error", "checkout_url_missing");
			throw new Error(
				"Assinatura criada, mas não foi possível gerar link de pagamento. Entre em contato com o suporte."
			);
		}

		logEvent(logContext, "info", "checkout_created");
		await recordBillingOperationalEvent(supabaseAdmin, {
			event_type: "checkout_created",
			severity: "info",
			source: "asaas-create-checkout",
			function_name: FUNCTION_NAME,
			tenant_id,
			subscription_id: subscriptionId,
			payment_id: paymentData.id,
			message: "Checkout de assinatura criado.",
			metadata: {
				billing_interval: normalizedInterval,
				is_founder: isFounder,
				payment_status: paymentData.status,
			},
		});

		return jsonResponse(
			{
				url: checkoutUrl,
				subscriptionId: subscriptionId,
				paymentId: paymentData.id,
			},
			200,
			logContext,
			corsHeaders
		);
	} catch (error) {
		const message = errorMessage(error);
		logEvent(logContext, "error", "unexpected_error", {
			error,
			error_message: message,
		});
		await recordBillingOperationalEvent(supabaseAdmin, {
			event_type: "checkout_failed",
			severity: "error",
			source: "asaas-create-checkout",
			function_name: FUNCTION_NAME,
			tenant_id: logContext.tenant_id ?? null,
			subscription_id: logContext.subscription_id ?? null,
			payment_id: logContext.payment_id ?? null,
			message: "Falha ao criar checkout de assinatura.",
			metadata: {
				error_message: message,
			},
		});
		return jsonResponse(
			{
				error: message || "Erro interno do servidor",
			},
			500,
			logContext,
			corsHeaders
		);
	}
});

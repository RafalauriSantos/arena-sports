export type SetupChecklistItemId =
	| "profile"
	| "business"
	| "address"
	| "courts"
	| "pricing"
	| "cpf";

export type SetupChecklistPriority = "high" | "medium";

export interface SetupChecklistItem {
	id: SetupChecklistItemId;
	label: string;
	description: string;
	completed: boolean;
	priority: SetupChecklistPriority;
	navTo: string;
}

export interface SetupProgressUserProfile {
	full_name?: string | null;
	avatar_url?: string | null;
}

export interface SetupProgressTenant {
	business_name?: string | null;
	phone?: string | null;
	address?: string | null;
	cpf_cnpj?: string | null;
	cep?: string | null;
	street?: string | null;
	number?: string | null;
	neighborhood?: string | null;
	city?: string | null;
	state?: string | null;
}

export interface SetupProgressCourt {
	id?: string | null;
	base_price?: number | string | null;
}

export interface BuildSetupChecklistInput {
	userProfile?: SetupProgressUserProfile | null;
	tenant?: SetupProgressTenant | null;
	courts?: SetupProgressCourt[] | null;
}

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const hasCompleteTenantAddress = (
	tenant: SetupProgressTenant | null | undefined,
) => {
	if (!tenant) return false;
	if (hasText(tenant.address)) return true;

	return (
		hasText(tenant.street) &&
		hasText(tenant.number) &&
		hasText(tenant.neighborhood) &&
		hasText(tenant.city) &&
		hasText(tenant.state)
	);
};

export const buildSetupChecklist = ({
	userProfile,
	tenant,
	courts = [],
}: BuildSetupChecklistInput) => {
	const activeCourts = courts || [];
	const hasCourts = activeCourts.length > 0;
	const allCourtsPriced =
		activeCourts.length > 0 &&
		activeCourts.every((court) => Number(court.base_price || 0) > 0);

	const hasProfileName = hasText(userProfile?.full_name);
	const hasAvatar = hasText(userProfile?.avatar_url);
	const hasBusinessName = hasText(tenant?.business_name);
	const hasPhone = (tenant?.phone || "").replace(/\D/g, "").length >= 10;
	const hasAddress = hasCompleteTenantAddress(tenant);
	const cpfCnpjClean = (tenant?.cpf_cnpj || "").replace(/\D/g, "");
	const hasCpfCnpj = cpfCnpjClean.length === 11 || cpfCnpjClean.length === 14;

	const items: SetupChecklistItem[] = [
		{
			id: "profile",
			label: "Complete seu perfil",
			description: "Nome e foto",
			completed: hasProfileName && hasAvatar,
			priority: "high",
			navTo: "config",
		},
		{
			id: "business",
			label: "Dados da arena",
			description: "Nome comercial e telefone",
			completed: hasBusinessName && hasPhone,
			priority: "high",
			navTo: "config",
		},
		{
			id: "address",
			label: "Endereço completo",
			description: "Rua, número, bairro e cidade",
			completed: hasAddress,
			priority: "high",
			navTo: "config",
		},
		{
			id: "courts",
			label: "Cadastre suas quadras",
			description: "Pelo menos 1 quadra",
			completed: hasCourts,
			priority: "high",
			navTo: "config",
		},
		{
			id: "pricing",
			label: "Configure os preços",
			description: "Valores para cada quadra",
			completed: allCourtsPriced,
			priority: "high",
			navTo: "config",
		},
		{
			id: "cpf",
			label: "CPF/CNPJ",
			description: "Para você receber pagamentos",
			completed: hasCpfCnpj,
			priority: "medium",
			navTo: "config",
		},
	];

	const completed = items.filter((item) => item.completed).length;
	const total = items.length;

	return {
		items,
		completed,
		total,
		isComplete: completed === total,
	};
};

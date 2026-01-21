import { useState, useEffect, useRef } from "react";
import type * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabaseClient";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import {
	Trophy,
	Sparkles,
	CreditCard,
	Copy,
	Check,
	Plus,
	Save,
	ExternalLink,
	Loader2,
	Trash2,
	User,
	BadgeDollarSign,
	Store,
	Wallet,
	Globe,
	Lock, // Ícone de cadeado
	Clock,
	MapPin,
	type LucideIcon,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarUpload from "@/components/admin/AvatarUpload";
import { OperatingHoursSettings } from "@/components/settings/OperatingHoursSettings";
import { CpfCnpjInput } from "@/components/ui/CpfCnpjInput";
import { formatPhoneInput } from "@/lib/phoneFormat";
import { formatCep, unformatCep, fetchAddressByCep, isValidCep } from "@/lib/cep";

// --- Componentes Auxiliares ---
const StatusBadge = ({
	status,
	children,
}: {
	status: "success" | "warning";
	children: React.ReactNode;
}) => (
	<span
		className={`px-2 py-1 rounded-full text-xs font-bold ${
			status === "success"
				? "bg-green-500/20 text-green-400"
				: "bg-yellow-500/20 text-yellow-400"
		}`}>
		{children}
	</span>
);

function TabTrigger({
	value,
	icon: Icon,
	label,
}: {
	value: string;
	icon: LucideIcon;
	label: string;
}) {
	return (
		<TabsTrigger
			value={value}
			className="w-full flex items-center gap-2 px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-gray-400 hover:text-white transition-all">
			<Icon className="h-4 w-4" />
			<span className="hidden md:inline">{label}</span>
		</TabsTrigger>
	);
}

function PremiumCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-white">{title}</CardTitle>
				<CardDescription className="text-gray-400">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="min-h-screen bg-gray-950 p-6 space-y-8">
			<div className="max-w-5xl mx-auto space-y-8">
				<Skeleton className="h-12 w-48 bg-gray-800" />
				<Skeleton className="h-12 w-full bg-gray-800" />
				<div className="grid grid-cols-3 gap-6">
					<Skeleton className="col-span-2 h-96 bg-gray-800" />
					<Skeleton className="col-span-1 h-96 bg-gray-800" />
				</div>
			</div>
		</div>
	);
}

// --- Componente Principal ---

export default function ConfiguracoesView() {
	const {
		loading,
		saving,
		formData,
		subscription,
		isTrial,
		refetchSubscription,
		updateTenant,
		updatePromo,
		updateCourt,
		removeCourt,
		addCourt,
		saveSettings,
		bookingSettings,
		updateBookingSettings,
	} = useSettings();

	const { user, userProfile, updateProfile } = useAuth();
	const { toast } = useToast();

	const [profileName, setProfileName] = useState("");
	const [profileJobTitle, setProfileJobTitle] = useState("");
	const [copied, setCopied] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<"start" | "pro">("pro");
	const [billingInterval, setBillingInterval] = useState<"month" | "year">(
		"month"
	);
	const [startingCheckout, setStartingCheckout] = useState(false);
	const [syncingCheckout, setSyncingCheckout] = useState(false);
	const [searchingCep, setSearchingCep] = useState(false);
	const subscriptionStatusRef = useRef(subscription?.status);

	useEffect(() => {
		subscriptionStatusRef.current = subscription?.status;
	}, [subscription?.status]);

	// Função para buscar CEP automaticamente
	const handleCepSearch = async (cep: string) => {
		const cleanCep = unformatCep(cep);
		
		if (cleanCep.length !== 8) return;
		
		setSearchingCep(true);
		
		try {
			const data = await fetchAddressByCep(cleanCep);
			
			if (data) {
				// Atualiza os campos automaticamente
				updateTenant("street", data.logradouro);
				updateTenant("neighborhood", data.bairro);
				updateTenant("city", data.localidade);
				updateTenant("state", data.uf);
				
				toast({
					title: "CEP encontrado!",
					description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
				});
			}
		} catch (error) {
			toast({
				title: "Erro ao buscar CEP",
				description: error instanceof Error ? error.message : "Tente novamente.",
				variant: "destructive",
			});
		} finally {
			setSearchingCep(false);
		}
	};

	const computeTrialDaysLeft = () => {
		if (subscription.status !== "trial") return null;
		const startedAt = subscription.trial_started_at
			? new Date(subscription.trial_started_at)
			: null;
		const endsAt = subscription.trial_ends_at
			? new Date(subscription.trial_ends_at)
			: startedAt
			? new Date(new Date(startedAt).setDate(startedAt.getDate() + 21))
			: null;
		if (!endsAt) return null;
		return Math.max(
			0,
			Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
		);
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const asaasStatus = params.get("asaas");
		const isAsaasReturn =
			asaasStatus === "success" ||
			asaasStatus === "cancel" ||
			asaasStatus === "expired";
		const isAsaasSuccessReturn = asaasStatus === "success";
		const isAsaasCancelReturn =
			asaasStatus === "cancel" || asaasStatus === "expired";
		const pending = localStorage.getItem("asaas_checkout_pending") === "1";

		if (!pending && !isAsaasReturn) return;
		if (isAsaasCancelReturn) {
			localStorage.removeItem("asaas_checkout_pending");
			return;
		}
		const currentStatus = subscriptionStatusRef.current;
		if (
			!isAsaasReturn &&
			(currentStatus === "active" || currentStatus === "trial")
		) {
			localStorage.removeItem("asaas_checkout_pending");
			return;
		}

		let cancelled = false;
		setSyncingCheckout(true);
		(async () => {
			const startedAt = Date.now();
			const maxBlockingMs = 12_000;
			while (!cancelled && Date.now() - startedAt < maxBlockingMs) {
				try {
					await refetchSubscription();
				} catch {
					// ignore and keep retrying
				}

				const status = subscriptionStatusRef.current;
				if (
					status === "active" ||
					status === "trial" ||
					status === "past_due"
				) {
					break;
				}
				await new Promise((r) => setTimeout(r, 800));
			}

			const status = subscriptionStatusRef.current;
			const isUpdated =
				status === "active" || status === "trial" || status === "past_due";
			if (isUpdated) {
				localStorage.removeItem("asaas_checkout_pending");
			}

			setSyncingCheckout(false);
			if (isAsaasSuccessReturn && !cancelled && !isUpdated) {
				toast({
					title: "Ainda não confirmamos o pagamento",
					description:
						"Dê alguns segundos e recarregue a página se a assinatura não aparecer.",
					variant: "destructive",
				});
			}

			if (isAsaasReturn) {
				const url = new URL(window.location.href);
				url.searchParams.delete("asaas");
				url.searchParams.delete("plan");
				url.searchParams.delete("interval");
				window.history.replaceState({}, "", url.toString());
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [refetchSubscription, subscription?.status]);

	useEffect(() => {
		const planCode = (subscription?.plan_code ?? "").toLowerCase();
		if (planCode === "start" || planCode === "pro") {
			setSelectedPlan(planCode);
			return;
		}
		const name = (subscription?.plan_name ?? "").toLowerCase();
		setSelectedPlan(name.includes("pro") ? "pro" : "start");
	}, [subscription?.plan_code, subscription?.plan_name]);

	useEffect(() => {
		if (userProfile) {
			setProfileName(userProfile.full_name || "");
			setProfileJobTitle(userProfile.job_title || "");
		}
	}, [userProfile]);

	const saveProfile = async () => {
		try {
			if (!updateProfile) throw new Error("Update not available");
			await updateProfile({
				full_name: profileName,
				job_title: profileJobTitle,
			});
			toast({
				title: "Perfil salvo",
				description: "Atualizado com sucesso.",
				className: "bg-green-600 text-white border-none",
			});
		} catch (err) {
			toast({
				title: "Erro",
				description: "Falha ao atualizar perfil.",
				variant: "destructive",
			});
		}
	};

	const startCheckout = async () => {
		try {
			setStartingCheckout(true);
			const { data: refreshed, error: refreshError } =
				await supabase.auth.refreshSession();
			if (refreshError || !refreshed?.session?.access_token) {
				await supabase.auth.signOut();
				throw new Error("Sua sessão expirou. Faça login novamente.");
			}
			const accessToken = refreshed.session.access_token;

			// Check if CPF/CNPJ is filled
			const cpfCnpj = formData.tenant.cpf_cnpj?.replace(/\D/g, "") || "";
			if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
				throw new Error(
					"CPF/CNPJ é obrigatório para realizar a assinatura. Preencha seus dados cadastrais antes de continuar."
				);
			}

			const data = await invokeEdgeFunction<{
				url?: string;
				subscriptionId?: string;
			}>("asaas-create-checkout", {
				accessToken,
				body: {
					plan_code: selectedPlan,
					interval: billingInterval,
				},
			});

			console.log("✅ Resposta da Edge Function:", data);

			if (!data?.url) {
				console.error("❌ Checkout não retornou URL. Resposta completa:", data);
				throw new Error(
					"Checkout não retornou URL. Verifique os logs da Edge Function."
				);
			}

			// Validar que a URL parece válida
			if (!data.url.startsWith("http://") && !data.url.startsWith("https://")) {
				console.error("❌ URL inválida retornada:", data.url);
				throw new Error(`URL de checkout inválida: ${data.url}`);
			}

			console.log("🔄 Redirecionando para checkout:", data.url);
			localStorage.setItem("asaas_checkout_pending", "1");

			// Redirecionar para o checkout do Asaas
			window.location.href = data.url as string;
		} catch (err: unknown) {
			console.error(err);
			const message = err instanceof Error ? err.message : "Tente novamente.";
			const isNetworkError =
				err instanceof TypeError &&
				/failed to fetch|networkerror|load failed/i.test(message);
			toast({
				title: "Não foi possível iniciar a assinatura",
				description: isNetworkError
					? "Falha de conexão com a Edge Function. Verifique se a função 'asaas-create-checkout' está deployada e se VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY estão corretas no ambiente."
					: message,
				variant: "destructive",
			});
		} finally {
			setStartingCheckout(false);
		}
	};

	// 🛡️ REGRA DE OURO: Sanitização Automática
	const generateSlug = (text: string) => {
		return text
			.toLowerCase()
			.normalize("NFD") // Separa acentos das letras
			.replace(/[\u0300-\u036f]/g, "") // Remove os acentos
			.replace(/[^a-z0-9]+/g, "-") // Troca espaços e símbolos por hífen
			.replace(/^-+|-+$/g, "") // Remove hifens do começo/fim
			.replace(/-+/g, "-"); // Remove hifens duplicados
	};

	// Quando digita o nome, atualiza o nome E o link automaticamente
	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		updateTenant("business_name", newName);
		updateTenant("subdomain", generateSlug(newName));
	};

	const getPublicLink = () => {
		const origin = window.location.origin;
		const slug = formData.tenant.subdomain || "sua-arenasys";
		return `${origin}/agendar/${slug}`;
	};

	const handleCopyLink = async () => {
		const link = getPublicLink();
		if (navigator.clipboard && navigator.clipboard.writeText) {
			try {
				await navigator.clipboard.writeText(link);
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
				return;
			} catch (err) {
				console.warn("Clipboard API falhou", err);
			}
		}
		// Fallback manual
		try {
			const textArea = document.createElement("textarea");
			textArea.value = link;
			textArea.style.position = "fixed";
			textArea.style.opacity = "0";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const successful = document.execCommand("copy");
			document.body.removeChild(textArea);
			if (successful) {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			}
		} catch (err) {
			toast({
				title: "Erro",
				description: "Copie manualmente.",
				variant: "destructive",
			});
		}
	};

	const handleOpenLink = () => {
		window.open(getPublicLink(), "_blank");
	};

	if (loading) return <LoadingSkeleton />;

	return (
		<div className="min-h-screen bg-gray-950 text-gray-50 pb-20">
			<div className="max-w-5xl mx-auto p-6 space-y-8">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-white">
							Configurações
						</h1>
						<p className="text-gray-400 mt-1">
							Gerencie sua ArenaSys, preços e automações.
						</p>
					</div>
					<Button
						onClick={saveSettings}
						disabled={saving}
						className="bg-white text-gray-950 hover:bg-gray-200 font-medium px-6 transition-all shadow-lg">
						{saving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" /> Salvar Alterações
							</>
						)}
					</Button>
				</div>

				{/* TABS */}
				<Tabs defaultValue="arena-sys" className="space-y-8">
					<TabsList className="w-full h-auto bg-white/5 p-1 rounded-2xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
						<TabTrigger value="perfil" icon={User} label="Meu Perfil" />
						<TabTrigger value="arena-sys" icon={Store} label="Identidade" />
						<TabTrigger value="quadras" icon={Trophy} label="Quadras" />
						<TabTrigger value="horarios" icon={Clock} label="Horários" />
						<TabTrigger value="cobranca" icon={Wallet} label="Cobrança" />
						<TabTrigger value="marketing" icon={Sparkles} label="Marketing" />
						<TabTrigger
							value="billing"
							icon={BadgeDollarSign}
							label="Assinatura"
						/>
					</TabsList>

					{/* MEU PERFIL */}
					<TabsContent
						value="perfil"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="max-w-2xl">
							<PremiumCard
								title="Meu Perfil"
								description="Seus dados de acesso.">
								<div className="flex flex-col items-center gap-6">
									<AvatarUpload />
									<div className="w-full space-y-4">
										<div className="space-y-2">
											<Label>Nome Completo</Label>
											<Input
												value={profileName}
												onChange={(e) => setProfileName(e.target.value)}
												className="bg-white/5 border-white/10 text-white"
											/>
										</div>
										<div className="space-y-2">
											<Label>Cargo</Label>
											<Input
												value={profileJobTitle}
												onChange={(e) => setProfileJobTitle(e.target.value)}
												className="bg-white/5 border-white/10 text-white"
											/>
										</div>
										<div className="space-y-2">
											<Label>E-mail</Label>
											<Input
												value={user?.email || ""}
												readOnly
												className="bg-white/5 border-white/10 opacity-50 cursor-not-allowed text-white"
											/>
										</div>
										<Button
											onClick={saveProfile}
											className="w-full bg-primary text-primary-foreground">
											Salvar Perfil
										</Button>
									</div>
								</div>
							</PremiumCard>
						</div>
					</TabsContent>

					{/* IDENTIDADE (TRAVADA) */}
					<TabsContent
						value="arena-sys"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="md:col-span-2 space-y-6">
								<PremiumCard
									title="Identidade da ArenaSys"
									description="Dados visíveis para seu cliente.">
									<div className="space-y-4">
										{/* CAMPO NOME - ÚNICO EDITÁVEL */}
										<div className="space-y-2">
											<Label className="text-gray-300">Nome Comercial</Label>
											<Input
												value={formData.tenant.business_name}
												onChange={handleNameChange} // <--- GERA O LINK AUTOMÁTICO
												className="bg-white/5 border-white/10 text-white font-medium text-lg"
												placeholder="Ex: ArenaSys Champions"
											/>
											<p className="text-xs text-gray-500">
												O link da agenda será gerado a partir deste nome.
											</p>
										</div>

										{/* CAMPO URL - TRAVADO */}
										<div className="space-y-2">
											<Label className="text-gray-300 flex items-center gap-2">
												<Globe className="h-4 w-4 text-primary" /> Endereço da
												Agenda (URL)
											</Label>
											<div className="flex items-center group opacity-80 cursor-not-allowed">
												<span className="bg-white/5 border border-white/10 border-r-0 rounded-l-md px-3 h-10 flex items-center text-gray-500 text-sm">
													arenasys.app/agendar/
												</span>
												<div className="relative w-full">
													<Input
														value={formData.tenant.subdomain}
														readOnly
														disabled
														className="bg-white/5 border-white/10 text-gray-400 rounded-l-none pl-3 pr-8 italic cursor-not-allowed"
													/>
													<Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-600" />
												</div>
											</div>
										</div>

										<div className="space-y-2">
											<Label className="text-gray-300">Descrição</Label>
											<Textarea
												value={formData.tenant.description}
												onChange={(e) =>
													updateTenant("description", e.target.value)
												}
												className="bg-white/5 border-white/10 text-white min-h-[100px]"
											/>
											<p className="text-xs text-gray-500">
												Bio curta da arena exibida no calendário público.
											</p>
										</div>
									</div>
								</PremiumCard>
								<PremiumCard
									title="Contato"
									description="Canais de comunicação.">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>WhatsApp</Label>
											<Input
												value={formData.tenant.phone}
												onChange={(e) => {
													const formatted = formatPhoneInput(e.target.value);
													updateTenant("phone", formatted);
												}}
												autoComplete="tel"
												inputMode="numeric"
												maxLength={15}
												placeholder="(11) 99999-9999"
												className="bg-white/5 border-white/10 text-white font-medium"
											/>
										</div>
										<div className="space-y-2">
											<Label>E-mail</Label>
											<Input
												value={formData.tenant.email}
												onChange={(e) => updateTenant("email", e.target.value)}
												className="bg-white/5 border-white/10 text-white"
											/>
										</div>
									<div className="md:col-span-2">
										<CpfCnpjInput
											value={formData.tenant.cpf_cnpj || ""}
											onChange={(value) => updateTenant("cpf_cnpj", value)}
										/>
										<p className="text-xs text-gray-500 mt-2">
											Obrigatório para processar pagamentos via Asaas.
										</p>
									</div>
									</div>
								</PremiumCard>

								{/* CARD ENDEREÇO */}
								<PremiumCard
									title="Localização"
									description="Endereço exibido no calendário público.">
									<div className="space-y-4">
										{/* CEP com busca automática */}
										<div className="space-y-2">
											<Label>CEP</Label>
											<div className="flex gap-2">
												<Input
													value={formData.tenant.cep}
													onChange={(e) => {
														const formatted = formatCep(e.target.value);
														updateTenant("cep", formatted);
														// Busca automaticamente quando completar 8 dígitos
														if (unformatCep(formatted).length === 8) {
															handleCepSearch(formatted);
														}
													}}
													placeholder="12345-678"
													maxLength={9}
													className="bg-white/5 border-white/10 text-white font-medium"
													disabled={searchingCep}
												/>
												<Button
													variant="outline"
													onClick={() => handleCepSearch(formData.tenant.cep)}
													disabled={searchingCep || !isValidCep(formData.tenant.cep)}
													className="shrink-0">
													{searchingCep ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														"Buscar"
													)}
												</Button>
											</div>
										</div>

										{/* Rua e Número */}
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div className="sm:col-span-2 space-y-2">
												<Label>Rua/Avenida</Label>
												<Input
													value={formData.tenant.street}
													onChange={(e) => updateTenant("street", e.target.value)}
													placeholder="Av. Paulista"
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
											<div className="space-y-2">
												<Label>Número</Label>
												<Input
													value={formData.tenant.number}
													onChange={(e) => updateTenant("number", e.target.value)}
													placeholder="1000"
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
										</div>

										{/* Complemento */}
										<div className="space-y-2">
											<Label>Complemento (opcional)</Label>
											<Input
												value={formData.tenant.complement}
												onChange={(e) => updateTenant("complement", e.target.value)}
												placeholder="Sala 10, Bloco A, etc"
												className="bg-white/5 border-white/10 text-white"
											/>
										</div>

										{/* Bairro, Cidade, Estado */}
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div className="space-y-2">
												<Label>Bairro</Label>
												<Input
													value={formData.tenant.neighborhood}
													onChange={(e) => updateTenant("neighborhood", e.target.value)}
													placeholder="Centro"
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
											<div className="space-y-2">
												<Label>Cidade</Label>
												<Input
													value={formData.tenant.city}
													onChange={(e) => updateTenant("city", e.target.value)}
													placeholder="São Paulo"
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
											<div className="space-y-2">
												<Label>UF</Label>
												<Input
													value={formData.tenant.state}
													onChange={(e) => updateTenant("state", e.target.value.toUpperCase())}
													placeholder="SP"
													maxLength={2}
													className="bg-white/5 border-white/10 text-white uppercase"
												/>
											</div>
										</div>

										{/* Preview do endereço */}
										{(formData.tenant.street || formData.tenant.city) && (
											<div className="p-3 bg-white/5 border border-white/10 rounded-lg">
												<p className="text-xs text-gray-400 mb-1">Preview:</p>
												<p className="text-sm text-white font-medium">
													{formData.tenant.street && `${formData.tenant.street}`}
													{formData.tenant.number && `, ${formData.tenant.number}`}
													{formData.tenant.complement && ` - ${formData.tenant.complement}`}
													{formData.tenant.neighborhood && ` - ${formData.tenant.neighborhood}`}
													{formData.tenant.city && `, ${formData.tenant.city}`}
													{formData.tenant.state && `/${formData.tenant.state}`}
												</p>
											</div>
										)}
									</div>
								</PremiumCard>
							</div>

							{/* CARD LINK PÚBLICO */}
							<div className="md:col-span-1">
								<Card className="bg-gradient-to-br from-primary/10 to-black/40 backdrop-blur-md border border-primary/20 shadow-2xl h-full">
									<CardHeader>
										<CardTitle className="text-primary text-lg flex items-center gap-2">
											<ExternalLink className="h-5 w-5" /> Link de Agendamento
										</CardTitle>
										<CardDescription className="text-primary/70">
											Envie este link para seus clientes.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="p-4 bg-black/60 rounded-xl border border-primary/10 flex flex-col gap-2">
											<span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
												URL Oficial
											</span>
											<div
												className="text-sm font-mono text-white break-all cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
												onClick={handleCopyLink}>
												{formData.tenant.subdomain ? (
													<span>
														{window.location.host}/agendar/
														{formData.tenant.subdomain}
													</span>
												) : (
													<span className="text-gray-600">
														Preencha o nome...
													</span>
												)}
												{copied ? (
													<Check className="h-4 w-4 text-green-500 flex-shrink-0" />
												) : (
													<Copy className="h-4 w-4 text-gray-500 flex-shrink-0" />
												)}
											</div>
										</div>
										<div className="space-y-3">
											<Button
												onClick={handleOpenLink}
												disabled={!formData.tenant.subdomain}
												className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
												<ExternalLink className="mr-2 h-4 w-4" /> Abrir Agenda
											</Button>
											<Button
												variant="outline"
												onClick={handleCopyLink}
												disabled={!formData.tenant.subdomain}
												className="w-full border-white/10 text-gray-300 hover:bg-white/5">
												<Copy className="mr-2 h-4 w-4" /> Copiar Link
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					{/* ... OUTRAS ABAS (Mantidas Igual) ... */}
					{/* Pode copiar o conteúdo das outras abas (quadras, cobrança, etc) do código anterior ou manter oculto aqui pra não ficar gigante, o importante foi a aba IDENTIDADE acima */}
					{/* HORÁRIOS DE FUNCIONAMENTO */}
					<TabsContent
						value="horarios"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="max-w-3xl">
							<OperatingHoursSettings 
								tenantId={userProfile?.tenant_id || ''} 
							/>
						</div>
					</TabsContent>

					<TabsContent
						value="quadras"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<PremiumCard title="Quadras" description="Gerencie seus espaços.">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-medium text-white">
									Quadras Cadastradas
								</h3>
								<Button
									onClick={addCourt}
									variant="outline"
									className="border-dashed border-white/20 text-gray-300 hover:bg-white/5 hover:text-white">
									<Plus className="mr-2 h-4 w-4" /> Nova Quadra
								</Button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{formData.courts.map((court, index) => (
									<Card
										key={index}
										className="bg-black/20 border-white/5 backdrop-blur-sm group">
										<CardHeader className="pb-3 flex flex-row items-center justify-between">
											<div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white">
												<Trophy className="h-5 w-5" />
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeCourt(index)}
												className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-400/10">
												<Trash2 className="h-4 w-4" />
											</Button>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-2">
												<Label className="text-xs uppercase text-gray-500">
													Nome
												</Label>
												<Input
													value={court.name}
													onChange={(e) =>
														updateCourt(index, "name", e.target.value)
													}
													placeholder="Ex: Quadra 1, Campo Society, etc"
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div className="space-y-2 flex flex-col">
													<Label className="text-xs uppercase text-gray-500">
														Preço 1h (R$)
													</Label>
													<Input
														type="number"
														value={court.base_price || ""}
														onChange={(e) =>
															updateCourt(
																index,
																"base_price",
																Number(e.target.value) || 0
															)
														}
														placeholder="Ex: 100, 150, 200"
														className="bg-white/5 border-white/10 text-white"
													/>
												</div>
												<div className="space-y-2 flex flex-col">
													<Label className="text-xs uppercase text-gray-500">
														Meia hora adicional (R$)
													</Label>
													<Input
														type="number"
														value={court.half_hour_price !== undefined ? court.half_hour_price : ""}
														onChange={(e) => {
															const value = e.target.value;
															updateCourt(
																index,
																"half_hour_price",
																value === "" ? 0 : Number(value) || 0
															);
														}}
														placeholder="Ex: 50, 75, 100"
														className="bg-white/5 border-white/10 text-white"
													/>
													<p className="text-xs text-gray-500 mt-1">
														Total 1h30: R$ {((court.base_price || 0) + (court.half_hour_price || 0)).toFixed(2)}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</PremiumCard>
					</TabsContent>

					<TabsContent
						value="cobranca"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<PremiumCard
								title="Sinal de Reserva"
								description="Exija pagamento parcial.">
								<div className="space-y-6">
									<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
										<div className="space-y-0.5">
											<Label className="text-base text-gray-200">
												Exigir Sinal
											</Label>
											<p className="text-xs text-gray-500">
												Obrigatório para reservar.
											</p>
										</div>
										<Switch
											checked={bookingSettings.require_deposit}
											onCheckedChange={(v) =>
												updateBookingSettings("require_deposit", v)
											}
											className="data-[state=checked]:bg-green-500"
										/>
									</div>
									{bookingSettings.require_deposit && (
										<div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-4 animate-in slide-in-from-top-2">
											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label className="text-xs uppercase text-gray-400">
														Tipo
													</Label>
													<select
														className="w-full bg-gray-950 border border-white/10 rounded-md h-10 px-3 text-white text-sm"
														value={bookingSettings.deposit_type}
														onChange={(e) =>
															updateBookingSettings(
																"deposit_type",
																e.target.value
															)
														}>
														<option value="percent">Porcentagem (%)</option>
														<option value="fixed">Valor Fixo (R$)</option>
													</select>
												</div>
												<div className="space-y-2">
													<Label className="text-xs uppercase text-gray-400">
														Valor
													</Label>
													<Input
														type="number"
														className="bg-gray-950 border-white/10 text-white"
														value={bookingSettings.deposit_value}
														onChange={(e) =>
															updateBookingSettings(
																"deposit_value",
																Number(e.target.value)
															)
														}
													/>
												</div>
											</div>
										</div>
									)}
								</div>
							</PremiumCard>
							<PremiumCard
								title="Desconto à Vista"
								description="Incentive pagamento total.">
								<div className="space-y-6">
									<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
										<div className="space-y-0.5">
											<Label className="text-base text-gray-200">
												Ativar Desconto
											</Label>
											<p className="text-xs text-gray-500">
												Para pagamento 100% online.
											</p>
										</div>
										<Switch
											checked={bookingSettings.enable_full_payment_discount}
											onCheckedChange={(v) =>
												updateBookingSettings("enable_full_payment_discount", v)
											}
											className="data-[state=checked]:bg-primary"
										/>
									</div>
									{bookingSettings.enable_full_payment_discount && (
										<div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-4 animate-in slide-in-from-top-2">
											<div className="space-y-2">
												<div className="flex justify-between">
													<Label className="text-xs uppercase text-gray-400">
														Desconto
													</Label>
													<span className="text-primary font-bold">
														{bookingSettings.full_payment_discount_percent}%
													</span>
												</div>
												<Slider
													value={[
														bookingSettings.full_payment_discount_percent,
													]}
													max={50}
													step={1}
													onValueChange={([v]) =>
														updateBookingSettings(
															"full_payment_discount_percent",
															v
														)
													}
												/>
											</div>
										</div>
									)}
								</div>
							</PremiumCard>
						</div>
					</TabsContent>

					<TabsContent
						value="marketing"
						className="animate-in fade-in slide-in-from-bottom-4">
						<PremiumCard
							title="Preços Dinâmicos"
							description="IA para ajustar preços.">
							<div className="relative opacity-50 pointer-events-none">
								{/* Overlay com cadeado */}
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/50 rounded-xl z-10">
									<Lock className="h-8 w-8 text-gray-400" />
									<p className="text-gray-400 font-medium">Em Desenvolvimento</p>
								</div>
								
								{/* Conteúdo original (desabilitado visualmente) */}
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<Label className="text-white text-base">
											Ativar Promoção Automática
										</Label>
										<p className="text-gray-400 text-sm">
											Descontos em horários ociosos.
										</p>
									</div>
									<Switch
										checked={false}
										disabled
										className="data-[state=checked]:bg-primary"
									/>
								</div>
								<div className="mt-6 space-y-4 p-4 bg-gray-950/30 rounded-xl border border-white/5">
									<div className="flex justify-between">
										<Label className="text-gray-200">Porcentagem</Label>
										<span className="text-primary font-bold">
											0% OFF
										</span>
									</div>
									<Slider
										value={[0]}
										max={50}
										step={5}
										disabled
									/>
								</div>
							</div>
						</PremiumCard>
					</TabsContent>

					<TabsContent
						value="billing"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Card className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
								<CardHeader>
									<CardTitle className="text-white">Seu Plano</CardTitle>
									<CardDescription className="text-gray-400">
										Status da assinatura.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="flex items-center justify-between p-4 bg-gray-950/50 rounded-lg border border-white/5">
										<div>
											<p className="text-sm text-gray-400">Plano Atual</p>
											<p className="text-xl font-bold text-white mt-1">
												{subscription.plan_name}
											</p>
											{subscription.status === "trial" &&
												subscription.trial_started_at && (
													<p className="text-sm text-gray-400 mt-1">
														Restam {computeTrialDaysLeft()} dia(s) de trial.
													</p>
												)}
										</div>
										<StatusBadge
											status={
												subscription.status === "active"
													? "success"
													: subscription.status === "trial" ||
													  subscription.status === "past_due"
													? "warning"
													: "warning"
											}>
											{subscription.status === "active"
												? "Ativo"
												: subscription.status === "trial"
												? "Trial"
												: subscription.status === "past_due"
												? "Pagamento pendente"
												: "Cancelado"}
										</StatusBadge>
									</div>

									{(subscription.status === "trial" ||
										subscription.status === "canceled") && (
										<div className="space-y-3 p-4 bg-gray-950/30 rounded-xl border border-white/5">
											<p className="text-sm text-gray-300 font-medium">
												{subscription.status === "trial"
													? "Tudo liberado durante o trial. Assine quando quiser para não interromper o acesso."
													: "Assine um plano para voltar a usar o sistema."}
											</p>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												<Button
													type="button"
													variant={
														selectedPlan === "pro" ? "default" : "outline"
													}
													onClick={() => setSelectedPlan("pro")}
													className={
														selectedPlan === "pro"
															? "bg-primary text-primary-foreground w-full whitespace-normal text-center h-auto py-2"
															: "border-white/20 hover:bg-white/5 text-white w-full whitespace-normal text-center h-auto py-2"
													}>
													{billingInterval === "year"
														? "Pro (recomendado) — R$ 1.164/ano (≈ R$ 97/mês + taxas)"
														: "Pro (recomendado) — R$ 149,90/mês"}
												</Button>
												<Button
													type="button"
													variant={
														selectedPlan === "start" ? "default" : "outline"
													}
													onClick={() => setSelectedPlan("start")}
													className={
														selectedPlan === "start"
															? "bg-primary text-primary-foreground w-full whitespace-normal text-center h-auto py-2"
															: "border-white/20 hover:bg-white/5 text-white w-full whitespace-normal text-center h-auto py-2"
													}>
													{billingInterval === "year"
														? "Start (básico) — R$ 699/ano (≈ R$ 58/mês)"
														: "Start (básico) — R$ 69,90/mês"}
												</Button>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												<Button
													type="button"
													variant={
														billingInterval === "month" ? "default" : "outline"
													}
													onClick={() => setBillingInterval("month")}
													className={
														billingInterval === "month"
															? "bg-primary text-primary-foreground w-full"
															: "border-white/20 hover:bg-white/5 text-white w-full"
													}>
													Mensal
												</Button>
												<Button
													type="button"
													variant={
														billingInterval === "year" ? "default" : "outline"
													}
													onClick={() => setBillingInterval("year")}
													className={
														billingInterval === "year"
															? "bg-primary text-primary-foreground w-full"
															: "border-white/20 hover:bg-white/5 text-white w-full"
													}>
													Anual
												</Button>
											</div>
											<Button
												type="button"
												onClick={startCheckout}
												disabled={startingCheckout}
												className="w-full bg-white text-gray-950 hover:bg-gray-200 font-bold">
												{startingCheckout ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Redirecionando...
													</>
												) : (
													"Assinar com Asaas"
												)}
											</Button>
											<p className="text-[11px] text-gray-500">
												Recomendamos o Pro para usar tudo liberado. Pagamento
												seguro pelo Asaas. Você pode cancelar quando quiser.
											</p>
											<div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
												<p className="text-[11px] text-emerald-400 font-medium">
													💳 Parcelamento disponível: Ao escolher <strong>Cartão de Crédito</strong> no checkout, você poderá parcelar em até 12x sem juros.
												</p>
											</div>
										</div>
									)}
								</CardContent>
							</Card>
							<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
								<CardHeader>
									<CardTitle className="text-white">Faturas</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
									<CreditCard className="h-8 w-8 text-gray-600" />
									<p className="text-sm text-gray-400">Sem faturas.</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

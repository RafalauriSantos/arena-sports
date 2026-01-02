import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabaseClient";
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
	icon: any;
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
	const [billingInterval, setBillingInterval] = useState<"month" | "year">(
		"month"
	);
	const [startingCheckout, setStartingCheckout] = useState(false);

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
			const { data, error } = await supabase.functions.invoke(
				"stripe-create-checkout",
				{
					body: {
						plan_code: subscription?.plan_name?.toLowerCase().includes("pro")
							? "pro"
							: "start",
						interval: billingInterval,
					},
				}
			);

			if (error) throw error;
			if (!data?.url) throw new Error("Checkout não retornou URL");
			window.location.href = data.url;
		} catch (err: any) {
			console.error(err);
			toast({
				title: "Não foi possível iniciar a assinatura",
				description: err?.message || "Tente novamente.",
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
		const slug = formData.tenant.subdomain || "sua-arenasports";
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
							Gerencie sua Arena Sports, preços e automações.
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
				<Tabs defaultValue="arena-sports" className="space-y-8">
					<TabsList className="w-full h-auto bg-white/5 p-1 rounded-2xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
						<TabTrigger value="perfil" icon={User} label="Meu Perfil" />
						<TabTrigger value="arena-sports" icon={Store} label="Identidade" />
						<TabTrigger value="quadras" icon={Trophy} label="Quadras" />
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
						value="arena-sports"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="md:col-span-2 space-y-6">
								<PremiumCard
									title="Identidade da Arena Sports"
									description="Dados visíveis para seu cliente.">
									<div className="space-y-4">
										{/* CAMPO NOME - ÚNICO EDITÁVEL */}
										<div className="space-y-2">
											<Label className="text-gray-300">Nome Comercial</Label>
											<Input
												value={formData.tenant.business_name}
												onChange={handleNameChange} // <--- GERA O LINK AUTOMÁTICO
												className="bg-white/5 border-white/10 text-white font-medium text-lg"
												placeholder="Ex: Arena Sports Champions"
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
													arenasports.app/agendar/
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
												onChange={(e) => updateTenant("phone", e.target.value)}
												autoComplete="tel"
												inputMode="numeric"
												maxLength={13}
												className="bg-white/5 border-white/10 text-white"
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
													className="bg-white/5 border-white/10 text-white"
												/>
											</div>
											<div className="space-y-2">
												<Label className="text-xs uppercase text-gray-500">
													Preço (R$)
												</Label>
												<Input
													type="number"
													value={court.base_price}
													onChange={(e) =>
														updateCourt(
															index,
															"base_price",
															Number(e.target.value)
														)
													}
													className="bg-white/5 border-white/10 text-white"
												/>
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
									checked={formData.promo.active}
									onCheckedChange={(checked) => updatePromo("active", checked)}
									className="data-[state=checked]:bg-primary"
								/>
							</div>
							{formData.promo.active && (
								<div className="mt-6 space-y-4 p-4 bg-gray-950/30 rounded-xl border border-white/5">
									<div className="flex justify-between">
										<Label className="text-gray-200">Porcentagem</Label>
										<span className="text-primary font-bold">
											{formData.promo.discount_percentage}% OFF
										</span>
									</div>
									<Slider
										value={[Number(formData.promo.discount_percentage)]}
										max={50}
										step={5}
										onValueChange={([val]) =>
											updatePromo("discount_percentage", val)
										}
									/>
								</div>
							)}
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
										</div>
										<StatusBadge status={isTrial ? "warning" : "success"}>
											{isTrial ? "Trial" : "Ativo"}
										</StatusBadge>
									</div>

									{subscription.status !== "active" && (
										<div className="space-y-3 p-4 bg-gray-950/30 rounded-xl border border-white/5">
											<p className="text-sm text-gray-300 font-medium">
												Ative sua assinatura para continuar usando o sistema.
											</p>
											<div className="flex gap-2">
												<Button
													type="button"
													variant={
														billingInterval === "month" ? "default" : "outline"
													}
													onClick={() => setBillingInterval("month")}
													className={
														billingInterval === "month"
															? "bg-primary text-primary-foreground"
															: "border-white/20 hover:bg-white/5 text-white"
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
															? "bg-primary text-primary-foreground"
															: "border-white/20 hover:bg-white/5 text-white"
													}>
													Anual (20% OFF)
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
													"Assinar com Stripe"
												)}
											</Button>
											<p className="text-[11px] text-gray-500">
												Pagamento seguro via Stripe. Você pode cancelar quando
												quiser.
											</p>
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

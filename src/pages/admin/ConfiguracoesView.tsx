import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import {
	Building2,
	Trophy,
	Sparkles,
	CreditCard,
	LifeBuoy,
	Copy,
	Check,
	Plus,
	Save,
	ExternalLink,
	Loader2,
	Trash2,
	User,
	BadgeDollarSign,
	MessageCircle,
	Mail,
	Store, // <-- Importação do novo ícone
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarUpload from "@/components/admin/AvatarUpload"; // Certifique-se que este path está correto
import { StatusBadge } from "@/components/admin"; // Certifique-se que este path está correto

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
	} = useSettings();

	const { user, userProfile, updateProfile } = useAuth();
	const { toast } = useToast();

	// Estado local para o formulário de perfil
	const [profileName, setProfileName] = useState(userProfile?.full_name ?? "");
	const [profileJobTitle, setProfileJobTitle] = useState(
		userProfile?.job_title ?? ""
	);

	// Sincroniza estado local quando o perfil carrega
	useEffect(() => {
		setProfileName(userProfile?.full_name ?? "");
		setProfileJobTitle(userProfile?.job_title ?? "");
	}, [userProfile]);

	// Função isolada para salvar apenas o perfil
	const saveProfile = async () => {
		try {
			if (!updateProfile) throw new Error("Update not available");
			await updateProfile({
				full_name: profileName,
				job_title: profileJobTitle,
			});
			toast({
				title: "Perfil salvo",
				description: "Seu perfil foi atualizado.",
			});
		} catch (err) {
			console.error(err);
			toast({
				title: "Erro",
				description: "Não foi possível atualizar o perfil.",
				variant: "destructive",
			});
		}
	};

	// Lógica de copiar link
	const [copied, setCopied] = useState(false);
	const handleCopyLink = () => {
		const link = `https://app.arena.com/${
			formData.tenant.subdomain || "minha-arena"
		}`;
		navigator.clipboard.writeText(link);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading) return <LoadingSkeleton />;

	return (
		<div className="min-h-screen bg-gray-950 text-gray-50 pb-20">
			<div className="max-w-5xl mx-auto p-6 space-y-8">
				{/* --- HEADER --- */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-white">
							Configurações
						</h1>
						<p className="text-gray-400 mt-1">
							Gerencie sua arena, preços e automações em um só lugar.
						</p>
					</div>
					<Button
						onClick={saveSettings}
						disabled={saving}
						className="bg-white text-gray-950 hover:bg-gray-200 font-medium px-6 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
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

				{/* --- TABS --- */}
				<Tabs defaultValue="perfil" className="space-y-8">
					<TabsList className="w-full h-auto bg-white/5 p-1 rounded-2xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
						<TabTrigger value="perfil" icon={User} label="Meu Perfil" />
						<TabTrigger value="arena" icon={Store} label="Identidade" />
						<TabTrigger value="quadras" icon={Trophy} label="Quadras" />
						<TabTrigger
							value="marketing"
							icon={Sparkles}
							label="Marketing & IA"
						/>
						<TabTrigger
							value="billing"
							icon={BadgeDollarSign}
							label="Assinatura"
						/>
						<TabTrigger value="support" icon={LifeBuoy} label="Suporte" />
					</TabsList>

					{/* 👤 ABA 1: MEU PERFIL */}
					<TabsContent
						value="perfil"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="md:col-span-1">
								<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-full">
									<CardHeader>
										<CardTitle className="text-white">Meu Perfil</CardTitle>
										<CardDescription className="text-gray-400">
											Gerencie seus dados pessoais.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex flex-col items-center gap-4">
											<AvatarUpload />
											<div className="w-full">
												<Label className="text-sm text-gray-300">
													Nome Completo
												</Label>
												<Input
													value={profileName}
													onChange={(e) => setProfileName(e.target.value)}
													className="w-full mt-2 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl h-12 text-white px-4"
												/>
											</div>
											<div className="w-full">
												<Label className="text-sm text-gray-300">
													Cargo / Função
												</Label>
												<Input
													value={profileJobTitle}
													onChange={(e) => setProfileJobTitle(e.target.value)}
													className="w-full mt-2 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl h-12 text-white px-4"
													placeholder="Ex: Gerente, Atendente, Proprietário"
												/>
											</div>
											<div className="w-full">
												<Label className="text-sm text-gray-300">
													E-mail de Login
												</Label>
												<Input
													value={user?.email ?? userProfile?.email ?? ""}
													readOnly
													className="w-full mt-2 bg-white/5 border-white/10 rounded-xl h-12 text-white px-4"
												/>
											</div>
											<div className="w-full pt-4">
												<Button
													className="bg-primary text-primary-foreground w-full"
													onClick={saveProfile}>
													Salvar Perfil
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					{/* 🏟️ ABA 2: IDENTIDADE */}
					<TabsContent
						value="arena"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="md:col-span-2 space-y-6">
								<PremiumCard
									title="Identidade da Arena"
									description="Como seus clientes veem seu negócio.">
									<div className="space-y-4">
										<div className="space-y-2">
											<Label className="text-gray-300">Nome Comercial</Label>
											<Input
												value={formData.tenant.business_name}
												onChange={(e) =>
													updateTenant("business_name", e.target.value)
												}
												className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl h-12 text-white px-4"
												placeholder="Ex: Arena Champions"
											/>
										</div>
										<div className="space-y-2">
											<Label className="text-gray-300">Descrição Curta</Label>
											<Textarea
												value={formData.tenant.description}
												onChange={(e) =>
													updateTenant("description", e.target.value)
												}
												className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl min-h-[100px] text-white p-3"
												placeholder="Ex: A melhor quadra de society da região..."
											/>
										</div>
									</div>
								</PremiumCard>

								<PremiumCard
									title="Contato"
									description="Canais de comunicação oficiais.">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label className="text-gray-300">WhatsApp</Label>
											<Input
												value={formData.tenant.phone}
												onChange={(e) => updateTenant("phone", e.target.value)}
												className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl h-12 text-white px-4"
												placeholder="(00) 00000-0000"
											/>
										</div>
										<div className="space-y-2">
											<Label className="text-gray-300">E-mail</Label>
											<Input
												value={formData.tenant.email}
												onChange={(e) => updateTenant("email", e.target.value)}
												className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-0 rounded-xl h-12 text-white px-4"
												placeholder="contato@arena.com"
											/>
										</div>
									</div>
								</PremiumCard>
							</div>

							<div className="md:col-span-1">
								<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-full">
									<CardHeader>
										<CardTitle className="text-primary/90 text-lg">
											Link Público
										</CardTitle>
										<CardDescription className="text-primary/70">
											Compartilhe este link para receber agendamentos.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div
											className="p-4 bg-gray-950/60 rounded-lg border border-primary/10 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors"
											onClick={handleCopyLink}>
											<div className="truncate text-sm text-primary/70 font-mono mr-2">
												arena.app/{formData.tenant.subdomain || "minha-arena"}
											</div>
											{copied ? (
												<Check className="h-4 w-4 text-primary" />
											) : (
												<Copy className="h-4 w-4 text-primary opacity-50 group-hover:opacity-100" />
											)}
										</div>
										<Button
											variant="outline"
											className="w-full border-primary/20 text-primary/80 hover:bg-primary/10 hover:text-primary/90">
											<ExternalLink className="mr-2 h-4 w-4" /> Testar Link
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					{/* ⚽ ABA 3: QUADRAS */}
					<TabsContent
						value="quadras"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<PremiumCard
							title="Estrutura da Arena"
							description="Gerencie suas quadras e preços base.">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-lg font-medium text-white">Quadras</h3>
								<Button
									onClick={addCourt}
									variant="outline"
									className="border-dashed border-white/20 text-gray-300 hover:bg-white/5 hover:text-white hover:border-white/40">
									<Plus className="mr-2 h-4 w-4" /> Nova Quadra
								</Button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{formData.courts.map((court, index) => (
									<Card
										key={index}
										className="bg-black/20 border-white/5 backdrop-blur-sm hover:border-white/10 transition-all group">
										<CardHeader className="pb-3">
											<div className="flex justify-between items-start">
												<div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
													<Trophy className="h-5 w-5" />
												</div>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeCourt(index)}
													className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-400/10">
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-2">
												<Label className="text-xs uppercase tracking-wider text-gray-500">
													Nome
												</Label>
												<Input
													value={court.name}
													onChange={(e) =>
														updateCourt(index, "name", e.target.value)
													}
													className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-3"
												/>
											</div>
											<div className="space-y-2">
												<Label className="text-xs uppercase tracking-wider text-gray-500">
													Preço Padrão (Hora)
												</Label>
												<div className="relative">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
														R$
													</span>
													<Input
														type="number"
														value={court.base_price}
														onChange={(e) =>
															updateCourt(index, "base_price", e.target.value)
														}
														className="bg-white/5 border-white/10 text-white rounded-xl h-12 pl-9"
													/>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</PremiumCard>
					</TabsContent>

					{/* 🤖 ABA 4: MARKETING & IA */}
					<TabsContent
						value="marketing"
						className="animate-in fade-in slide-in-from-bottom-4 duration-500">
						<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden relative">
							<div className="absolute top-0 right-0 p-32 bg-primary/6 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
							<CardHeader>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<CardTitle className="text-white flex items-center gap-2">
											<Sparkles className="h-5 w-5 text-primary" />
											Preços Dinâmicos
										</CardTitle>
										<CardDescription className="text-gray-400">
											Nossa IA ajusta preços automaticamente para preencher
											horários ociosos.
										</CardDescription>
									</div>
									<Switch
										checked={formData.promo.active}
										onCheckedChange={(checked) =>
											updatePromo("active", checked)
										}
										className="data-[state=checked]:bg-primary"
									/>
								</div>
							</CardHeader>
							{formData.promo.active && (
								<CardContent className="space-y-8 animate-in fade-in slide-in-from-top-2">
									<div className="space-y-6 p-6 bg-gray-950/30 rounded-xl border border-white/5">
										<div className="space-y-4">
											<div className="flex justify-between items-center">
												<Label className="text-gray-200">
													Agressividade do Desconto
												</Label>
												<span className="text-primary font-bold text-lg">
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
												className="py-2"
											/>
											<p className="text-xs text-gray-500">
												Exemplo: Uma quadra de R$ 200,00 será ofertada por
												<span className="text-white font-medium ml-1">
													R${" "}
													{(
														200 *
														(1 - formData.promo.discount_percentage / 100)
													).toFixed(2)}
												</span>{" "}
												em horários de baixa demanda.
											</p>
										</div>
									</div>
								</CardContent>
							)}
						</Card>
					</TabsContent>

					{/* 💳 ABA 5: ASSINATURA */}
					<TabsContent
						value="billing"
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Card className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
								<CardHeader>
									<CardTitle className="text-white">Seu Plano</CardTitle>
									<CardDescription className="text-gray-400">
										Detalhes da sua subscrição atual.
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
											{isTrial ? "Período de Teste" : "Ativo"}
										</StatusBadge>
									</div>
									{isTrial && (
										<div className="bg-gradient-to-r from-primary/10 to-primary/10 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
											<div className="space-y-1">
												<p className="text-primary/80 font-medium">
													Faça o upgrade agora
												</p>
												<p className="text-xs text-primary/70">
													Desbloqueie relatórios avançados e suporte
													prioritário.
												</p>
											</div>
											<Button
												size="sm"
												className="bg-primary hover:bg-primary/90 text-primary-foreground border-none">
												Fazer Upgrade
											</Button>
										</div>
									)}
								</CardContent>
							</Card>

							<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
								<CardHeader>
									<CardTitle className="text-white text-lg">Faturas</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
										<div className="h-12 w-12 rounded-full bg-gray-800/50 flex items-center justify-center">
											<CreditCard className="h-6 w-6 text-gray-600" />
										</div>
										<p className="text-sm text-gray-400">
											Nenhuma fatura encontrada.
										</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* 👨‍💻 ABA 6: SUPORTE */}
					<TabsContent
						value="support"
						className="animate-in fade-in slide-in-from-bottom-4 duration-500">
						<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl max-w-2xl mx-auto">
							<CardContent className="p-8 text-center space-y-6">
								<Avatar className="h-24 w-24 mx-auto border-4 border-gray-900 shadow-xl">
									<AvatarImage src="https://github.com/shadcn.png" />
									<AvatarFallback>RF</AvatarFallback>
								</Avatar>
								<div className="space-y-2">
									<h3 className="text-2xl font-bold text-white">
										Precisa de ajuda com o sistema?
									</h3>
									<p className="text-gray-400 max-w-md mx-auto">
										Fale diretamente com Rafael Lauri, fundador e desenvolvedor
										do Arena Sports.
									</p>
								</div>
								<div className="flex justify-center gap-4 pt-4">
									<Button
										className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6"
										asChild>
										<a
											href="https://wa.me/5548999999999"
											target="_blank"
											rel="noopener noreferrer">
											<MessageCircle className="h-5 w-5" /> Chamar no WhatsApp
										</a>
									</Button>
									<Button
										variant="outline"
										className="border-white/10 text-gray-300 hover:bg-white/5 flex items-center gap-2 px-6"
										asChild>
										<a href="mailto:rafael@arenasports.com.br">
											<Mail className="h-5 w-5" /> Enviar E-mail
										</a>
									</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

// --- Componentes Auxiliares ---

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
			className="w-full flex items-center gap-2 px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-gray-400 hover:text-white transition-all">
			<Icon className="h-4 w-4" />
			{label}
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
				<div className="flex justify-between items-center">
					<div className="space-y-2">
						<Skeleton className="h-8 w-48 bg-gray-800" />
						<Skeleton className="h-4 w-96 bg-gray-800" />
					</div>
					<Skeleton className="h-10 w-32 bg-gray-800" />
				</div>
				<div className="flex gap-4">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-10 w-32 bg-gray-800 rounded-lg" />
					))}
				</div>
				<div className="grid grid-cols-3 gap-6">
					<Skeleton className="col-span-2 h-96 bg-gray-800 rounded-2xl" />
					<Skeleton className="col-span-1 h-96 bg-gray-800 rounded-2xl" />
				</div>
			</div>
		</div>
	);
}

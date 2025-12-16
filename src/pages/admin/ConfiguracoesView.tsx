import { useState, useEffect } from "react";
import {
	Settings,
	Save,
	Clock,
	DollarSign,
	MapPin,
	Phone,
	Mail,
	Calendar,
	AlertCircle,
	MessageCircle,
	Github,
	Code,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface ArenaConfig {
	// Arena Info
	name: string;
	address: string;
	phone: string;
	email: string;

	// Business Hours
	openTime: string;
	closeTime: string;
	slotDuration: number; // in minutes

	// Pricing
	defaultPrice: number;
	weekendPrice: number;

	// Field Pricing
	principalFieldPrice: number;
	medioFieldPrice: number;

	// Booking Rules
	maxAdvanceDays: number;
	minAdvanceHours: number;

	// Additional Info
	description: string;
	rules: string;
}

const defaultConfig: ArenaConfig = {
	name: "Arena Campo Verde",
	address: "Rua Exemplo, 123 - Bairro",
	phone: "(11) 98765-4321",
	email: "contato@campoverde.com",
	openTime: "06:00",
	closeTime: "23:00",
	slotDuration: 60,
	defaultPrice: 100,
	weekendPrice: 150,
	principalFieldPrice: 160,
	medioFieldPrice: 120,
	maxAdvanceDays: 30,
	minAdvanceHours: 2,
	description:
		"Arena de futebol society com grama sintética de última geração.",
	rules:
		"- Respeite o horário reservado\n- Uso obrigatório de chuteiras adequadas\n- Proibido fumar nas dependências\n- Mantenha o local limpo",
};

export default function ConfiguracoesView() {
	const { toast } = useToast();
	const [config, setConfig] = useState<ArenaConfig>(() => {
		const stored = localStorage.getItem("arena_config");
		return stored ? JSON.parse(stored) : defaultConfig;
	});

	const [hasChanges, setHasChanges] = useState(false);

	const handleChange = (field: keyof ArenaConfig, value: string | number) => {
		setConfig((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const handleSave = () => {
		localStorage.setItem("arena_config", JSON.stringify(config));
		setHasChanges(false);

		toast({
			title: "Configurações salvas!",
			description: "As alterações foram aplicadas com sucesso.",
		});
	};

	const handleReset = () => {
		setConfig(defaultConfig);
		setHasChanges(true);

		toast({
			title: "Configurações restauradas",
			description: "Valores padrão foram restaurados.",
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-black">Configurações</h1>
					<p className="text-muted-foreground">
						Gerencie as configurações da sua arena
					</p>
				</div>
				<div className="flex gap-3">
					{hasChanges && (
						<Button variant="outline" onClick={handleReset}>
							Restaurar Padrão
						</Button>
					)}
					<Button
						className="gap-2 glow-primary"
						onClick={handleSave}
						disabled={!hasChanges}>
						<Save className="h-4 w-4" />
						Salvar Alterações
					</Button>
				</div>
			</div>

			{/* Unsaved Changes Alert */}
			{hasChanges && (
				<Card className="border-warning/50 bg-warning/5">
					<CardContent className="flex items-start gap-3 pt-6">
						<AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
						<div className="text-sm">
							<p className="font-medium text-warning">
								Você tem alterações não salvas
							</p>
							<p className="text-muted-foreground">
								Clique em "Salvar Alterações" para aplicar as mudanças.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Arena Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MapPin className="h-5 w-5 text-primary" />
						Informações da Arena
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="name">Nome da Arena</Label>
							<Input
								id="name"
								value={config.name}
								onChange={(e) => handleChange("name", e.target.value)}
								placeholder="Nome da sua arena"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phone">Telefone</Label>
							<div className="relative">
								<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="phone"
									className="pl-9"
									value={config.phone}
									onChange={(e) => handleChange("phone", e.target.value)}
									placeholder="(11) 98765-4321"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="address">Endereço</Label>
							<Input
								id="address"
								value={config.address}
								onChange={(e) => handleChange("address", e.target.value)}
								placeholder="Rua, número - Bairro"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">E-mail</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									className="pl-9"
									value={config.email}
									onChange={(e) => handleChange("email", e.target.value)}
									placeholder="contato@arena.com"
								/>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Descrição</Label>
						<Textarea
							id="description"
							value={config.description}
							onChange={(e) => handleChange("description", e.target.value)}
							placeholder="Descreva sua arena..."
							rows={3}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Operating Hours */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5 text-primary" />
						Horário de Funcionamento
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="openTime">Horário de Abertura</Label>
							<Input
								id="openTime"
								type="time"
								value={config.openTime}
								onChange={(e) => handleChange("openTime", e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="closeTime">Horário de Fechamento</Label>
							<Input
								id="closeTime"
								type="time"
								value={config.closeTime}
								onChange={(e) => handleChange("closeTime", e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="slotDuration">Duração do Slot (minutos)</Label>
							<Select
								value={config.slotDuration.toString()}
								onValueChange={(value) =>
									handleChange("slotDuration", parseInt(value))
								}>
								<SelectTrigger id="slotDuration">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="30">30 minutos</SelectItem>
									<SelectItem value="60">60 minutos</SelectItem>
									<SelectItem value="90">90 minutos</SelectItem>
									<SelectItem value="120">120 minutos</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Pricing */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5 text-primary" />
						Preços
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="defaultPrice">Preço Padrão (Seg-Sex)</Label>
							<div className="relative">
								<span className="absolute left-3 top-3 text-muted-foreground">
									R$
								</span>
								<Input
									id="defaultPrice"
									type="number"
									className="pl-9"
									value={config.defaultPrice}
									onChange={(e) =>
										handleChange("defaultPrice", parseFloat(e.target.value))
									}
									min="0"
									step="10"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="weekendPrice">Preço Final de Semana</Label>
							<div className="relative">
								<span className="absolute left-3 top-3 text-muted-foreground">
									R$
								</span>
								<Input
									id="weekendPrice"
									type="number"
									className="pl-9"
									value={config.weekendPrice}
									onChange={(e) =>
										handleChange("weekendPrice", parseFloat(e.target.value))
									}
									min="0"
									step="10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Field Pricing */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5 text-primary" />
						Preços por Campo
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="principalFieldPrice">
								Campo Principal (Grande)
							</Label>
							<div className="relative">
								<span className="absolute left-3 top-3 text-muted-foreground">
									R$
								</span>
								<Input
									id="principalFieldPrice"
									type="number"
									className="pl-9"
									value={config.principalFieldPrice}
									onChange={(e) =>
										handleChange(
											"principalFieldPrice",
											parseFloat(e.target.value)
										)
									}
									min="0"
									step="10"
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Valor total para reserva do campo principal
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="medioFieldPrice">Campo Médio</Label>
							<div className="relative">
								<span className="absolute left-3 top-3 text-muted-foreground">
									R$
								</span>
								<Input
									id="medioFieldPrice"
									type="number"
									className="pl-9"
									value={config.medioFieldPrice}
									onChange={(e) =>
										handleChange("medioFieldPrice", parseFloat(e.target.value))
									}
									min="0"
									step="10"
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Valor total para reserva do campo médio
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Booking Rules */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5 text-primary" />
						Regras de Reserva
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="maxAdvanceDays">
								Reserva com Antecedência Máxima (dias)
							</Label>
							<Input
								id="maxAdvanceDays"
								type="number"
								value={config.maxAdvanceDays}
								onChange={(e) =>
									handleChange("maxAdvanceDays", parseInt(e.target.value))
								}
								min="1"
								max="90"
							/>
							<p className="text-xs text-muted-foreground">
								Máximo de dias que jogadores podem reservar com antecedência
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="minAdvanceHours">
								Antecedência Mínima (horas)
							</Label>
							<Input
								id="minAdvanceHours"
								type="number"
								value={config.minAdvanceHours}
								onChange={(e) =>
									handleChange("minAdvanceHours", parseInt(e.target.value))
								}
								min="0"
								max="48"
							/>
							<p className="text-xs text-muted-foreground">
								Horas mínimas de antecedência para fazer uma reserva
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Arena Rules */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5 text-primary" />
						Regras da Arena
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Label htmlFor="rules">Regras e Orientações</Label>
					<Textarea
						id="rules"
						value={config.rules}
						onChange={(e) => handleChange("rules", e.target.value)}
						placeholder="Liste as regras da sua arena..."
						rows={8}
					/>
					<p className="text-xs text-muted-foreground">
						Estas regras serão exibidas para os jogadores ao fazer reservas
					</p>
				</CardContent>
			</Card>

			{/* Developer Support */}
			<Card className="border-primary/30 bg-primary/5">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MessageCircle className="h-5 w-5 text-primary" />
						Suporte ao Desenvolvedor
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-4">
						<Code className="h-10 w-10 text-primary flex-shrink-0" />
						<div className="flex-1">
							<h3 className="font-bold text-lg mb-1">Rafael Lauri Santos</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Desenvolvedor Full Stack | Criador do Sistema Campo Verde Ágil
							</p>

							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<a
										href="https://wa.me/5511999999999"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm hover:text-primary transition-colors">
										WhatsApp: (11) 99999-9999
									</a>
								</div>

								<div className="flex items-center gap-3">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<a
										href="mailto:rafael@example.com"
										className="text-sm hover:text-primary transition-colors">
										rafael@example.com
									</a>
								</div>

								<div className="flex items-center gap-3">
									<Github className="h-4 w-4 text-muted-foreground" />
									<a
										href="https://github.com/RafalauriSantos"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm hover:text-primary transition-colors">
										github.com/RafalauriSantos
									</a>
								</div>
							</div>
						</div>
					</div>

					<Separator />

					<div className="space-y-2">
						<h4 className="font-semibold text-sm">Precisa de ajuda?</h4>
						<p className="text-sm text-muted-foreground">
							Entre em contato para suporte técnico, customizações ou dúvidas
							sobre o sistema.
						</p>
						<div className="flex gap-3 pt-2">
							<Button variant="default" size="sm" className="gap-2" asChild>
								<a
									href="https://wa.me/5511999999999?text=Olá%20Rafael%2C%20preciso%20de%20ajuda%20com%20o%20sistema%20Campo%20Verde%20Ágil"
									target="_blank"
									rel="noopener noreferrer">
									<MessageCircle className="h-4 w-4" />
									Falar no WhatsApp
								</a>
							</Button>

							<Button variant="outline" size="sm" className="gap-2" asChild>
								<a
									href="mailto:rafael@example.com?subject=Suporte%20Campo%20Verde%20Ágil"
									target="_blank"
									rel="noopener noreferrer">
									<Mail className="h-4 w-4" />
									Enviar E-mail
								</a>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

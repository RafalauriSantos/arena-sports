import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // Certifique-se que o caminho está certo
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { normalizeCustomerPhone, isValidCustomerPhone } from "@/lib/phone";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/contexts/BookingsContext";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

interface NewBookingModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void; // Callback para atualizar a lista ao fechar
}

interface Court {
	id: string;
	name: string;
	base_price: number;
}

// Lista de horários simples para Admin (07:00 as 23:00)
const HOURS = Array.from({ length: 17 }, (_, i) => {
	const hour = i + 7;
	return `${hour.toString().padStart(2, "0")}:00`;
});

export function NewBookingModal({
	open,
	onOpenChange,
	onSuccess,
}: NewBookingModalProps) {
	const { toast } = useToast();
	const { tenantId } = useAuth();
	const { refreshData } = useBookings();
	const [loading, setLoading] = useState(false);
	const [courts, setCourts] = useState<Court[]>([]);

	const fetchCourts = useCallback(async () => {
		// Resolve tenant_id (evita listar quadras de outras arenas)
		let currentTenantId = tenantId;
		if (!currentTenantId) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				const { data: profile } = await supabase
					.from("profiles")
					.select("tenant_id")
					.eq("id", user.id)
					.single();
				currentTenantId = profile?.tenant_id;
			}
		}

		if (!currentTenantId) {
			setCourts([]);
			return;
		}

		const { data, error } = await supabase
			.from("courts")
			.select("id, name, base_price")
			.eq("tenant_id", currentTenantId)
			.eq("active", true);

		if (data) setCourts(data);
		if (error) console.error("Erro ao buscar quadras:", error);
	}, [tenantId]);

	// Carrega as quadras reais do banco ao abrir o modal
	useEffect(() => {
		if (open) {
			fetchCourts();
		}
	}, [open, fetchCourts]);

	const [formData, setFormData] = useState({
		date: "",
		time: "",
		fieldId: "", // ID da quadra (UUID)
		customerName: "", // Antigo 'captain'
		phone: "",
		paymentStatus: "pending" as "paid" | "pending" | "deposit",
		depositPercent: 30,
	});

	const isBookingOverlapError = (err: unknown) => {
		const code = getStringProp(err, "code");
		const message = getStringProp(err, "message") ?? "";
		return (
			code === "23P01" ||
			/code\s*23P01/i.test(message) ||
			/exclusion constraint/i.test(message) ||
			/bookings_no_overlap_active/i.test(message)
		);
	};

	const handleSubmit = async () => {
		// 1. Validação Básica
		if (
			!formData.date ||
			!formData.time ||
			!formData.fieldId ||
			!formData.customerName
		) {
			toast({
				title: "Campos obrigatórios",
				description: "Preencha data, horário, quadra e nome do cliente.",
				variant: "destructive",
			});
			return;
		}

		const phoneDigits = normalizeCustomerPhone(formData.phone);
		if (!phoneDigits) {
			toast({
				title: "Telefone obrigatório",
				description:
					"Informe um telefone com DDD para poder avisar o cliente no WhatsApp.",
				variant: "destructive",
			});
			return;
		}
		if (!isValidCustomerPhone(phoneDigits)) {
			toast({
				title: "Telefone inválido",
				description: "Informe um telefone com DDD (10 ou 11 dígitos).",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);

		try {
			// 2. Preparar Dados para o Supabase
			// Formatar Data/Hora para ISO (YYYY-MM-DDTHH:MM:SS)
			const startDateTime = `${formData.date}T${formData.time}:00`;

			// Calculando horário de fim (assumindo 1 hora de jogo padrão)
			const startDateObj = new Date(startDateTime);
			const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
			const endDateTime = endDateObj.toISOString();

			// Pegar preço da quadra selecionada
			const selectedCourt = courts.find((c) => c.id === formData.fieldId);
			const price = selectedCourt?.base_price || 0;

			const depositPercent = Number(formData.depositPercent);
			if (formData.paymentStatus === "deposit") {
				if (
					!Number.isFinite(depositPercent) ||
					depositPercent <= 0 ||
					depositPercent > 100
				) {
					throw new Error("Percentual do sinal inválido (1 a 100). ");
				}
			}

			// Pegar o ID do Tenant do usuário logado (Segurança)
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Usuário não logado");

			const { data: profile } = await supabase
				.from("profiles")
				.select("tenant_id")
				.eq("id", user.id)
				.single();

			if (!profile?.tenant_id) throw new Error("Empresa não identificada.");

			// 3. INSERT na tabela 'bookings'
			const isPaidFull = formData.paymentStatus === "paid";
			const isDeposit = formData.paymentStatus === "deposit";
			const paidAmount = isPaidFull
				? price
				: isDeposit
				? (price * depositPercent) / 100
				: 0;

			const { error } = await supabase.from("bookings").insert({
				tenant_id: profile.tenant_id,
				court_id: formData.fieldId,
				customer_name: formData.customerName,
				customer_phone: phoneDigits,
				start_time: new Date(startDateTime).toISOString(), // Garante formato UTC correto
				end_time: endDateTime,
				total_price: price,
				paid_amount: paidAmount,
				deposit_percent: isDeposit ? depositPercent : null,
				status: isPaidFull ? "paid" : "pending",
			});

			if (error) throw error;

			// Sincroniza o BookingsContext imediatamente (Financeiro/Agenda/etc)
			await refreshData();

			toast({
				title: "Agendamento Criado!",
				description: `${formData.customerName} - ${formData.time}`,
				className: "bg-green-600 text-white border-none",
			});

			// Diferencial: abre WhatsApp com mensagem pronta para o cliente.
			const paymentLabel =
				formData.paymentStatus === "paid"
					? "Pago"
					: formData.paymentStatus === "deposit"
					? `Sinal (${Number(formData.depositPercent) || 0}%)`
					: "Pagar no local";
			const msg = `Olá ${
				formData.customerName
			}! Sua reserva foi registrada.\n\nQuadra: ${
				selectedCourt?.name || "Quadra"
			}\nData: ${formData.date}\nHorário: ${
				formData.time
			}\nPagamento: ${paymentLabel}\n\nQualquer ajuste é só responder por aqui.`;
			window.open(
				`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(msg)}`,
				"_blank"
			);

			// 4. Limpar e Fechar
			setFormData({
				date: "",
				time: "",
				fieldId: "",
				customerName: "",
				phone: "",
				paymentStatus: "pending",
				depositPercent: 30,
			});

			if (onSuccess) onSuccess(); // Atualiza a dashboard/calendário
			onOpenChange(false);
		} catch (error: unknown) {
			console.error(error);
			if (isBookingOverlapError(error)) {
				toast({
					title: "Horário indisponível",
					description:
						"Já existe uma reserva para esta quadra nesse horário. Escolha outro horário.",
					variant: "destructive",
				});
				return;
			}
			const message = getStringProp(error, "message") || "Tente novamente.";
			toast({
				title: "Erro ao agendar",
				description: message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5 text-primary" />
						Novo Agendamento
					</DialogTitle>
					<DialogDescription>
						Insira os dados para reservar um horário manualmente.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="date">Data</Label>
							<Input
								id="date"
								type="date"
								value={formData.date}
								onChange={(e) =>
									setFormData({ ...formData, date: e.target.value })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="field">Quadra</Label>
							<Select
								value={formData.fieldId}
								onValueChange={(value) =>
									setFormData({ ...formData, fieldId: value })
								}>
								<SelectTrigger>
									<SelectValue placeholder="Selecione..." />
								</SelectTrigger>
								<SelectContent>
									{courts.map((court) => (
										<SelectItem key={court.id} value={court.id}>
											{court.name} (R$ {court.base_price})
										</SelectItem>
									))}
									{courts.length === 0 && (
										<div className="p-2 text-xs text-gray-500">
											Nenhuma quadra encontrada
										</div>
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="time">Horário de Início</Label>
						<Select
							value={formData.time}
							onValueChange={(value) =>
								setFormData({ ...formData, time: value })
							}
							disabled={!formData.date}>
							<SelectTrigger>
								<SelectValue placeholder="Escolha a hora..." />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								{HOURS.map((time) => (
									<SelectItem key={time} value={time}>
										{time}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="customerName">Nome do Cliente / Time</Label>
						<Input
							id="customerName"
							placeholder="Ex: João da Silva / Time A"
							value={formData.customerName}
							onChange={(e) =>
								setFormData({ ...formData, customerName: e.target.value })
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="phone">Telefone *</Label>
							<Input
								id="phone"
								placeholder="11999999999"
								autoComplete="tel"
								inputMode="numeric"
								maxLength={13}
								required
								value={formData.phone}
								onChange={(e) => {
									const digits = normalizeCustomerPhone(e.target.value);
									// Limite: DDD + número (11)
									setFormData({ ...formData, phone: digits.slice(0, 11) });
								}}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="payment">Status Pagamento</Label>
							<Select
								value={formData.paymentStatus}
								onValueChange={(value: "paid" | "pending" | "deposit") =>
									setFormData({ ...formData, paymentStatus: value })
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pending">Pagar no Local 🕒</SelectItem>
									<SelectItem value="deposit">Sinal (%) 💰</SelectItem>
									<SelectItem value="paid">Pago (Pix/Dinheiro) ✅</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{formData.paymentStatus === "deposit" && (
						<div className="space-y-2">
							<Label htmlFor="depositPercent">Percentual do sinal (%)</Label>
							<Input
								id="depositPercent"
								type="number"
								min={1}
								max={100}
								value={formData.depositPercent}
								onChange={(e) =>
									setFormData({
										...formData,
										depositPercent: Number(e.target.value),
									})
								}
							/>
							<p className="text-xs text-muted-foreground">
								Ex: 30 para sinal de 30%.
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} className="gap-2" disabled={loading}>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
						Confirmar Agendamento
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

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
import { formatPhoneInput, unformatPhone } from "@/lib/phoneFormat";
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
	half_hour_price?: number;
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
			.select("id, name, base_price, half_hour_price")
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
		duration: 60 as 60 | 90, // Duração em minutos: 60 (1h) ou 90 (1h30)
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

		const phoneDigits = unformatPhone(formData.phone);
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
			// Cria Date object no timezone local
			const [year, month, day] = formData.date.split('-').map(Number);
			const [hour, minute] = formData.time.split(':').map(Number);
			
			const startDateObj = new Date(year, month - 1, day, hour, minute, 0);
			const endDateObj = new Date(startDateObj.getTime() + formData.duration * 60 * 1000);
			
			// Obtém offset do timezone local
			const timezoneOffset = startDateObj.getTimezoneOffset();
			const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
			const offsetMinutes = Math.abs(timezoneOffset) % 60;
			const offsetSign = timezoneOffset <= 0 ? '+' : '-';
			const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
			
			// Formata timestamp com timezone local explícito
			const formatWithTimezone = (date: Date) => {
				const y = date.getFullYear();
				const m = String(date.getMonth() + 1).padStart(2, '0');
				const d = String(date.getDate()).padStart(2, '0');
				const h = String(date.getHours()).padStart(2, '0');
				const min = String(date.getMinutes()).padStart(2, '0');
				const s = String(date.getSeconds()).padStart(2, '0');
				return `${y}-${m}-${d} ${h}:${min}:${s}${timezoneString}`;
			};
			
			const startDateTime = formatWithTimezone(startDateObj);
			const endDateTime = formatWithTimezone(endDateObj);

			// Pegar preço da quadra selecionada e calcular baseado na duração
			const selectedCourt = courts.find((c) => c.id === formData.fieldId);
			const basePrice = selectedCourt?.base_price || 0;
			const price = basePrice * (formData.duration / 60); // Preço proporcional à duração

			// Pegar o ID do Tenant do usuário logado (Segurança) - PRIMEIRO!
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

			// ✅ VALIDAÇÃO CRÍTICA: Verifica se há conflito usando intervalo (considera duração)
			const { data: conflictCheck } = await supabase
				.from("bookings")
				.select("id, start_time, end_time")
				.eq("tenant_id", profile.tenant_id)
				.eq("court_id", formData.fieldId)
				.in("status", ["pending", "paid", "pending_payment", "confirmed", "in_progress"])
				.is("cancelled_at", null)
				.lt("start_time", endDateTime) // Reserva começa antes do nosso fim
				.gt("end_time", startDateTime) // Reserva termina depois do nosso início
				.maybeSingle();

			if (conflictCheck) {
				throw new Error("Este horário já está reservado ou conflita com outra reserva. Escolha outro horário.");
			}

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
				start_time: startDateTime, // TIMESTAMPTZ com timezone local
				end_time: endDateTime, // TIMESTAMPTZ com timezone local
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
					? `Sinal de ${Number(formData.depositPercent) || 0}%`
					: "Pagar no local";
			// Calcula horário de término
			const [startHour, startMin] = formData.time.split(":").map(Number);
			const endDate = new Date(formData.date + "T" + formData.time);
			endDate.setMinutes(endDate.getMinutes() + formData.duration);
			const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
			const durationText = formData.duration === 90 ? "1h30" : "1h";

			const msg = `*Reserva Confirmada!*

Ola *${formData.customerName}*! Sua reserva foi registrada com sucesso.

*Quadra:* ${selectedCourt?.name || "Quadra"}
*Data:* ${formData.date}
*Horario:* ${formData.time} - ${endTime} (${durationText})
*Pagamento:* ${paymentLabel}

Nos vemos em breve! Qualquer duvida, e so responder aqui.`;
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
			<DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
						<Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
						Novo Agendamento
					</DialogTitle>
					<DialogDescription className="text-xs sm:text-sm">
						Insira os dados para reservar um horário manualmente.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
							<Label>Duração</Label>
							<Select
								value={formData.duration.toString()}
								onValueChange={(value) =>
									setFormData({ ...formData, duration: Number(value) as 60 | 90 })
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="60">1 hora</SelectItem>
									<SelectItem value="90">1h30</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{formData.fieldId && formData.duration && (
						<div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
							Preço: R$ {(() => {
								const selectedCourt = courts.find((c) => c.id === formData.fieldId);
								const basePrice = selectedCourt?.base_price || 0;
								const halfHourPrice = selectedCourt?.half_hour_price || 0;
								const finalPrice = formData.duration === 90 
									? basePrice + halfHourPrice 
									: basePrice;
								return finalPrice.toFixed(2);
							})()} ({formData.duration === 90 ? "1h30" : "1h"})
						</div>
					)}

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
							<Label htmlFor="phone">Telefone (WhatsApp) *</Label>
							<Input
								id="phone"
								placeholder="(11) 99999-9999"
								autoComplete="tel"
								inputMode="numeric"
								maxLength={15}
								required
								value={formData.phone}
								onChange={(e) => {
									const formatted = formatPhoneInput(e.target.value);
									setFormData({ ...formData, phone: formatted });
								}}
								className="bg-white text-gray-900 font-medium"
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

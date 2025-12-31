import { useState, useEffect } from "react";
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
	const [loading, setLoading] = useState(false);
	const [courts, setCourts] = useState<Court[]>([]);

	// Carrega as quadras reais do banco ao abrir o modal
	useEffect(() => {
		if (open) {
			fetchCourts();
		}
	}, [open]);

	const fetchCourts = async () => {
		const { data, error } = await supabase
			.from("courts")
			.select("id, name, base_price")
			.eq("active", true);

		if (data) setCourts(data);
		if (error) console.error("Erro ao buscar quadras:", error);
	};

	const [formData, setFormData] = useState({
		date: "",
		time: "",
		fieldId: "", // ID da quadra (UUID)
		customerName: "", // Antigo 'captain'
		phone: "",
		paymentStatus: "pending" as "paid" | "pending",
	});

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
			const { error } = await supabase.from("bookings").insert({
				tenant_id: profile.tenant_id,
				court_id: formData.fieldId,
				customer_name: formData.customerName,
				customer_phone: formData.phone,
				start_time: new Date(startDateTime).toISOString(), // Garante formato UTC correto
				end_time: endDateTime,
				total_price: price,
				status: formData.paymentStatus, // 'paid' ou 'pending'
			});

			if (error) throw error;

			toast({
				title: "Agendamento Criado!",
				description: `${formData.customerName} - ${formData.time}`,
				className: "bg-green-600 text-white border-none",
			});

			// 4. Limpar e Fechar
			setFormData({
				date: "",
				time: "",
				fieldId: "",
				customerName: "",
				phone: "",
				paymentStatus: "pending",
			});

			if (onSuccess) onSuccess(); // Atualiza a dashboard/calendário
			onOpenChange(false);
		} catch (error: any) {
			console.error(error);
			toast({
				title: "Erro ao agendar",
				description: error.message || "Tente novamente.",
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
							<Label htmlFor="phone">Telefone</Label>
							<Input
								id="phone"
								placeholder="11999999999"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="payment">Status Pagamento</Label>
							<Select
								value={formData.paymentStatus}
								onValueChange={(value: "paid" | "pending") =>
									setFormData({ ...formData, paymentStatus: value })
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pending">Pagar no Local 🕒</SelectItem>
									<SelectItem value="paid">Pago (Pix/Dinheiro) ✅</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
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

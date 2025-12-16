import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useBookings } from "@/contexts/BookingsContext";
import { ARENA_CONFIG } from "@/config/arena";
import { Booking } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";

interface NewBookingModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NewBookingModal({ open, onOpenChange }: NewBookingModalProps) {
	const { timeSlots, addBooking, updateTimeSlot } = useBookings();
	const { toast } = useToast();

	const [formData, setFormData] = useState({
		date: "",
		time: "",
		fieldId: "principal" as "principal" | "medio",
		teamName: "",
		captain: "",
		phone: "",
		paymentType: "local" as "pix" | "local",
	});

	const availableSlots = timeSlots.filter(
		(slot) =>
			slot.status === "available" &&
			slot.date === formData.date &&
			slot.fieldId === formData.fieldId
	);

	const handleSubmit = () => {
		if (
			!formData.date ||
			!formData.time ||
			!formData.teamName ||
			!formData.captain ||
			!formData.phone
		) {
			toast({
				title: "Campos obrigatórios",
				description: "Preencha todos os campos para continuar.",
				variant: "destructive",
			});
			return;
		}

		const slot = timeSlots.find(
			(s) =>
				s.date === formData.date &&
				s.time === formData.time &&
				s.fieldId === formData.fieldId
		);

		if (!slot) {
			toast({
				title: "Horário não encontrado",
				variant: "destructive",
			});
			return;
		}

		const field = ARENA_CONFIG.fields.find((f) => f.id === formData.fieldId);
		if (!field) return;

		// Update slot status
		updateTimeSlot(slot.id, {
			status: formData.paymentType === "pix" ? "reserved" : "pending",
			bookedBy: formData.captain,
			paymentType: formData.paymentType,
		});

		// Create booking
		const newBooking: Booking = {
			id: `admin-${Date.now()}`,
			slotId: slot.id,
			fieldId: formData.fieldId,
			fieldName: field.name,
			date: formData.date,
			time: formData.time,
			paymentType: formData.paymentType,
			status: formData.paymentType === "pix" ? "confirmed" : "pending_approval",
			bookedBy: formData.captain,
			players: [formData.captain],
			pricePerPlayer: field.priceLocal / field.players,
			totalPlayers: field.players,
			createdAt: new Date().toISOString(),
		};

		addBooking(newBooking);

		toast({
			title: "Agendamento criado!",
			description: `${formData.teamName} - ${formData.time}`,
		});

		// Reset form
		setFormData({
			date: "",
			time: "",
			fieldId: "principal",
			teamName: "",
			captain: "",
			phone: "",
			paymentType: "local",
		});

		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5 text-primary" />
						Novo Agendamento Manual
					</DialogTitle>
					<DialogDescription>
						Criar agendamento para cliente que ligou por telefone
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
									setFormData({ ...formData, date: e.target.value, time: "" })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="field">Campo</Label>
							<Select
								value={formData.fieldId}
								onValueChange={(value: "principal" | "medio") =>
									setFormData({ ...formData, fieldId: value, time: "" })
								}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="principal">Campo Principal</SelectItem>
									<SelectItem value="medio">Campo Médio</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="time">Horário</Label>
						<Select
							value={formData.time}
							onValueChange={(value) =>
								setFormData({ ...formData, time: value })
							}
							disabled={!formData.date}>
							<SelectTrigger>
								<SelectValue
									placeholder={
										formData.date
											? "Selecione o horário"
											: "Selecione a data primeiro"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{availableSlots.map((slot) => (
									<SelectItem key={slot.id} value={slot.time}>
										{slot.time}
									</SelectItem>
								))}
								{availableSlots.length === 0 && formData.date && (
									<div className="p-2 text-sm text-muted-foreground text-center">
										Nenhum horário disponível
									</div>
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="teamName">Nome do Time</Label>
						<Input
							id="teamName"
							placeholder="Ex: Real Matismo FC"
							value={formData.teamName}
							onChange={(e) =>
								setFormData({ ...formData, teamName: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="captain">Nome do Capitão</Label>
						<Input
							id="captain"
							placeholder="Ex: João Silva"
							value={formData.captain}
							onChange={(e) =>
								setFormData({ ...formData, captain: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="phone">Telefone (WhatsApp)</Label>
						<Input
							id="phone"
							placeholder="11987654321"
							value={formData.phone}
							onChange={(e) =>
								setFormData({
									...formData,
									phone: e.target.value.replace(/\D/g, ""),
								})
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="payment">Tipo de Pagamento</Label>
						<Select
							value={formData.paymentType}
							onValueChange={(value: "pix" | "local") =>
								setFormData({ ...formData, paymentType: value })
							}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pix">PIX (Pago Total)</SelectItem>
								<SelectItem value="local">Pagar no Local</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} className="gap-2">
						<Plus className="h-4 w-4" />
						Criar Agendamento
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

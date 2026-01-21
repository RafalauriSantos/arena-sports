import { useState, useEffect } from "react";
import { Crown, Plus, Edit2, Trash2, Calendar, Clock, MapPin, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

interface RecurringSlot {
	id: string;
	tenant_id: string;
	court_id: string;
	start_time: string; // HH:mm
	end_time: string; // HH:mm
	day_of_week: number; // 0-6 (0=domingo, 6=sábado)
	active: boolean;
	created_at: string;
	updated_at: string;
	court?: {
		name: string;
	};
}

const DAYS_OF_WEEK = [
	{ value: 0, label: "Domingo" },
	{ value: 1, label: "Segunda-feira" },
	{ value: 2, label: "Terça-feira" },
	{ value: 3, label: "Quarta-feira" },
	{ value: 4, label: "Quinta-feira" },
	{ value: 5, label: "Sexta-feira" },
	{ value: 6, label: "Sábado" },
];

interface Court {
	id: string;
	name: string;
	active: boolean;
}

export default function MensalistasView() {
	const { tenantId } = useAuth();
	const { toast } = useToast();
	const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([]);
	const [courts, setCourts] = useState<Court[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingSlot, setEditingSlot] = useState<RecurringSlot | null>(null);
	
	const [formData, setFormData] = useState({
		court_id: "",
		day_of_week: "",
		start_time: "",
		end_time: "",
	});

	// Carregar dados
	useEffect(() => {
		if (!tenantId) return;
		loadData();
	}, [tenantId]);

	const loadData = async () => {
		if (!tenantId) return;
		setLoading(true);

		try {
			// Carregar quadras
			const { data: courtsData, error: courtsError } = await supabase
				.from("courts")
				.select("id, name, active")
				.eq("tenant_id", tenantId)
				.eq("active", true)
				.order("name");

			if (courtsError) throw courtsError;
			setCourts(courtsData || []);

			// Carregar mensalistas
			const { data: slotsData, error: slotsError } = await supabase
				.from("recurring_slots")
				.select("id, tenant_id, court_id, start_time, end_time, day_of_week, active, created_at, updated_at")
				.eq("tenant_id", tenantId)
				.order("day_of_week")
				.order("start_time");

			if (slotsError) throw slotsError;
			
			// Buscar nomes das quadras separadamente
			const courtIds = [...new Set((slotsData || []).map((s: RecurringSlot) => s.court_id))];
			const { data: courtsForSlots } = await supabase
				.from("courts")
				.select("id, name")
				.in("id", courtIds);

			const courtsMap = new Map((courtsForSlots || []).map((c: { id: string; name: string }) => [c.id, c]));

			// Combinar dados
			const normalizedSlots = (slotsData || []).map((slot: RecurringSlot) => ({
				...slot,
				court: courtsMap.get(slot.court_id) || { name: "Quadra não encontrada" },
			}));

			setRecurringSlots(normalizedSlots);
		} catch (error: unknown) {
			console.error("Erro ao carregar mensalistas:", error);
			const errorMessage = error instanceof Error ? error.message : "Não foi possível carregar os mensalistas.";
			toast({
				title: "Erro",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpenModal = (slot?: RecurringSlot) => {
		if (slot) {
			setEditingSlot(slot);
			setFormData({
				court_id: slot.court_id,
				day_of_week: slot.day_of_week.toString(),
				start_time: slot.start_time.slice(0, 5), // Remove segundos se houver
				end_time: slot.end_time.slice(0, 5),
			});
		} else {
			setEditingSlot(null);
			setFormData({
				court_id: "",
				day_of_week: "",
				start_time: "",
				end_time: "",
			});
		}
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setEditingSlot(null);
	};

	const handleSubmit = async () => {
		if (!tenantId) return;

		// Validações
		if (!formData.court_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
			toast({
				title: "Campos obrigatórios",
				description: "Preencha todos os campos.",
				variant: "destructive",
			});
			return;
		}

		// Validar horários
		const [startHour, startMin] = formData.start_time.split(":").map(Number);
		const [endHour, endMin] = formData.end_time.split(":").map(Number);
		
		const startMinutes = startHour * 60 + startMin;
		const endMinutes = endHour * 60 + endMin;

		if (endMinutes <= startMinutes) {
			toast({
				title: "Horário inválido",
				description: "O horário de término deve ser depois do horário de início.",
				variant: "destructive",
			});
			return;
		}

		try {
			const slotData = {
				tenant_id: tenantId,
				court_id: formData.court_id,
				day_of_week: Number(formData.day_of_week),
				start_time: `${formData.start_time}:00`,
				end_time: `${formData.end_time}:00`,
				active: true,
			};

			if (editingSlot) {
				// UPDATE
				const { error } = await supabase
					.from("recurring_slots")
					.update(slotData)
					.eq("id", editingSlot.id)
					.eq("tenant_id", tenantId);

				if (error) throw error;

				toast({
					title: "Sucesso!",
					description: "Mensalista atualizado com sucesso.",
					className: "bg-green-600 text-white border-none",
				});
			} else {
				// INSERT
				const { error } = await supabase
					.from("recurring_slots")
					.insert(slotData);

				if (error) throw error;

				toast({
					title: "Sucesso!",
					description: "Mensalista cadastrado com sucesso.",
					className: "bg-green-600 text-white border-none",
				});
			}

			handleCloseModal();
			loadData();
		} catch (error: unknown) {
			console.error("Erro ao salvar mensalista:", error);
			const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar o mensalista.";
			toast({
				title: "Erro",
				description: errorMessage,
				variant: "destructive",
			});
		}
	};

	const handleToggleActive = async (slot: RecurringSlot) => {
		if (!tenantId) return;

		try {
			const { error } = await supabase
				.from("recurring_slots")
				.update({ active: !slot.active })
				.eq("id", slot.id)
				.eq("tenant_id", tenantId);

			if (error) throw error;

			toast({
				title: "Sucesso!",
				description: slot.active ? "Mensalista desativado." : "Mensalista ativado.",
				className: "bg-green-600 text-white border-none",
			});

			loadData();
		} catch (error: unknown) {
			console.error("Erro ao alterar status:", error);
			const errorMessage = error instanceof Error ? error.message : "Não foi possível alterar o status.";
			toast({
				title: "Erro",
				description: errorMessage,
				variant: "destructive",
			});
		}
	};

	const handleDelete = async (slot: RecurringSlot) => {
		if (!tenantId) return;
		if (!confirm(`Tem certeza que deseja excluir este mensalista?`)) return;

		try {
			const { error } = await supabase
				.from("recurring_slots")
				.delete()
				.eq("id", slot.id)
				.eq("tenant_id", tenantId);

			if (error) throw error;

			toast({
				title: "Sucesso!",
				description: "Mensalista excluído com sucesso.",
				className: "bg-green-600 text-white border-none",
			});

			loadData();
		} catch (error: unknown) {
			console.error("Erro ao excluir:", error);
			const errorMessage = error instanceof Error ? error.message : "Não foi possível excluir o mensalista.";
			toast({
				title: "Erro",
				description: errorMessage,
				variant: "destructive",
			});
		}
	};

	// Gerar horários (7h às 23h)
	const generateTimeOptions = () => {
		const times = [];
		for (let h = 7; h <= 23; h++) {
			for (let m = 0; m < 60; m += 30) {
				const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
				times.push(time);
			}
		}
		return times;
	};

	const timeOptions = generateTimeOptions();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Carregando mensalistas...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-4 md:p-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
						<Crown className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
						Gestão de Mensalistas
					</h1>
					<p className="text-muted-foreground mt-1">
						Gerencie os horários fixos semanais dos seus mensalistas
					</p>
				</div>
				<Button
					onClick={() => handleOpenModal()}
					className="bg-primary hover:bg-primary/90 text-black font-bold">
					<Plus className="w-4 h-4 mr-2" />
					Novo Mensalista
				</Button>
			</div>

			{recurringSlots.length === 0 ? (
				<Card className="bg-white/5 border-white/10">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Crown className="w-16 h-16 text-amber-500/50 mb-4" />
						<h3 className="text-lg font-semibold text-white mb-2">
							Nenhum mensalista cadastrado
						</h3>
						<p className="text-sm text-muted-foreground text-center max-w-md mb-6">
							Cadastre horários fixos semanais para seus mensalistas. Eles aparecerão automaticamente no calendário público.
						</p>
						<Button
							onClick={() => handleOpenModal()}
							className="bg-primary hover:bg-primary/90 text-black font-bold">
							<Plus className="w-4 h-4 mr-2" />
							Cadastrar Primeiro Mensalista
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{recurringSlots.map((slot) => {
						const dayLabel = DAYS_OF_WEEK.find(d => d.value === slot.day_of_week)?.label || "Desconhecido";
						const courtName = slot.court?.name || "Quadra não encontrada";

						return (
							<Card
								key={slot.id}
								className={`bg-white/5 border-2 ${
									slot.active
										? "border-amber-500/50 hover:border-amber-500"
										: "border-gray-500/30 opacity-60"
								} transition-all`}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<CardTitle className="text-white flex items-center gap-2">
												<Crown className={`w-5 h-5 ${slot.active ? "text-amber-500" : "text-gray-500"}`} />
												{courtName}
											</CardTitle>
											<div className="mt-2 space-y-1">
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<Calendar className="w-4 h-4" />
													{dayLabel}
												</div>
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<Clock className="w-4 h-4" />
													{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
												</div>
											</div>
										</div>
										<Badge
											variant={slot.active ? "default" : "secondary"}
											className={slot.active ? "bg-amber-500 text-black" : ""}>
											{slot.active ? "Ativo" : "Inativo"}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleOpenModal(slot)}
											className="flex-1">
											<Edit2 className="w-4 h-4 mr-2" />
											Editar
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleToggleActive(slot)}
											className={slot.active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}>
											{slot.active ? (
												<PowerOff className="w-4 h-4" />
											) : (
												<Power className="w-4 h-4" />
											)}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDelete(slot)}
											className="text-red-500 hover:text-red-600">
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Modal de Criar/Editar */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="sm:max-w-[500px] bg-[#1a1a1a] border-white/10 text-white">
					<DialogHeader>
						<DialogTitle className="text-white">
							{editingSlot ? "Editar Mensalista" : "Novo Mensalista"}
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Configure o horário fixo semanal para este mensalista
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="court">Quadra *</Label>
							<Select
								value={formData.court_id}
								onValueChange={(value) => setFormData({ ...formData, court_id: value })}>
								<SelectTrigger className="bg-white/5 border-white/10 text-white">
									<SelectValue placeholder="Selecione a quadra" />
								</SelectTrigger>
								<SelectContent className="bg-[#1a1a1a] border-white/10">
									{courts.map((court) => (
										<SelectItem key={court.id} value={court.id} className="text-white">
											{court.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="day">Dia da Semana *</Label>
							<Select
								value={formData.day_of_week}
								onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}>
								<SelectTrigger className="bg-white/5 border-white/10 text-white">
									<SelectValue placeholder="Selecione o dia" />
								</SelectTrigger>
								<SelectContent className="bg-[#1a1a1a] border-white/10">
									{DAYS_OF_WEEK.map((day) => (
										<SelectItem key={day.value} value={day.value.toString()} className="text-white">
											{day.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start_time">Horário de Início *</Label>
								<Select
									value={formData.start_time}
									onValueChange={(value) => setFormData({ ...formData, start_time: value })}>
									<SelectTrigger className="bg-white/5 border-white/10 text-white">
										<SelectValue placeholder="00:00" />
									</SelectTrigger>
									<SelectContent className="bg-[#1a1a1a] border-white/10 max-h-[200px]">
										{timeOptions.map((time) => (
											<SelectItem key={time} value={time} className="text-white">
												{time}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="end_time">Horário de Término *</Label>
								<Select
									value={formData.end_time}
									onValueChange={(value) => setFormData({ ...formData, end_time: value })}>
									<SelectTrigger className="bg-white/5 border-white/10 text-white">
										<SelectValue placeholder="00:00" />
									</SelectTrigger>
									<SelectContent className="bg-[#1a1a1a] border-white/10 max-h-[200px]">
										{timeOptions.map((time) => (
											<SelectItem key={time} value={time} className="text-white">
												{time}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={handleCloseModal}
							className="border-white/10 text-white hover:bg-white/10">
							Cancelar
						</Button>
						<Button
							onClick={handleSubmit}
							className="bg-primary hover:bg-primary/90 text-black font-bold">
							{editingSlot ? "Salvar Alterações" : "Cadastrar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

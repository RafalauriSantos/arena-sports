import { useEffect, useState } from "react";
import {
	Calendar,
	Clock,
	Crown,
	Edit2,
	Plus,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AdminEmptyState,
	AdminPage,
	AdminPageHeader,
	AdminPanel,
	AdminPill,
	AdminToolbar,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

interface RecurringSlot {
	id: string;
	tenant_id: string;
	court_id: string;
	start_time: string;
	end_time: string;
	day_of_week: number;
	active: boolean;
	created_at: string;
	updated_at: string;
	court?: {
		name: string;
	};
}

interface Court {
	id: string;
	name: string;
	active: boolean;
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

const TIME_OPTIONS: string[] = [];
for (let hour = 7; hour <= 23; hour++) {
	for (let minute = 0; minute < 60; minute += 30) {
		TIME_OPTIONS.push(
			`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
		);
	}
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

	useEffect(() => {
		if (!tenantId) return;
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tenantId]);

	const loadData = async () => {
		if (!tenantId) return;
		setLoading(true);

		try {
			const { data: courtsData, error: courtsError } = await supabase
				.from("courts")
				.select("id, name, active")
				.eq("tenant_id", tenantId)
				.eq("active", true)
				.order("name");

			if (courtsError) throw courtsError;
			setCourts(courtsData || []);

			const { data: slotsData, error: slotsError } = await supabase
				.from("recurring_slots")
				.select(
					"id, tenant_id, court_id, start_time, end_time, day_of_week, active, created_at, updated_at",
				)
				.eq("tenant_id", tenantId)
				.order("day_of_week")
				.order("start_time");

			if (slotsError) throw slotsError;

			const courtIds = [
				...new Set((slotsData || []).map((slot: RecurringSlot) => slot.court_id)),
			];
			const { data: courtsForSlots } = await supabase
				.from("courts")
				.select("id, name")
				.in("id", courtIds);

			const courtsMap = new Map(
				(courtsForSlots || []).map((court: { id: string; name: string }) => [
					court.id,
					court,
				]),
			);

			const normalizedSlots = (slotsData || []).map((slot: RecurringSlot) => ({
				...slot,
				court: courtsMap.get(slot.court_id) || {
					name: "Quadra não encontrada",
				},
			}));

			setRecurringSlots(normalizedSlots);
		} catch (error: unknown) {
			console.error("Erro ao carregar mensalistas:", error);
			toast({
				title: "Erro",
				description:
					error instanceof Error ?
						error.message
					:	"Não foi possível carregar os mensalistas.",
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
				start_time: slot.start_time.slice(0, 5),
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

		if (
			!formData.court_id ||
			!formData.day_of_week ||
			!formData.start_time ||
			!formData.end_time
		) {
			toast({
				title: "Campos obrigatórios",
				description: "Preencha todos os campos.",
				variant: "destructive",
			});
			return;
		}

		const [startHour, startMin] = formData.start_time.split(":").map(Number);
		const [endHour, endMin] = formData.end_time.split(":").map(Number);
		const startMinutes = startHour * 60 + startMin;
		const endMinutes = endHour * 60 + endMin;

		if (endMinutes <= startMinutes) {
			toast({
				title: "Horário inválido",
				description:
					"O horário de término deve ser depois do horário de início.",
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
				const { error } = await supabase
					.from("recurring_slots")
					.update(slotData)
					.eq("id", editingSlot.id)
					.eq("tenant_id", tenantId);

				if (error) throw error;

				toast({
					title: "Mensalista atualizado",
					description: "O horário recorrente foi salvo.",
				});
			} else {
				const { error } = await supabase
					.from("recurring_slots")
					.insert(slotData);

				if (error) throw error;

				toast({
					title: "Mensalista cadastrado",
					description: "O horário recorrente foi criado.",
				});
			}

			handleCloseModal();
			loadData();
		} catch (error: unknown) {
			console.error("Erro ao salvar mensalista:", error);
			toast({
				title: "Erro",
				description:
					error instanceof Error ?
						error.message
					:	"Não foi possível salvar o mensalista.",
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
				title: slot.active ? "Mensalista pausado" : "Mensalista ativado",
				description:
					slot.active ?
						"O horário saiu da lista ativa."
					:	"O horário voltou para a lista ativa.",
			});

			loadData();
		} catch (error: unknown) {
			console.error("Erro ao alterar status:", error);
			toast({
				title: "Erro",
				description:
					error instanceof Error ?
						error.message
					:	"Não foi possível alterar o status.",
				variant: "destructive",
			});
		}
	};

	const handleDelete = async (slot: RecurringSlot) => {
		if (!tenantId) return;
		if (!confirm("Tem certeza que deseja excluir este mensalista?")) return;

		try {
			const { error } = await supabase
				.from("recurring_slots")
				.delete()
				.eq("id", slot.id)
				.eq("tenant_id", tenantId);

			if (error) throw error;

			toast({
				title: "Mensalista removido",
				description: "O horário recorrente foi excluído.",
			});

			loadData();
		} catch (error: unknown) {
			console.error("Erro ao excluir:", error);
			toast({
				title: "Erro",
				description:
					error instanceof Error ?
						error.message
					:	"Não foi possível excluir o mensalista.",
				variant: "destructive",
			});
		}
	};

	const activeSlots = recurringSlots.filter((slot) => slot.active).length;
	const inactiveSlots = recurringSlots.length - activeSlots;

	if (loading) {
		return (
			<AdminPage>
				<AdminPageHeader
					eyebrow="Recorrência"
					title="Mensalistas"
					description="Carregando horários recorrentes."
				/>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{[1, 2, 3].map((item) => (
						<div
							key={item}
							className="h-40 rounded-lg border border-slate-200 bg-white shadow-sm"
						/>
					))}
				</div>
			</AdminPage>
		);
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Recorrência"
				title="Mensalistas"
				description="Horários fixos semanais por quadra, dia e período."
				meta={
					<>
						<AdminPill tone="blue">{activeSlots} ativo(s)</AdminPill>
						{inactiveSlots > 0 && (
							<AdminPill tone="slate">{inactiveSlots} pausado(s)</AdminPill>
						)}
					</>
				}
				actions={
					recurringSlots.length > 0 ? (
						<Button
							onClick={() => handleOpenModal()}
							className="h-9 gap-2 rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]">
							<Plus className="h-4 w-4" />
							Novo mensalista
						</Button>
					) : null
				}
			/>

			{recurringSlots.length > 0 && (
				<AdminToolbar>
					<div className="flex items-center gap-3 px-1 text-[13px] text-[color:var(--az-ink-soft)]">
						<Crown className="h-4 w-4 text-[color:var(--az-ink-soft)]" />
						<span>
							Use esta tela para manter reservas recorrentes previsíveis, sem
							misturar com pedidos avulsos da Agenda.
						</span>
					</div>
				</AdminToolbar>
			)}

			{recurringSlots.length === 0 ?
				<AdminPanel>
					<AdminEmptyState
						icon={<Crown className="h-5 w-5" />}
						title="Nenhum mensalista cadastrado"
						description="Cadastre horários fixos para clientes recorrentes aparecerem na operação semanal, sem misturar com pedidos avulsos da Agenda."
						action={
							<Button
								onClick={() => handleOpenModal()}
								className="h-9 gap-2 rounded-[var(--az-radius-control)] bg-[color:var(--az-navy)] font-medium text-white hover:bg-[color:var(--az-navy)]">
								<Plus className="h-4 w-4" />
								Cadastrar mensalista
							</Button>
						}
					/>
				</AdminPanel>
			:	<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{recurringSlots.map((slot) => {
						const dayLabel =
							DAYS_OF_WEEK.find((day) => day.value === slot.day_of_week)
								?.label || "Desconhecido";
						const courtName = slot.court?.name || "Quadra não encontrada";

						return (
							<AdminPanel
								key={slot.id}
								className={cn(
									"p-4 transition-colors",
									slot.active ? "hover:border-blue-200" : "opacity-70",
								)}>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100">
												<Crown className="h-4 w-4" />
											</div>
											<div className="min-w-0">
												<h3 className="truncate text-base font-semibold text-slate-950">
													{courtName}
												</h3>
												<p className="text-xs text-slate-500">
													Horário recorrente
												</p>
											</div>
										</div>
									</div>
									<Badge
										className={
											slot.active ?
												"border-0 bg-blue-50 text-[#0b71ee]"
											:	"border-0 bg-slate-100 text-slate-600"
										}>
										{slot.active ? "Ativo" : "Pausado"}
									</Badge>
								</div>

								<div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
									<div>
										<p className="flex items-center gap-1.5 text-xs text-slate-500">
											<Calendar className="h-3.5 w-3.5" />
											Dia
										</p>
										<p className="mt-1 text-sm font-semibold text-slate-950">
											{dayLabel}
										</p>
									</div>
									<div>
										<p className="flex items-center gap-1.5 text-xs text-slate-500">
											<Clock className="h-3.5 w-3.5" />
											Horário
										</p>
										<p className="mt-1 text-sm font-semibold text-slate-950">
											{slot.start_time.slice(0, 5)} -{" "}
											{slot.end_time.slice(0, 5)}
										</p>
									</div>
								</div>

								<div className="mt-4 flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleOpenModal(slot)}
										className="h-9 flex-1 gap-2 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50">
										<Edit2 className="h-4 w-4" />
										Editar
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => handleToggleActive(slot)}
										className="h-9 w-9 rounded-md border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0b71ee]"
										aria-label={slot.active ? "Pausar mensalista" : "Ativar mensalista"}>
										{slot.active ?
											<PowerOff className="h-4 w-4" />
										:	<Power className="h-4 w-4" />
										}
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => handleDelete(slot)}
										className="h-9 w-9 rounded-md border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600"
										aria-label="Excluir mensalista">
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</AdminPanel>
						);
					})}
				</div>
			}

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="rounded-lg border border-slate-200 bg-white text-slate-900 sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingSlot ? "Editar mensalista" : "Novo mensalista"}
						</DialogTitle>
						<DialogDescription className="text-slate-500">
							Configure quadra, dia e horário da recorrência semanal.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="court">Quadra *</Label>
							<Select
								value={formData.court_id}
								onValueChange={(value) =>
									setFormData({ ...formData, court_id: value })
								}>
								<SelectTrigger id="court" className="rounded-md border-slate-200">
									<SelectValue placeholder="Selecione a quadra" />
								</SelectTrigger>
								<SelectContent>
									{courts.map((court) => (
										<SelectItem key={court.id} value={court.id}>
											{court.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="day">Dia da semana *</Label>
							<Select
								value={formData.day_of_week}
								onValueChange={(value) =>
									setFormData({ ...formData, day_of_week: value })
								}>
								<SelectTrigger id="day" className="rounded-md border-slate-200">
									<SelectValue placeholder="Selecione o dia" />
								</SelectTrigger>
								<SelectContent>
									{DAYS_OF_WEEK.map((day) => (
										<SelectItem key={day.value} value={day.value.toString()}>
											{day.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start_time">Início *</Label>
								<Select
									value={formData.start_time}
									onValueChange={(value) =>
										setFormData({ ...formData, start_time: value })
									}>
									<SelectTrigger
										id="start_time"
										className="rounded-md border-slate-200">
										<SelectValue placeholder="00:00" />
									</SelectTrigger>
									<SelectContent className="max-h-[220px]">
										{TIME_OPTIONS.map((time) => (
											<SelectItem key={time} value={time}>
												{time}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="end_time">Término *</Label>
								<Select
									value={formData.end_time}
									onValueChange={(value) =>
										setFormData({ ...formData, end_time: value })
									}>
									<SelectTrigger
										id="end_time"
										className="rounded-md border-slate-200">
										<SelectValue placeholder="00:00" />
									</SelectTrigger>
									<SelectContent className="max-h-[220px]">
										{TIME_OPTIONS.map((time) => (
											<SelectItem key={time} value={time}>
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
							className="rounded-md border-slate-200 text-slate-600 hover:bg-slate-50">
							Cancelar
						</Button>
						<Button
							onClick={handleSubmit}
							className="rounded-md bg-[#0b71ee] font-semibold text-white hover:bg-[#0861cd]">
							{editingSlot ? "Salvar alterações" : "Cadastrar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AdminPage>
	);
}

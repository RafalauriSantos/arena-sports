import { useEffect, useState } from "react";
import { AlertCircle, CalendarOff, Plus, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { eachDayOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
	AdminEmptyState,
	AdminPage,
	AdminPageHeader,
	AdminPanel,
	AdminPill,
	AdminToolbar,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/contexts/BookingsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface Folga {
	id: string;
	startDate: string;
	endDate: string;
	reason: string;
	createdAt: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isFolgaArray = (value: unknown): value is Folga[] =>
	Array.isArray(value) &&
	value.every(
		(item) =>
			isRecord(item) &&
			typeof item.id === "string" &&
			typeof item.startDate === "string" &&
			typeof item.endDate === "string" &&
			typeof item.reason === "string" &&
			typeof item.createdAt === "string",
	);

export default function FolgasView() {
	const { tenantId } = useAuth();
	const { timeSlots, blockTimeSlot } = useBookings();
	const { toast } = useToast();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>();
	const [reason, setReason] = useState("");
	const [folgas, setFolgas] = useState<Folga[]>([]);

	useEffect(() => {
		if (!tenantId) return;

		const fetchFolgas = async () => {
			const { data } = await supabase
				.from("tenants")
				.select("settings")
				.eq("id", tenantId)
				.single();

			const settings = isRecord(data) ? data.settings : undefined;
			const folgasValue = isRecord(settings) ? settings.folgas : undefined;
			if (isFolgaArray(folgasValue)) {
				setFolgas(folgasValue);
			}
		};
		fetchFolgas();
	}, [tenantId]);

	const saveFolgas = async (newFolgas: Folga[]) => {
		setFolgas(newFolgas);
		if (!tenantId) return;

		const { data } = await supabase
			.from("tenants")
			.select("settings")
			.eq("id", tenantId)
			.single();
		const currentSettings = (data?.settings as object) || {};

		await supabase
			.from("tenants")
			.update({
				settings: { ...currentSettings, folgas: newFolgas },
			})
			.eq("id", tenantId);
	};

	const handleCreateFolga = () => {
		if (!dateRange?.from || !reason.trim()) {
			toast({
				title: "Campos obrigatórios",
				description: "Selecione a data e informe o motivo.",
				variant: "destructive",
			});
			return;
		}

		const startDate = format(dateRange.from, "yyyy-MM-dd");
		const endDate =
			dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startDate;

		const dates = eachDayOfInterval({
			start: new Date(startDate),
			end: new Date(endDate),
		});

		let blockedCount = 0;
		dates.forEach((date) => {
			const dateStr = format(date, "yyyy-MM-dd");
			const slotsToBlock = timeSlots.filter((slot) => slot.date === dateStr);

			slotsToBlock.forEach((slot) => {
				blockTimeSlot(slot.id, reason);
				blockedCount++;
			});
		});

		const newFolga: Folga = {
			id: `folga-${Date.now()}`,
			startDate,
			endDate,
			reason,
			createdAt: new Date().toISOString(),
		};

		saveFolgas([...folgas, newFolga]);

		toast({
			title: "Folga criada",
			description: `${blockedCount} horários bloqueados de ${format(
				new Date(startDate),
				"dd/MM",
				{ locale: ptBR },
			)} até ${format(new Date(endDate), "dd/MM", { locale: ptBR })}.`,
		});

		setDateRange(undefined);
		setReason("");
		setIsModalOpen(false);
	};

	const handleDeleteFolga = (folga: Folga) => {
		saveFolgas(folgas.filter((item) => item.id !== folga.id));

		toast({
			title: "Folga removida",
			description:
				"Os horários permanecem bloqueados até serem liberados manualmente.",
		});
	};

	const formatDateRange = (start: string, end: string) => {
		const startFormatted = format(new Date(start), "dd/MM/yyyy", {
			locale: ptBR,
		});
		const endFormatted = format(new Date(end), "dd/MM/yyyy", { locale: ptBR });

		if (start === end) return startFormatted;
		return `${startFormatted} - ${endFormatted}`;
	};

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Disponibilidade"
				title="Folgas"
				description="Bloqueie períodos em que a arena não receberá reservas."
				meta={<AdminPill tone="slate">{folgas.length} período(s)</AdminPill>}
				actions={
					<Button
						onClick={() => setIsModalOpen(true)}
						className="h-10 gap-2 rounded-md bg-[#0b71ee] font-semibold text-white hover:bg-[#0861cd]">
						<Plus className="h-4 w-4" />
						Nova folga
					</Button>
				}
			/>

			<AdminToolbar className="border-amber-200 bg-amber-50">
				<div className="flex items-start gap-3 px-1 text-sm text-amber-900">
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
					<span>
						Ao criar uma folga, os horários do período selecionado serão
						bloqueados para novas reservas.
					</span>
				</div>
			</AdminToolbar>

			{folgas.length === 0 ?
				<AdminPanel>
					<AdminEmptyState
						icon={<CalendarOff className="h-6 w-6" />}
						title="Nenhuma folga cadastrada"
						description="Adicione períodos de fechamento quando houver manutenção, feriado ou pausa operacional."
						action={
							<Button
								onClick={() => setIsModalOpen(true)}
								className="gap-2 rounded-md bg-[#0b71ee] font-semibold text-white hover:bg-[#0861cd]">
								<Plus className="h-4 w-4" />
								Adicionar folga
							</Button>
						}
					/>
				</AdminPanel>
			:	<div className="grid gap-3 md:grid-cols-2">
					{folgas.map((folga) => (
						<AdminPanel key={folga.id} className="p-4">
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-start gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-slate-200">
										<CalendarOff className="h-5 w-5" />
									</div>
									<div className="min-w-0">
										<h3 className="text-base font-semibold text-slate-950">
											{formatDateRange(folga.startDate, folga.endDate)}
										</h3>
										<p className="mt-1 text-sm text-slate-500">
											{folga.reason}
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 shrink-0 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
									onClick={() => handleDeleteFolga(folga)}
									aria-label="Remover folga">
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
							<div className="mt-4 border-t border-slate-200 pt-3">
								<Badge
									variant="outline"
									className="border-slate-200 bg-slate-50 text-xs text-slate-600">
									Criada em{" "}
									{format(new Date(folga.createdAt), "dd/MM/yyyy HH:mm", {
										locale: ptBR,
									})}
								</Badge>
							</div>
						</AdminPanel>
					))}
				</div>
			}

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="rounded-lg border border-slate-200 bg-white text-slate-900 sm:max-w-[460px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CalendarOff className="h-5 w-5 text-[#0b71ee]" />
							Nova folga
						</DialogTitle>
						<DialogDescription className="text-slate-500">
							Selecione o período e informe o motivo do fechamento.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Período</Label>
							<div className="flex justify-center overflow-x-auto rounded-md border border-slate-200 p-2">
								<Calendar
									mode="range"
									selected={dateRange}
									onSelect={setDateRange}
									numberOfMonths={1}
									className="rounded-md"
									disabled={(date) =>
										date < new Date(new Date().setHours(0, 0, 0, 0))
									}
								/>
							</div>
							{dateRange?.from && (
								<p className="text-center text-sm text-slate-500">
									{dateRange.to ?
										`${format(dateRange.from, "dd/MM/yyyy")} até ${format(
											dateRange.to,
											"dd/MM/yyyy",
										)}`
									:	format(dateRange.from, "dd/MM/yyyy")}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="reason">Motivo</Label>
							<Input
								id="reason"
								placeholder="Ex: Férias, feriado, manutenção..."
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								className="rounded-md border-slate-200"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsModalOpen(false)}
							className="rounded-md border-slate-200 text-slate-600 hover:bg-slate-50">
							Cancelar
						</Button>
						<Button
							onClick={handleCreateFolga}
							className="gap-2 rounded-md bg-[#0b71ee] font-semibold text-white hover:bg-[#0861cd]">
							<Plus className="h-4 w-4" />
							Criar folga
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AdminPage>
	);
}

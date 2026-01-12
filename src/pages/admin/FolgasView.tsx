import { useState, useEffect } from "react";
import { CalendarOff, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { useBookings } from "@/contexts/BookingsContext";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

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
			typeof item.createdAt === "string"
	);

export default function FolgasView() {
	const { tenantId } = useAuth();
	const { timeSlots, blockTimeSlot } = useBookings();
	const { toast } = useToast();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>();
	const [reason, setReason] = useState("");
	const [folgas, setFolgas] = useState<Folga[]>([]);

	// Carregar folgas do banco ao iniciar
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
		const endDate = dateRange.to
			? format(dateRange.to, "yyyy-MM-dd")
			: startDate;

		// Get all dates in range
		const dates = eachDayOfInterval({
			start: new Date(startDate),
			end: new Date(endDate),
		});

		// Block all slots in those dates
		let blockedCount = 0;
		dates.forEach((date) => {
			const dateStr = format(date, "yyyy-MM-dd");
			const slotsToBlock = timeSlots.filter((slot) => slot.date === dateStr);

			slotsToBlock.forEach((slot) => {
				blockTimeSlot(slot.id, reason);
				blockedCount++;
			});
		});

		// Save folga record
		const newFolga: Folga = {
			id: `folga-${Date.now()}`,
			startDate,
			endDate,
			reason,
			createdAt: new Date().toISOString(),
		};

		saveFolgas([...folgas, newFolga]);

		toast({
			title: "Folga criada!",
			description: `${blockedCount} horários bloqueados de ${format(
				new Date(startDate),
				"dd/MM",
				{ locale: ptBR }
			)} até ${format(new Date(endDate), "dd/MM", { locale: ptBR })}.`,
		});

		// Reset form
		setDateRange(undefined);
		setReason("");
		setIsModalOpen(false);
	};

	const handleDeleteFolga = (folga: Folga) => {
		saveFolgas(folgas.filter((f) => f.id !== folga.id));

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

		if (start === end) {
			return startFormatted;
		}
		return `${startFormatted} - ${endFormatted}`;
	};

	return (
		<div className="space-y-4 md:space-y-6">
			{/* Header - Mobile responsive */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
						Folgas e Fechamentos
					</h1>
					<p className="text-xs md:text-sm text-gray-400 mt-1">
						Bloqueie dias quando a ArenaSys estiver fechada
					</p>
				</div>
				<Button
					size="default"
					className="gap-2 bg-primary text-white hover:bg-primary/90 w-full md:w-auto font-bold shadow-[0_0_20px_hsl(var(--primary)/0.5)] border-0 transition-all hover:scale-105"
					onClick={() => setIsModalOpen(true)}>
					<Plus className="h-4 w-4" />
					Adicionar Folga
				</Button>
			</div>

			{/* Info Card */}
			<Card className="border-amber-500/20 bg-gradient-to-br from-amber-900/10 via-gray-900/40 to-gray-900/40 backdrop-blur-md">
				<CardContent className="flex items-start gap-3 pt-6">
					<AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
					<div className="text-sm">
						<p className="font-medium text-amber-400 mb-1">Como funciona</p>
						<p className="text-gray-400">
							Ao criar uma folga, TODOS os horários dos dias selecionados serão
							bloqueados automaticamente. Os jogadores não poderão reservar
							nesses períodos.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Folgas List */}
			<div className="space-y-3 md:space-y-4">
				<h2 className="text-base md:text-lg font-bold text-white">
					Folgas Ativas
				</h2>

				{folgas.length === 0 ? (
					<Card className="bg-gray-900/40 border-white/5 backdrop-blur-md">
						<CardContent className="text-center py-12">
							<CalendarOff className="h-12 w-12 text-gray-600 mx-auto mb-4" />
							<p className="text-gray-400">Nenhuma folga cadastrada</p>
							<p className="text-sm text-gray-500 mt-1">
								Adicione períodos de fechamento quando necessário
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{folgas.map((folga) => (
							<Card
								key={folga.id}
								className="bg-gradient-to-br from-gray-900/50 to-gray-900/30 border-white/5 backdrop-blur-md hover:border-white/10 transition-all">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-lg flex items-center gap-2 text-white">
												<CalendarOff className="h-5 w-5 text-gray-400" />
												{formatDateRange(folga.startDate, folga.endDate)}
											</CardTitle>
											<p className="text-sm text-gray-400 mt-1">
												{folga.reason}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="text-gray-500 hover:text-rose-400 hover:bg-rose-500/10"
											onClick={() => handleDeleteFolga(folga)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<Badge
										variant="outline"
										className="text-xs border-white/10 text-gray-500">
										Criada em{" "}
										{format(new Date(folga.createdAt), "dd/MM/yyyy HH:mm", {
											locale: ptBR,
										})}
									</Badge>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* New Folga Modal */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CalendarOff className="h-5 w-5 text-primary" />
							Adicionar Folga
						</DialogTitle>
						<DialogDescription>
							Selecione o período e informe o motivo do fechamento
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Período</Label>
							<div className="flex justify-center">
								<Calendar
									mode="range"
									selected={dateRange}
									onSelect={setDateRange}
									numberOfMonths={2}
									className="rounded-md border"
									disabled={(date) =>
										date < new Date(new Date().setHours(0, 0, 0, 0))
									}
								/>
							</div>
							{dateRange?.from && (
								<p className="text-sm text-muted-foreground text-center">
									{dateRange.to
										? `${format(dateRange.from, "dd/MM/yyyy")} até ${format(
												dateRange.to,
												"dd/MM/yyyy"
										  )}`
										: format(dateRange.from, "dd/MM/yyyy")}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="reason">Motivo</Label>
							<Input
								id="reason"
								placeholder="Ex: Férias, Feriado, Manutenção..."
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsModalOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleCreateFolga} className="gap-2">
							<Plus className="h-4 w-4" />
							Criar Folga
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

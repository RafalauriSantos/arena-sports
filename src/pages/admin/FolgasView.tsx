import { useState } from "react";
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

interface Folga {
	id: string;
	startDate: string;
	endDate: string;
	reason: string;
	createdAt: string;
}

export default function FolgasView() {
	const { timeSlots, blockTimeSlot } = useBookings();
	const { toast } = useToast();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | undefined>();
	const [reason, setReason] = useState("");
	const [folgas, setFolgas] = useState<Folga[]>(() => {
		const stored = localStorage.getItem("arena_folgas");
		return stored ? JSON.parse(stored) : [];
	});

	const saveFolgas = (newFolgas: Folga[]) => {
		setFolgas(newFolgas);
		localStorage.setItem("arena_folgas", JSON.stringify(newFolgas));
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
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-black">Folgas e Fechamentos</h1>
					<p className="text-muted-foreground">
						Bloqueie dias inteiros quando a arena estiver fechada
					</p>
				</div>
				<Button
					size="lg"
					className="gap-2 glow-primary"
					onClick={() => setIsModalOpen(true)}>
					<Plus className="h-5 w-5" />
					Adicionar Folga
				</Button>
			</div>

			{/* Info Card */}
			<Card className="border-warning/50 bg-warning/5">
				<CardContent className="flex items-start gap-3 pt-6">
					<AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
					<div className="text-sm">
						<p className="font-medium text-warning mb-1">Como funciona</p>
						<p className="text-muted-foreground">
							Ao criar uma folga, TODOS os horários dos dias selecionados serão
							bloqueados automaticamente. Os jogadores não poderão reservar
							nesses períodos.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Folgas List */}
			<div className="space-y-4">
				<h2 className="text-lg font-bold">Folgas Ativas</h2>

				{folgas.length === 0 ? (
					<Card>
						<CardContent className="text-center py-12">
							<CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">Nenhuma folga cadastrada</p>
							<p className="text-sm text-muted-foreground mt-1">
								Adicione períodos de fechamento quando necessário
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{folgas.map((folga) => (
							<Card key={folga.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-lg flex items-center gap-2">
												<CalendarOff className="h-5 w-5 text-muted-foreground" />
												{formatDateRange(folga.startDate, folga.endDate)}
											</CardTitle>
											<p className="text-sm text-muted-foreground mt-1">
												{folga.reason}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDeleteFolga(folga)}>
											<Trash2 className="h-4 w-4 text-destructive" />
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<Badge variant="outline" className="text-xs">
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

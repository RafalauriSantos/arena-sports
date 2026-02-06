/**
 * Componente de Configuração de Horários de Funcionamento
 * Permite ao usuário definir horários diferentes para domingo e dias da semana
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, Save } from "lucide-react";
import {
	getTenantHours,
	updateTenantHours,
	type TenantHoursConfig,
} from "@/lib/services/tenant-settings";

interface OperatingHoursSettingsProps {
	tenantId: string;
}

// Gera array de horas (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Formata hora para exibição (ex: 7 -> "07:00", 13 -> "13:00")
const formatHour = (hour: number): string => {
	return `${hour.toString().padStart(2, "0")}:00`;
};

export function OperatingHoursSettings({ tenantId }: OperatingHoursSettingsProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Estados dos horários
	const [sundayStart, setSundayStart] = useState(7);
	const [sundayEnd, setSundayEnd] = useState(23);
	const [weekdayStart, setWeekdayStart] = useState(7);
	const [weekdayEnd, setWeekdayEnd] = useState(23);

	// Carrega horários atuais
	useEffect(() => {
		async function loadHours() {
			console.log("🔄 [OperatingHoursSettings] Carregando horários...");
			setLoading(true);
			const hours = await getTenantHours(tenantId);
			console.log("📥 [OperatingHoursSettings] Horários carregados:", hours);

			if (hours) {
				setSundayStart(hours.sunday.start);
				setSundayEnd(hours.sunday.end);
				setWeekdayStart(hours.weekday.start);
				setWeekdayEnd(hours.weekday.end);
				console.log("✅ [OperatingHoursSettings] States atualizados:", {
					sundayStart: hours.sunday.start,
					sundayEnd: hours.sunday.end,
					weekdayStart: hours.weekday.start,
					weekdayEnd: hours.weekday.end,
				});
			}

			setLoading(false);
		}

		loadHours();
	}, [tenantId]);

	// Salva alterações
	const handleSave = async () => {
		console.log("💾 [OperatingHoursSettings] Iniciando salvamento...");
		// Validações
		if (sundayStart > sundayEnd) {
			toast({
				title: "Erro de validação",
				description: "Horário de abertura não pode ser maior que fechamento (domingo)",
				variant: "destructive",
			});
			return;
		}

		if (weekdayStart > weekdayEnd) {
			toast({
				title: "Erro de validação",
				description: "Horário de abertura não pode ser maior que fechamento (dias da semana)",
				variant: "destructive",
			});
			return;
		}

		setSaving(true);

		const config: TenantHoursConfig = {
			sunday: { start: sundayStart, end: sundayEnd },
			weekday: { start: weekdayStart, end: weekdayEnd },
		};

		console.log("📤 [OperatingHoursSettings] Enviando config:", config);

		const { error } = await updateTenantHours(config);

		setSaving(false);

		if (error) {
			console.error("❌ [OperatingHoursSettings] Erro ao salvar:", error);
			toast({
				title: "Erro ao salvar",
				description: error.message || "Não foi possível atualizar os horários",
				variant: "destructive",
			});
			return;
		}

		console.log("✅ [OperatingHoursSettings] Salvo com sucesso!");
		toast({
			title: "Horários atualizados!",
			description: "As mudanças já estão visíveis no calendário público.",
		});
		
		// Recarrega os dados do banco para confirmar
		const hours = await getTenantHours(tenantId);
		console.log("🔄 [OperatingHoursSettings] Recarregando após salvar:", hours);
		if (hours) {
			setSundayStart(hours.sunday.start);
			setSundayEnd(hours.sunday.end);
			setWeekdayStart(hours.weekday.start);
			setWeekdayEnd(hours.weekday.end);
		}
	};

	if (loading) {
		return (
			<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-white">
						<Clock className="w-5 h-5" />
						Horários de Funcionamento
					</CardTitle>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="w-6 h-6 animate-spin text-gray-300" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-white">
					<Clock className="w-5 h-5" />
					Horários de Funcionamento
				</CardTitle>
				<CardDescription className="text-gray-300">
					Configure os horários em que suas quadras ficam disponíveis para reserva
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Horários de Domingo */}
				<div className="space-y-3">
					<div>
						<Label className="text-base font-semibold text-gray-200">Domingo</Label>
						<p className="text-sm text-gray-300">
							Horário de funcionamento aos domingos
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="sunday-start" className="text-gray-300">Abertura</Label>
							<Select
								value={sundayStart.toString()}
								onValueChange={(value) => setSundayStart(Number(value))}>
								<SelectTrigger id="sunday-start" className="bg-white/5 border-white/10 text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-gray-950 border-white/10">
									{HOURS.map((hour) => (
										<SelectItem key={hour} value={hour.toString()} className="text-white">
											{formatHour(hour)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="sunday-end" className="text-gray-300">Fechamento</Label>
							<Select
								value={sundayEnd.toString()}
								onValueChange={(value) => setSundayEnd(Number(value))}>
								<SelectTrigger id="sunday-end" className="bg-white/5 border-white/10 text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-gray-950 border-white/10">
									{HOURS.map((hour) => (
										<SelectItem key={hour} value={hour.toString()} className="text-white">
											{formatHour(hour)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Horários de Segunda a Sábado */}
				<div className="space-y-3">
					<div>
						<Label className="text-base font-semibold text-gray-200">Segunda a Sábado</Label>
						<p className="text-sm text-gray-300">
							Horário de funcionamento nos dias úteis e sábado
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="weekday-start" className="text-gray-300">Abertura</Label>
							<Select
								value={weekdayStart.toString()}
								onValueChange={(value) => setWeekdayStart(Number(value))}>
								<SelectTrigger id="weekday-start" className="bg-white/5 border-white/10 text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-gray-950 border-white/10">
									{HOURS.map((hour) => (
										<SelectItem key={hour} value={hour.toString()} className="text-white">
											{formatHour(hour)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="weekday-end" className="text-gray-300">Fechamento</Label>
							<Select
								value={weekdayEnd.toString()}
								onValueChange={(value) => setWeekdayEnd(Number(value))}>
								<SelectTrigger id="weekday-end" className="bg-white/5 border-white/10 text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-gray-950 border-white/10">
									{HOURS.map((hour) => (
										<SelectItem key={hour} value={hour.toString()} className="text-white">
											{formatHour(hour)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Botão de Salvar */}
				<div className="flex justify-end pt-4 border-t border-white/10">
					<Button onClick={handleSave} disabled={saving} className="gap-2 bg-white text-gray-950 hover:bg-gray-200">
						{saving ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Salvando...
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Salvar Horários
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

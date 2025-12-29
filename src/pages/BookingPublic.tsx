import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { TimeSlot } from "@/types/booking";

const BookingPublic = () => {
	const { tenantId } = useParams();
	const [slots, setSlots] = useState<TimeSlot[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [arenaName, setArenaName] = useState<string>("Agenda da Arena");

	useEffect(() => {
		const loadMeta = async () => {
			if (!tenantId) return;
			const { data, error } = await supabase
				.from("tenants")
				.select("business_name")
				.eq("id", tenantId)
				.maybeSingle();
			if (!error && data?.business_name) setArenaName(data.business_name);
		};
		loadMeta();
	}, [tenantId]);

	useEffect(() => {
		document.title = arenaName;
		let meta = document.querySelector(
			'meta[property="og:title"]'
		) as HTMLMetaElement | null;
		if (!meta) {
			meta = document.createElement("meta");
			meta.setAttribute("property", "og:title");
			document.head.appendChild(meta);
		}
		meta.content = arenaName;
	}, [arenaName]);

	useEffect(() => {
		const loadSlots = async () => {
			if (!tenantId) return;
			setLoading(true);
			setError(null);
			const { data, error } = await supabase
				.from("arena_time_slots")
				.select(
					"id, tenant_id, start_time, end_time, status, court_name, field_id, date, time, price_override"
				)
				.eq("tenant_id", tenantId)
				.eq("status", "available")
				.order("date", { ascending: true })
				.order("time", { ascending: true });

			if (error) {
				setError("Não foi possível carregar a agenda.");
			} else {
				const mapped: TimeSlot[] = (data ?? []).map((s) => {
					const start = s.start_time ? new Date(s.start_time) : undefined;
					const end = s.end_time ? new Date(s.end_time) : undefined;
					return {
						id: String(s.id),
						tenantId: s.tenant_id ? String(s.tenant_id) : undefined,
						status: (s.status as TimeSlot["status"]) ?? "available",
						courtName: (s.court_name as string | null) ?? null,
						fieldId: (s.field_id as string | null) ?? null,
						date: s.date ?? (start ? start.toISOString().slice(0, 10) : ""),
						time: s.time ?? (start ? start.toISOString().slice(11, 16) : ""),
						startTime: start,
						endTime: end,
						priceOverride: (s.price_override as number | null) ?? undefined,
					};
				});
				setSlots(mapped);
			}
			setLoading(false);
		};

		loadSlots();
	}, [tenantId]);

	const available = slots.filter((s) => s.status === "available");

	return (
		<div className="min-h-screen bg-background text-foreground px-4 py-8">
			<div className="max-w-5xl mx-auto space-y-6">
				<div className="space-y-2 text-center">
					<h1 className="text-3xl font-semibold tracking-tight">
						{arenaName ? `Agenda da ${arenaName}` : "Agenda da Arena"}
					</h1>
					<p className="text-muted-foreground">
						Escolha um horário disponível para reservar.
					</p>
				</div>

				{loading && <p className="text-center">Carregando horários...</p>}
				{error && <p className="text-center text-destructive">{error}</p>}

				{!loading && !error && (
					<div className="grid gap-4 md:grid-cols-2">
						{available.length === 0 ? (
							<div className="col-span-full text-center text-muted-foreground">
								Nenhum horário disponível no momento.
							</div>
						) : (
							available.map((slot) => (
								<div
									key={slot.id}
									className="rounded-2xl border border-border bg-card/80 p-4 flex items-center justify-between">
									<div>
										<div className="text-sm text-muted-foreground">
											{slot.date}
										</div>
										<div className="text-lg font-semibold">{slot.time}</div>
										<div className="text-sm text-muted-foreground">
											Quadra: {slot.courtName || slot.fieldId || "-"}
										</div>
										{slot.priceOverride && (
											<div className="text-sm font-medium text-primary mt-1">
												{new Intl.NumberFormat("pt-BR", {
													style: "currency",
													currency: "BRL",
												}).format(slot.priceOverride)}
											</div>
										)}
									</div>
									<span className="text-sm font-medium text-primary">
										Disponível
									</span>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default BookingPublic;

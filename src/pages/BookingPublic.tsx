import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
	MapPin,
	Clock,
	Trophy,
	Sparkles,
	MessageCircle,
	Calendar as CalendarIcon,
	Frown,
	Loader2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isSameDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toWhatsAppLinkPhone } from "@/lib/phone";

// --- Tipos ---
interface Court {
	id: string;
	name: string;
	base_price: number;
}

interface TimeChip {
	time: string;
	price: number;
	originalPrice?: number;
	hasDiscount: boolean;
}

type OccupiedSlot = {
	court_id: string;
	slot_time: string; // HH:mm
};

// Configuração padrão de segurança (caso o banco falhe)
const DEFAULT_DEPOSIT_PERCENT = 30;

type TenantPublic = {
	id: string;
	business_name?: string | null;
	phone?: string | null;
	address?: string | null;
	settings?: Record<string, unknown> | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

export default function BookingPublic() {
	const { subdomain } = useParams();

	const cleanSubdomain = useMemo(() => {
		if (!subdomain) return null;
		return subdomain
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "") // Tira acentos
			.replace(/[^a-z0-9]+/g, "-") // Troca símbolos por hífen
			.replace(/^-+|-+$/g, ""); // Tira hifens das pontas
	}, [subdomain]);

	// Estados de Dados
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [tenant, setTenant] = useState<TenantPublic | null>(null);
	const [courts, setCourts] = useState<Court[]>([]);
	const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);

	// Estados de UI
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [selectedSlot, setSelectedSlot] = useState<{
		courtId: string;
		courtName: string;
		slot: TimeChip;
	} | null>(null);
	const [reserveError, setReserveError] = useState<string | null>(null);
	const [reserveSuccess, setReserveSuccess] = useState<string | null>(null);
	const [isReserving, setIsReserving] = useState(false);
	const [tenantId, setTenantId] = useState<string | null>(null);
	const [playerName, setPlayerName] = useState("");
	const [playerPhone, setPlayerPhone] = useState("");

	// Ref para controlar o scroll do carrossel
	const carouselRef = useRef<HTMLDivElement>(null);

	// 1. Carregar Dados Iniciais (Empresa e Quadras)
	useEffect(() => {
		async function loadShell() {
			if (!cleanSubdomain) return;
			console.log("🔍 Buscando no banco por:", cleanSubdomain);
			setLoading(true);
			setErrorMsg(null);

			try {
				// Tenta buscar pelo subdomain exato (já limpo)
				const { data: tData0, error: tError } = await supabase
					.from("tenants")
					.select("*")
					.eq("subdomain", cleanSubdomain)
					.maybeSingle();
				let tData = tData0;

				// FALLBACK DE SEGURANÇA (Se a URL antiga ainda estiver cacheada ou indexada)
				if (!tData) {
					console.warn("Tentativa direta falhou, tentando busca flexível...");
					const { data: retryData } = await supabase
						.from("tenants")
						.select("*")
						.ilike("subdomain", cleanSubdomain)
						.maybeSingle();
					tData = retryData;
				}

				if (!tData) {
					// Último recurso: Logar o que tem no banco para você ver no console
					const { data: debugList } = await supabase
						.from("tenants")
						.select("subdomain");
					console.error("❌ Não encontrado. O que existe no banco:", debugList);
					throw new Error("Arena não encontrada.");
				}

				setTenant(tData);
				setTenantId(tData.id);

				// B. Busca Quadras Ativas
				const { data: cData } = await supabase
					.from("courts")
					.select("*")
					.eq("tenant_id", tData.id)
					.eq("active", true)
					.order("base_price");

				if (cData) setCourts(cData);
			} catch (error: unknown) {
				console.error("Erro fatal:", error);
				const message =
					getStringProp(error, "message") ||
					"Não foi possível carregar a agenda.";
				setErrorMsg(message);
			} finally {
				setLoading(false);
			}
		}
		loadShell();
	}, [cleanSubdomain]);

	// 1b. Realtime: manter preços/quadras atualizados sem refresh
	useEffect(() => {
		if (!tenantId) return;

		const channel = supabase
			.channel(`public-courts-${tenantId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "courts",
					filter: `tenant_id=eq.${tenantId}`,
				},
				(payload) => {
					const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";

					if (eventType === "DELETE") {
						const oldRow = payload.old as { id?: string };
						const removedId = oldRow?.id;
						if (!removedId) return;
						setCourts((prev) => prev.filter((c) => c.id !== removedId));
						setSelectedSlot((prev) =>
							prev?.courtId === removedId ? null : prev
						);
						return;
					}

					const row = payload.new as Partial<
						Court & { active?: boolean; tenant_id?: string }
					>;
					if (!row?.id) return;

					// Se desativar, some da agenda pública
					if (row.active === false) {
						setCourts((prev) => prev.filter((c) => c.id !== row.id));
						setSelectedSlot((prev) => (prev?.courtId === row.id ? null : prev));
						return;
					}

					// Upsert local
					setCourts((prev) => {
						const next = [...prev];
						const index = next.findIndex((c) => c.id === row.id);
						const normalized: Court = {
							id: row.id,
							name: String(row.name ?? ""),
							base_price: Number(row.base_price ?? 0),
						};

						if (index >= 0) {
							next[index] = { ...next[index], ...normalized };
						} else {
							next.push(normalized);
						}

						next.sort((a, b) => a.base_price - b.base_price);
						return next;
					});

					// Se o usuário já selecionou um horário dessa quadra, manter preço atualizado
					setSelectedSlot((prev) => {
						if (!prev || prev.courtId !== row.id) return prev;
						const newPrice = Number(row.base_price ?? prev.slot.price);
						return {
							...prev,
							slot: {
								...prev.slot,
								price: newPrice,
							},
						};
					});
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [tenantId]);

	// 1c. 🔥 Realtime: escuta mudanças nas CONFIGURAÇÕES do tenant (horários, preços, etc)
	useEffect(() => {
		if (!tenantId) return;

		console.log("🔄 [REALTIME] Iniciando escuta de configurações do tenant:", tenantId);

		const tenantChannel = supabase
			.channel(`tenant-settings-${tenantId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "tenants",
					filter: `id=eq.${tenantId}`,
				},
				async (payload) => {
					console.log("🔥 [REALTIME] Configurações do tenant atualizadas! Recarregando...", payload);
					
					// Recarrega os dados do tenant para pegar os novos settings
					const { data, error } = await supabase
						.from("tenants")
						.select("*")
						.eq("id", tenantId)
						.single();

					if (!error && data) {
						console.log("✅ [REALTIME] Settings atualizados em tempo real:", data.settings);
						setTenant(data);
					} else {
						console.error("❌ [REALTIME] Erro ao recarregar settings:", error);
					}
				}
			)
			.subscribe((status) => {
				console.log("📡 [REALTIME] Status da conexão:", status);
			});

		return () => {
			console.log("🔌 [REALTIME] Desconectando canal de configurações");
			supabase.removeChannel(tenantChannel);
		};
	}, [tenantId]);

	// 2. Carregar ocupação do dia (avulsos + mensalistas) via RPC pública segura
	useEffect(() => {
		let cancelled = false;
		const OCCUPANCY_REFRESH_MS = 60_000;

		async function loadOccupancy() {
			if (!cleanSubdomain) return;
			const dateStr = format(selectedDate, "yyyy-MM-dd");
			const { data, error } = await supabase.rpc(
				"fn_public_get_occupied_slots",
				{
					p_subdomain: cleanSubdomain,
					p_date: dateStr,
				}
			);

			if (error) {
				console.warn("Erro ao carregar ocupação pública:", error);
				if (!cancelled) setOccupiedSlots([]);
				return;
			}

			const rows =
				(data as Array<{ court_id: string; slot_time: string }> | null) ?? [];
			if (!cancelled) {
				setOccupiedSlots(
					rows
						.filter((r) => !!r.court_id && !!r.slot_time)
						.map((r) => ({
							court_id: r.court_id,
							slot_time: r.slot_time.slice(0, 5),
						}))
				);
			}
		}
		loadOccupancy();
		const interval = window.setInterval(() => {
			loadOccupancy();
		}, OCCUPANCY_REFRESH_MS);

		return () => {
			cancelled = true;
			window.clearInterval(interval);
		};
	}, [cleanSubdomain, selectedDate]);

	// 2. Carregar slots disponíveis (com descontos e bloqueios) - Otimizado com useMemo
	const courtsWithSlots = useMemo(() => {
		const now = new Date();
		const isToday = isSameDay(selectedDate, now);
		const nowHour = now.getHours();

		const bookingConfigs = tenant?.settings?.booking || {};

		// Regra de Desconto por Antecedência (7 dias)
		const diffTime = selectedDate.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		const applyDiscount = diffDays >= 7;

		const occupied = new Set(
			occupiedSlots.map((s) => `${s.court_id}-${s.slot_time}`)
		);

		// Horários de operação por dia da semana
		const dayOfWeek = selectedDate.getDay();
		const isSunday = dayOfWeek === 0;

		// Configuração de horários (suporta personalização por dia)
		let startHour = 7;
		let endHour = 23;

		if (isSunday && bookingConfigs.sunday_hours) {
			startHour = bookingConfigs.sunday_hours.start || 7;
			endHour = bookingConfigs.sunday_hours.end || 23;
		} else if (bookingConfigs.weekday_hours) {
			startHour = bookingConfigs.weekday_hours.start || 7;
			endHour = bookingConfigs.weekday_hours.end || 23;
		}

		return courts.map((court) => {
			const slots: TimeChip[] = [];

			// Grade com horários personalizados por dia
			for (let h = startHour; h <= endHour; h++) {
				const time = `${h.toString().padStart(2, "0")}:00`;
				const slotKey = `${court.id}-${time}`;

				// Bloqueio 1: Passado (se for hoje)
				if (isToday && h < nowHour) continue;

				// Bloqueio 2: Ocupado (avulso ou mensalista)
				if (occupied.has(slotKey)) continue;

				// Livre
				slots.push({
					time,
					price: court.base_price,
					originalPrice: undefined,
					hasDiscount:
						applyDiscount && !!bookingConfigs.enable_full_payment_discount,
				});
			}
			return { ...court, slots };
		});
	}, [courts, occupiedSlots, selectedDate, tenant]);

	// 3. Funções de navegação do carrossel
	const scrollCarousel = (direction: "left" | "right") => {
		if (!carouselRef.current) return;
		const scrollAmount = 200; // Pixels para rolar
		const currentScroll = carouselRef.current.scrollLeft;
		const targetScroll =
			direction === "left"
				? currentScroll - scrollAmount
				: currentScroll + scrollAmount;

		carouselRef.current.scrollTo({
			left: targetScroll,
			behavior: "smooth",
		});
	};

	// 4. Funções de Ação
	const handleBooking = (
		courtId: string,
		courtName: string,
		slot: TimeChip
	) => {
		setReserveError(null);
		setReserveSuccess(null);
		setPlayerName("");
		setPlayerPhone("");
		setSelectedSlot({ courtId, courtName, slot });
	};

	// Nova função: Reservar direto no sistema (pagar no balcão)
	const handleDirectBooking = async () => {
		if (!selectedSlot || !tenantId) return;
		
		// Validações básicas
		if (!playerName.trim() || playerName.trim().length < 3) {
			setReserveError("Por favor, informe seu nome completo");
			return;
		}

		if (!playerPhone.trim() || playerPhone.replace(/\D/g, "").length < 10) {
			setReserveError("Por favor, informe um telefone válido (DDD + número)");
			return;
		}

		setIsReserving(true);
		setReserveError(null);

		try {
			const dateStr = format(selectedDate, "yyyy-MM-dd");
			const startTime = selectedSlot.slot.time;
			const [hour] = startTime.split(":");
			const endHour = (parseInt(hour) + 1).toString().padStart(2, "0");
			
			// Monta TIMESTAMPTZ completo (2024-01-20 20:00:00+00)
			const startTimestamp = `${dateStr} ${startTime}:00+00`;
			const endTimestamp = `${dateStr} ${endHour}:00:00+00`;

			// Revalidação: verifica se o slot ainda está livre
			const { data: checkData } = await supabase.rpc(
				"fn_public_get_occupied_slots",
				{
					p_subdomain: cleanSubdomain!,
					p_date: dateStr,
				}
			);

			const occupied = new Set(
				(checkData as Array<{ court_id: string; slot_time: string }> || [])
					.map((r) => `${r.court_id}-${r.slot_time.slice(0, 5)}`)
			);

			const slotKey = `${selectedSlot.courtId}-${startTime}`;
			if (occupied.has(slotKey)) {
				throw new Error("Horário acabou de ser reservado. Escolha outro horário.");
			}

			// Cria a reserva
			const { error } = await supabase.from("bookings").insert({
				court_id: selectedSlot.courtId,
				tenant_id: tenantId,
				start_time: startTimestamp, // TIMESTAMPTZ
				end_time: endTimestamp, // TIMESTAMPTZ
				customer_name: playerName.trim(),
				customer_phone: playerPhone.replace(/\D/g, ""),
				status: "pending_payment", // Status para "pagar no balcão"
				total_price: selectedSlot.slot.price,
				notes: "Reserva via calendário público - Pagar no balcão",
			});

			if (error) throw error;

			setReserveSuccess(`Reserva confirmada! ${tenant?.business_name || "A arena"} aguarda você no horário marcado.`);
			
			// Limpa form após 3 segundos
			setTimeout(() => {
				setSelectedSlot(null);
				setReserveSuccess(null);
				setPlayerName("");
				setPlayerPhone("");
			}, 3000);

		} catch (error: unknown) {
			console.error("Erro ao criar reserva:", error);
			const message = 
				error instanceof Error 
					? error.message 
					: "Erro ao confirmar reserva. Tente novamente.";
			setReserveError(message);
		} finally {
			setIsReserving(false);
		}
	};

	const sendWhatsapp = (type: "deposit" | "full" | "standard") => {
		if (!selectedSlot || !tenant) return;
		const { slot, courtName } = selectedSlot;
		const configs = tenant.settings?.booking || {};

		const dateFmt = format(selectedDate, "dd/MM (EEEE)", { locale: ptBR });

		let textoPagamento = "";

		if (type === "deposit") {
			const percent = configs.deposit_value || DEFAULT_DEPOSIT_PERCENT;
			const sinal =
				configs.deposit_type === "fixed"
					? configs.deposit_value
					: slot.price * (percent / 100);
			textoPagamento = `🔒 *Pagar SINAL via PIX*\n💰 Valor do sinal: R$ ${sinal.toFixed(
				2
			)}\n💳 Restante: R$ ${(slot.price - sinal).toFixed(
				2
			)} (no local)\n\n📸 *IMPORTANTE:* Após pagar, envie o comprovante aqui!`;
		} else if (type === "full") {
			const valorFinal =
				slot.price * (1 - configs.full_payment_discount_percent / 100);
			textoPagamento = `💎 *Pagar TUDO via PIX (COM DESCONTO)*\n💰 Valor com ${configs.full_payment_discount_percent}% OFF: R$ ${valorFinal.toFixed(
				2
			)}\n~~R$ ${slot.price.toFixed(2)}~~\n\n📸 *IMPORTANTE:* Após pagar, envie o comprovante aqui!`;
		} else {
			textoPagamento = `💰 *Pagar via PIX*\n💵 Valor total: R$ ${slot.price.toFixed(
				2
			)}\n\n📸 *IMPORTANTE:* Após pagar, envie o comprovante aqui!`;
		}

		const msg = `Olá! Quero reservar:\n\n🏟 *${courtName}*\n📅 *${dateFmt}*\n⏰ *${slot.time}*\n\n${textoPagamento}\n\n🔑 Qual a chave PIX?`;

		(async () => {
			setReserveError(null);

			// Revalidação rápida: evita mandar o jogador pro WhatsApp com horário que acabou de ser ocupado.
			const dateStr = format(selectedDate, "yyyy-MM-dd");
			let occupied = new Set(
				occupiedSlots.map((s) => `${s.court_id}-${s.slot_time}`)
			);

			try {
				if (cleanSubdomain) {
					const { data, error } = await supabase.rpc(
						"fn_public_get_occupied_slots",
						{
							p_subdomain: cleanSubdomain,
							p_date: dateStr,
						}
					);
					if (!error) {
						const rows =
							(data as Array<{ court_id: string; slot_time: string }> | null) ??
							[];
						occupied = new Set(
							rows
								.filter((r) => !!r.court_id && !!r.slot_time)
								.map((r) => `${r.court_id}-${r.slot_time.slice(0, 5)}`)
						);
					}
				}
			} catch {
				// Se a revalidação falhar, segue o fluxo padrão (WhatsApp).
			}

			const slotKey = `${selectedSlot.courtId}-${slot.time}`;
			if (occupied.has(slotKey)) {
				setReserveError(
					"Horário indisponível. Esse horário acabou de ser reservado para esta quadra. Escolha outro horário."
				);
				return;
			}

			const phoneDigits = toWhatsAppLinkPhone(tenant.phone || "");
			const link = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
				msg
			)}`;
			window.open(link, "_blank");
			setSelectedSlot(null);
		})();
	};

	// 5. Renderização de Estados de Carregamento/Erro
	if (loading) return <PublicSkeleton />;

	if (errorMsg || !tenant) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
				<div className="max-w-md space-y-4">
					<Frown className="h-16 w-16 text-gray-300 mx-auto" />
					<h1 className="text-xl font-bold text-gray-900">
						Arena não encontrada
					</h1>
					<p className="text-gray-500 text-sm">
						{errorMsg ||
							"Verifique se o link está correto ou se a arena mudou de nome."}
					</p>
					<Button variant="outline" onClick={() => window.location.reload()}>
						Tentar Novamente
					</Button>
				</div>
			</div>
		);
	}

	// Helpers
	const configs = tenant.settings?.booking || {};

	return (
		<div className="min-h-screen bg-gray-50 pb-20 font-sans">
			{/* Hero Section */}
			<div className="relative bg-gray-900 text-white pb-16 pt-8 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
				<div className="relative z-10 max-w-md mx-auto text-center space-y-3">
					<Badge
						variant="outline"
						className="text-primary border-primary/50 bg-primary/10 px-3 py-1 mb-2">
						Reserva Online
					</Badge>
					<h1 className="text-3xl font-extrabold tracking-tight capitalize">
						{tenant.business_name}
					</h1>
					<div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
						<MapPin className="w-4 h-4" />
						<span className="truncate max-w-[250px]">
							{tenant.address || "Endereço não informado"}
						</span>
					</div>
				</div>
			</div>

			{/* Carrossel de Datas */}
			<div className="max-w-md mx-auto -mt-8 px-4 relative z-20">
				{/* Botões de navegação (apenas desktop) */}
				<button
					onClick={() => scrollCarousel("left")}
					className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all hover:scale-110"
					aria-label="Voltar datas">
					<ChevronLeft className="w-5 h-5 text-gray-700" />
				</button>
				<button
					onClick={() => scrollCarousel("right")}
					className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all hover:scale-110"
					aria-label="Avançar datas">
					<ChevronRight className="w-5 h-5 text-gray-700" />
				</button>

				<div
					ref={carouselRef}
					className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x hide-scrollbar scroll-smooth">
					{Array.from({ length: 21 }).map((_, i) => {
						const date = addDays(new Date(), i);
						const isSelected = isSameDay(date, selectedDate);
						const isToday = i === 0;
						return (
							<button
								key={i}
								onClick={() => setSelectedDate(date)}
								className={`flex-shrink-0 snap-center flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all duration-300 ${
									isSelected
										? "bg-primary text-black border-primary shadow-lg scale-105"
										: "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
								}`}>
								<span className="text-xs font-medium uppercase">
									{isToday
										? "HOJE"
										: format(date, "EEE", { locale: ptBR }).replace(".", "")}
								</span>
								<span
									className={`text-xl font-bold ${
										isSelected ? "text-black" : "text-gray-900"
									}`}>
									{format(date, "dd")}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Lista de Quadras e Horários */}
			<div className="max-w-md mx-auto px-4 mt-4 space-y-6">
				{/* Banner Promoção */}
				{courtsWithSlots.some((c) => c.slots.some((s) => s.hasDiscount)) && (
					<div className="bg-green-100 border border-green-200 text-green-800 p-3 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
						<Sparkles className="w-5 h-5 text-green-600 flex-shrink-0" />
						<span className="font-medium">
							Reserve com antecedência e ganhe{" "}
							<strong>{configs.full_payment_discount_percent}% OFF</strong>!
						</span>
					</div>
				)}
				{courtsWithSlots.map((court) => (
					<Card
						key={court.id}
						className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
						<div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
							<div className="flex items-center gap-2">
								<div className="bg-white p-2 rounded-full shadow-sm text-primary">
									<Trophy className="w-4 h-4" />
								</div>
								<h3 className="font-bold text-gray-900">{court.name}</h3>
							</div>
							<Badge
								variant="secondary"
								className="bg-white text-gray-500 font-normal">
								{court.slots.length} horários
							</Badge>
						</div>
						<CardContent className="p-4">
							{court.slots.length === 0 ? (
								<div className="text-center py-6 text-gray-400 text-sm flex flex-col items-center">
									<Clock className="w-8 h-8 mb-2 opacity-20" />
									<p>Sem horários livres.</p>
								</div>
							) : (
								<div className="grid grid-cols-3 gap-2">
									{court.slots.map((slot) => (
										<button
											key={slot.time}
											onClick={() => handleBooking(court.id, court.name, slot)}
											className="relative group flex flex-col items-center justify-center py-3 px-1 rounded-xl border border-gray-100 bg-white hover:border-primary hover:bg-primary/5 transition-all active:scale-95">
											{/* Badge Promo */}
											{slot.hasDiscount && (
												<span className="absolute -top-2 -right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
													PROMO
												</span>
											)}

											<span className="text-sm font-bold text-gray-800">
												{slot.time}
											</span>
											<div className="flex flex-col items-center mt-1 leading-none">
												{slot.hasDiscount && (
													<span className="text-[10px] text-gray-400 line-through decoration-red-400 mb-0.5">
														R${slot.price}
													</span>
												)}
												<span
													className={`text-xs font-medium ${
														slot.hasDiscount
															? "text-green-600"
															: "text-gray-500"
													}`}>
													R${" "}
													{slot.hasDiscount
														? (
																slot.price *
																(1 -
																	configs.full_payment_discount_percent / 100)
														  ).toFixed(0)
														: slot.price}
												</span>
											</div>
										</button>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				))}
				<div className="h-24" /> {/* Footer Spacer */}
			</div>

			{/* Modal Checkout */}
			{selectedSlot && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
					<div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
						<div className="p-6 text-center border-b border-gray-100">
							<h3 className="text-lg font-bold text-gray-900">
								Confirmar Reserva
							</h3>
							<p className="text-gray-500 text-sm mt-1">
								{selectedSlot.courtName} • {selectedSlot.slot.time}
							</p>
						</div>

						<div className="p-6 space-y-3">
							{reserveError && (
								<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
									{reserveError}
								</div>
							)}
							
							{reserveSuccess && (
								<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm font-medium">
									✅ {reserveSuccess}
								</div>
							)}

							{!reserveSuccess && (
								<>
									{/* Formulário de Dados do Jogador */}
									<div className="space-y-3 mb-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Seu nome completo
											</label>
											<input
												type="text"
												value={playerName}
												onChange={(e) => setPlayerName(e.target.value)}
												placeholder="Ex: João Silva"
												className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
												disabled={isReserving}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Seu telefone (WhatsApp)
											</label>
											<input
												type="tel"
												value={playerPhone}
												onChange={(e) => setPlayerPhone(e.target.value)}
												placeholder="Ex: (15) 98164-2350"
												className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
												disabled={isReserving}
											/>
										</div>
									</div>

									{/* Opção 1: Pagar no Balcão (Principal) */}
									<button
										onClick={handleDirectBooking}
										disabled={isReserving}
										className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
										{isReserving ? (
											<>
												<Loader2 className="w-5 h-5 animate-spin" />
												Confirmando...
											</>
										) : (
											<>
												<Trophy className="w-5 h-5" />
												Reservar e Pagar no Balcão
											</>
										)}
									</button>

									<p className="text-xs text-gray-500 text-center">
										Você paga quando chegar • R$ {selectedSlot.slot.price}
									</p>

									{/* Divider */}
									<div className="relative my-4">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-gray-200"></div>
										</div>
										<div className="relative flex justify-center text-xs uppercase">
											<span className="bg-white px-2 text-gray-500 font-medium">
												ou pagar via PIX
											</span>
										</div>
									</div>
									
									{/* Opção 2: Pagar Sinal via PIX */}
									{configs.require_deposit && (
										<button
											onClick={() => sendWhatsapp("deposit")}
											className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group">
											<div className="text-left">
												<p className="font-bold text-gray-900 group-hover:text-green-700">
													💳 Pagar Sinal (PIX)
												</p>
												<p className="text-xs text-gray-500">Garante + enviar comprovante</p>
											</div>
											<span className="font-bold text-green-600 text-lg">
												R${" "}
												{(configs.deposit_type === "fixed"
													? configs.deposit_value
													: selectedSlot.slot.price * (configs.deposit_value / 100)
												).toFixed(2)}
											</span>
										</button>
									)}

									{/* Opção 3: Pagar Tudo com Desconto via PIX */}
									{configs.enable_full_payment_discount && (
										<button
											onClick={() => sendWhatsapp("full")}
											className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all relative overflow-hidden group">
											<div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
												{configs.full_payment_discount_percent}% OFF
											</div>
											<div className="text-left">
												<p className="font-bold text-gray-900 group-hover:text-primary">
													💎 Pagar Tudo (PIX)
												</p>
												<p className="text-xs text-gray-500">Desconto + enviar comprovante</p>
											</div>
											<div className="text-right">
												<p className="text-xs text-gray-400 line-through">
													R$ {selectedSlot.slot.price.toFixed(2)}
												</p>
												<span className="font-bold text-primary text-lg">
													R${" "}
													{(
														selectedSlot.slot.price *
														(1 - configs.full_payment_discount_percent / 100)
													).toFixed(2)}
												</span>
											</div>
										</button>
									)}

									{/* Opção 4: Padrão (sem sinal nem desconto) - enviar comprovante via WhatsApp */}
									{!configs.require_deposit && !configs.enable_full_payment_discount && (
										<button
											onClick={() => sendWhatsapp("standard")}
											className="w-full bg-gray-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
											<MessageCircle className="w-5 h-5" />
											📱 Pagar via PIX e Enviar Comprovante
										</button>
									)}
								</>
							)}
						</div>

						<div className="p-4 bg-gray-50 text-center border-t border-gray-100">
							<button
								onClick={() => {
									setReserveError(null);
									setReserveSuccess(null);
									setSelectedSlot(null);
									setPlayerName("");
									setPlayerPhone("");
								}}
								className="text-sm text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-200/50 transition-colors">
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Skeleton Simples
function PublicSkeleton() {
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
			<Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
			<p className="text-gray-400 animate-pulse">Carregando Arena...</p>
		</div>
	);
}

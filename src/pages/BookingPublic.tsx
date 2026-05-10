// BookingPublic - Link Público para Jogadores
// Versão: 2.1.0 - Mostra horários ocupados como "Reservado"
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
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
	Navigation,
	ChevronRight as ChevronRightIcon,
	Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isSameDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toWhatsAppLinkPhone } from "@/lib/phone";
import {
	formatPhoneInput,
	unformatPhone,
	isValidPhone,
} from "@/lib/phoneFormat";
import { formatFullAddress } from "@/lib/cep";

// Versão do componente para detecção de cache
const BOOKING_PUBLIC_VERSION = "v2.1.1-2026-02-11";

// --- Tipos ---
interface Court {
	id: string;
	name: string;
	base_price: number;
	half_hour_price?: number;
}

interface TimeChip {
	time: string;
	price: number;
	originalPrice?: number;
	hasDiscount: boolean;
	isOccupied?: boolean; // Novo: indica se o slot está ocupado
}

// Função auxiliar para calcular preço baseado na duração
const calculatePrice = (
	basePrice: number,
	halfHourPrice: number | undefined,
	duration: 60 | 90,
): number => {
	if (duration === 90) {
		return basePrice + (halfHourPrice || 0);
	}
	return basePrice;
};

type OccupiedSlot = {
	court_id: string;
	slot_time: string; // HH:mm
};

interface BookingConfig {
	sunday_hours?: { start: number; end: number };
	weekday_hours?: { start: number; end: number };
	enable_full_payment_discount?: boolean;
	full_payment_discount_percent?: number;
	require_deposit?: boolean;
	deposit_type?: "fixed" | "percentage";
	deposit_value?: number;
}

// Configuração padrão de segurança (caso o banco falhe)
const DEFAULT_DEPOSIT_PERCENT = 30;

type TenantPublic = {
	id: string;
	business_name?: string | null;
	phone?: string | null;
	email?: string | null;
	address?: string | null;
	description?: string | null;
	cep?: string | null;
	street?: string | null;
	number?: string | null;
	complement?: string | null;
	neighborhood?: string | null;
	city?: string | null;
	state?: string | null;
	settings?: Record<string, unknown> | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

// Componente de Confete simples (CSS-only)
function Confetti() {
	const [show, setShow] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setShow(false), 3000);
		return () => clearTimeout(timer);
	}, []);

	if (!show) return null;

	return (
		<div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
			{[...Array(50)].map((_, i) => (
				<div
					key={i}
					className="absolute animate-confetti"
					style={{
						left: `${Math.random() * 100}%`,
						top: -20,
						animationDelay: `${Math.random() * 2}s`,
						animationDuration: `${2 + Math.random() * 2}s`,
					}}>
					{["🎉", "✨", "⭐", "⚽", "🎾"][Math.floor(Math.random() * 5)]}
				</div>
			))}
			<style>{`
				@keyframes confetti {
					0% {
						transform: translateY(0) rotate(0deg);
						opacity: 1;
					}
					100% {
						transform: translateY(100vh) rotate(360deg);
						opacity: 0;
					}
				}
				.animate-confetti {
					animation: confetti linear forwards;
					font-size: 1.5rem;
				}
			`}</style>
		</div>
	);
}

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
	const selectedDateRef = useRef(selectedDate);
	const [selectedSlot, setSelectedSlot] = useState<{
		courtId: string;
		courtName: string;
		slot: TimeChip;
		halfHourPrice?: number; // Preço da meia hora adicional
	} | null>(null);
	const [bookingDuration, setBookingDuration] = useState<60 | 90>(60); // 60 min (1h) ou 90 min (1h30)
	const [reserveError, setReserveError] = useState<string | null>(null);
	const [reserveSuccess, setReserveSuccess] = useState<string | null>(null);
	const [isReserving, setIsReserving] = useState(false);
	const [tenantId, setTenantId] = useState<string | null>(null);
	const [playerName, setPlayerName] = useState("");
	const [playerPhone, setPlayerPhone] = useState("");
	const [showBookingModal, setShowBookingModal] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const [bookingSuccess, setBookingSuccess] = useState(false);
	const carouselRef = useRef<HTMLDivElement>(null);
	const dateButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

	// Controle de erros do Realtime para evitar loops infinitos
	const realtimeErrorCountRef = useRef({ public: 0 });
	const realtimeDisabledRef = useRef({ public: false });
	const MAX_REALTIME_ERRORS = 3;

	useEffect(() => {
		selectedDateRef.current = selectedDate;
	}, [selectedDate]);

	// 1. Carregar Dados Iniciais (Empresa e Quadras)
	useEffect(() => {
		async function loadShell() {
			if (!cleanSubdomain) return;

			setLoading(true);
			setErrorMsg(null);

			try {
				// 🚀 OTIMIZADO: 1 chamada RPC ao invés de 3-4 queries sequenciais
				const { data: tData, error: tError } = await supabase
					.rpc("fn_public_get_tenant_by_subdomain", {
						p_subdomain: cleanSubdomain,
					})
					.maybeSingle();

				if (tError || !tData) {
					throw new Error(
						"Arena não encontrada. Verifique se o link está correto.",
					);
				}

				const tenantRow = tData as TenantPublic;
				setTenant(tenantRow);
				setTenantId(tenantRow.id);

				// Busca Quadras Ativas
				const { data: cData, error: cError } = await supabase
					.from("courts")
					.select("id, name, base_price, half_hour_price")
					.eq("tenant_id", tenantRow.id)
					.eq("active", true)
					.order("base_price");

				if (cError) {
					console.error("Erro ao buscar quadras:", cError);
				}

				if (cData) {
					setCourts(cData);
				}
			} catch (error: unknown) {
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

	const loadOccupiedSlots = useCallback(
		async (date: Date) => {
			if (!cleanSubdomain) return;
			const dateStr = format(date, "yyyy-MM-dd");

			const { data, error } = await supabase.rpc(
				"fn_public_get_occupied_slots",
				{
					p_subdomain: cleanSubdomain,
					p_date: dateStr,
				},
			);

			if (error) {
				setOccupiedSlots([]);
				return;
			}

			const rows =
				(data as Array<{ court_id: string; slot_time: string }> | null) ?? [];

			setOccupiedSlots(
				rows
					.filter((r) => !!r.court_id && !!r.slot_time)
					.map((r) => ({
						court_id: r.court_id,
						slot_time: r.slot_time.slice(0, 5),
					})),
			);
		},
		[cleanSubdomain],
	);

	// 2. Canal público único por tenant: bookings, courts e configurações.
	useEffect(() => {
		if (!tenantId || !cleanSubdomain || realtimeDisabledRef.current.public)
			return;

		const reloadCurrentDate = () => loadOccupiedSlots(selectedDateRef.current);

		const channel = supabase
			.channel(`public-booking-${tenantId}`, {
				config: {
					broadcast: { self: false },
				},
			})
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
							prev?.courtId === removedId ? null : prev,
						);
						return;
					}

					const row = payload.new as Partial<
						Court & { active?: boolean; tenant_id?: string }
					>;
					if (!row?.id) return;

					if (row.active === false) {
						setCourts((prev) => prev.filter((c) => c.id !== row.id));
						setSelectedSlot((prev) => (prev?.courtId === row.id ? null : prev));
						return;
					}

					setCourts((prev) => {
						const next = [...prev];
						const index = next.findIndex((c) => c.id === row.id);
						const normalized: Court = {
							id: row.id,
							name: String(row.name ?? ""),
							base_price: Number(row.base_price ?? 0),
							half_hour_price: Number(row.half_hour_price ?? 0) || undefined,
						};

						if (index >= 0) {
							next[index] = { ...next[index], ...normalized };
						} else {
							next.push(normalized);
						}

						next.sort((a, b) => a.base_price - b.base_price);
						return next;
					});

					setSelectedSlot((prev) => {
						if (!prev || prev.courtId !== row.id) return prev;
						return {
							...prev,
							slot: {
								...prev.slot,
								price: Number(row.base_price ?? prev.slot.price),
							},
							halfHourPrice: Number(
								row.half_hour_price ?? prev.halfHourPrice ?? 0,
							),
						};
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "tenants",
					filter: `id=eq.${tenantId}`,
				},
				async () => {
					const { data, error } = await supabase
						.rpc("fn_public_get_tenant_by_subdomain", {
							p_subdomain: cleanSubdomain,
						})
						.maybeSingle();

					if (!error && data) {
						setTenant(data as TenantPublic);
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "bookings",
					filter: `tenant_id=eq.${tenantId}`,
				},
				(payload) => {
					const newRow = (payload.new ?? null) as Record<
						string,
						unknown
					> | null;
					const oldRow = (payload.old ?? null) as Record<
						string,
						unknown
					> | null;
					const startTimeIso =
						(newRow?.start_time as string | undefined) ??
						(oldRow?.start_time as string | undefined);

					if (!startTimeIso) {
						reloadCurrentDate();
						return;
					}

					const bookingDateStr = format(new Date(startTimeIso), "yyyy-MM-dd");
					const currentDateStr = format(selectedDateRef.current, "yyyy-MM-dd");

					if (bookingDateStr === currentDateStr) {
						reloadCurrentDate();
					}
				},
			)
			.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					realtimeErrorCountRef.current.public = 0;
				} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
					realtimeErrorCountRef.current.public++;
					if (realtimeErrorCountRef.current.public >= MAX_REALTIME_ERRORS) {
						realtimeDisabledRef.current.public = true;
						supabase.removeChannel(channel);
					}
				}
			});

		return () => {
			supabase.removeChannel(channel);
		};
	}, [tenantId, cleanSubdomain, loadOccupiedSlots]);

	// 3. Carregar ocupação inicial e ao trocar a data visível.
	useEffect(() => {
		loadOccupiedSlots(selectedDate);
	}, [loadOccupiedSlots, selectedDate]);

	// 2. Carregar slots disponíveis (com descontos e bloqueios) - Otimizado com useMemo
	const courtsWithSlots = useMemo(() => {
		// ⚠️ IMPORTANTE: Só processa se tiver quadras carregadas
		if (!courts || courts.length === 0) {
			return [];
		}

		const now = new Date();
		const isToday = isSameDay(selectedDate, now);
		const nowHour = now.getHours();

		const bookingConfigs = (tenant?.settings?.booking || {}) as BookingConfig;

		// Regra de Desconto por Antecedência (7 dias)
		const diffTime = selectedDate.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		const applyDiscount = diffDays >= 7;

		const occupied = new Set(
			occupiedSlots.map((s) => `${s.court_id}-${s.slot_time}`),
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
				const isOccupied = occupied.has(slotKey);

				// Mostra TODOS os horários, mas marca os ocupados
				slots.push({
					time,
					price: court.base_price,
					originalPrice: undefined,
					hasDiscount:
						!isOccupied &&
						applyDiscount &&
						!!bookingConfigs.enable_full_payment_discount,
					isOccupied, // Marca se está ocupado
				});
			}
			return { ...court, slots };
		});
	}, [courts, occupiedSlots, selectedDate, tenant]);

	// Scroll automático para o dia selecionado
	useEffect(() => {
		if (!carouselRef.current) return;

		// Encontra o índice do dia selecionado
		const selectedIndex = Array.from({ length: 21 }).findIndex((_, i) => {
			const date = addDays(new Date(), i);
			return isSameDay(date, selectedDate);
		});

		if (selectedIndex >= 0) {
			const button = dateButtonRefs.current.get(selectedIndex);
			if (button && carouselRef.current) {
				// Scroll suave para o botão selecionado
				setTimeout(() => {
					button.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
						inline: "center",
					});
				}, 100);
			}
		}
	}, [selectedDate]);

	// 4. Funções de Ação
	const handleBooking = (
		courtId: string,
		courtName: string,
		slot: TimeChip,
	) => {
		setReserveError(null);
		setReserveSuccess(null);
		setPlayerName("");
		setPlayerPhone("");
		// Busca o court para pegar o half_hour_price
		const court = courts.find((c) => c.id === courtId);
		setSelectedSlot({
			courtId,
			courtName,
			slot,
			halfHourPrice: court?.half_hour_price,
		});
		setShowBookingModal(false); // Não abre modal automaticamente, só mostra sticky footer
	};

	// Efeito de sucesso/confetti
	useEffect(() => {
		if (bookingSuccess) {
			setShowConfetti(true);
			const timer = setTimeout(() => setShowConfetti(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [bookingSuccess]);

	// Nova função: Reservar direto no sistema (pagar no balcão)
	const handleDirectBooking = async () => {
		if (!selectedSlot || !tenantId) return;

		// Validações básicas
		if (!playerName.trim() || playerName.trim().length < 2) {
			setReserveError("Por favor, informe seu nome");
			return;
		}

		if (!isValidPhone(playerPhone)) {
			setReserveError("Por favor, informe um telefone válido (DDD + número)");
			return;
		}

		setIsReserving(true);
		setReserveError(null);

		try {
			const dateStr = format(selectedDate, "yyyy-MM-dd");
			const startTime = selectedSlot.slot.time;
			const [hour, minute] = startTime.split(":");
			const endHour = (parseInt(hour) + 1).toString().padStart(2, "0");

			// Cria Date object no timezone local do navegador
			const startDate = new Date(selectedDate);
			startDate.setHours(parseInt(hour), parseInt(minute || "0"), 0, 0);

			const endDate = new Date(startDate);
			endDate.setMinutes(endDate.getMinutes() + bookingDuration); // Usa a duração escolhida

			// Obtém offset do timezone local em minutos (ex: -180 para UTC-3)
			const timezoneOffset = startDate.getTimezoneOffset();
			const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
			const offsetMinutes = Math.abs(timezoneOffset) % 60;
			const offsetSign = timezoneOffset <= 0 ? "+" : "-";
			const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

			// Formata timestamp com timezone local explícito
			const formatWithTimezone = (date: Date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, "0");
				const day = String(date.getDate()).padStart(2, "0");
				const hours = String(date.getHours()).padStart(2, "0");
				const mins = String(date.getMinutes()).padStart(2, "0");
				const secs = String(date.getSeconds()).padStart(2, "0");
				return `${year}-${month}-${day} ${hours}:${mins}:${secs}${timezoneString}`;
			};

			const startTimestamp = formatWithTimezone(startDate);
			const endTimestamp = formatWithTimezone(endDate);

			// ✅ VALIDAÇÃO CRÍTICA: Verifica se o slot ainda está livre (ANTES de inserir)
			const { data: checkData } = await supabase.rpc(
				"fn_public_get_occupied_slots",
				{
					p_subdomain: cleanSubdomain!,
					p_date: dateStr,
				},
			);

			const occupied = new Set(
				(
					(checkData as Array<{ court_id: string; slot_time: string }>) || []
				).map((r) => `${r.court_id}-${r.slot_time.slice(0, 5)}`),
			);

			// Verifica se o slot inicial está livre
			const slotKey = `${selectedSlot.courtId}-${startTime}`;
			if (occupied.has(slotKey)) {
				throw new Error(
					"Horário acabou de ser reservado. Escolha outro horário.",
				);
			}

			// Se for 1h30, verifica se o próximo slot também está livre
			if (bookingDuration === 90) {
				const [startHour, startMin] = startTime.split(":").map(Number);
				const nextHour = startHour + 1;
				const nextTime = `${nextHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
				const nextSlotKey = `${selectedSlot.courtId}-${nextTime}`;

				if (occupied.has(nextSlotKey)) {
					throw new Error(
						"O horário das " +
							nextTime +
							" já está reservado. Para jogar 1h30, esse horário precisa estar livre.",
					);
				}
			}

			// ✅ VALIDAÇÃO ADICIONAL: Verifica conflito direto no banco usando intervalo (race condition)
			// Verifica se há alguma reserva que sobrepõe o intervalo [startTimestamp, endTimestamp)
			const { data: conflictCheck } = await supabase
				.from("bookings")
				.select("id, start_time, end_time")
				.eq("tenant_id", tenantId)
				.eq("court_id", selectedSlot.courtId)
				.in("status", [
					"pending",
					"paid",
					"pending_payment",
					"confirmed",
					"in_progress",
				])
				.is("cancelled_at", null)
				.lt("start_time", endTimestamp) // Reserva começa antes do nosso fim
				.gt("end_time", startTimestamp) // Reserva termina depois do nosso início
				.maybeSingle();

			if (conflictCheck) {
				throw new Error(
					"Este horário já está reservado ou conflita com outra reserva. Por favor, escolha outro.",
				);
			}

			// Calcula preço baseado na duração
			const finalPrice = calculatePrice(
				selectedSlot.slot.price,
				selectedSlot.halfHourPrice,
				bookingDuration,
			);

			// Cria a reserva
			const { error, data: newBooking } = await supabase
				.from("bookings")
				.insert({
					court_id: selectedSlot.courtId,
					tenant_id: tenantId,
					start_time: startTimestamp, // TIMESTAMPTZ
					end_time: endTimestamp, // TIMESTAMPTZ
					customer_name: playerName.trim(),
					customer_phone: unformatPhone(playerPhone),
					status: "pending_payment", // Status para "pagar no balcão"
					total_price: finalPrice,
					notes: `Reserva via calendário público - ${bookingDuration}min - Pagar no balcão`,
				})
				.select()
				.single();

			if (error) {
				throw error;
			}

			// ✅ ATUALIZA IMEDIATAMENTE o estado local (sem esperar real-time)
			// Marca o slot inicial e, se for 1h30, também o próximo slot como ocupado
			setOccupiedSlots((prev) => {
				const newSlots = [...prev];

				// Adiciona o slot inicial se não existir
				if (
					!newSlots.some(
						(s) =>
							s.court_id === selectedSlot.courtId && s.slot_time === startTime,
					)
				) {
					newSlots.push({
						court_id: selectedSlot.courtId,
						slot_time: startTime,
					});
				}

				// Se for 1h30, adiciona o próximo slot também
				if (bookingDuration === 90) {
					const [startHour, startMin] = startTime.split(":").map(Number);
					const nextHour = startHour + 1;
					const nextTime = `${nextHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
					if (
						!newSlots.some(
							(s) =>
								s.court_id === selectedSlot.courtId && s.slot_time === nextTime,
						)
					) {
						newSlots.push({
							court_id: selectedSlot.courtId,
							slot_time: nextTime,
						});
					}
				}
				return newSlots;
			});

			setReserveSuccess(
				`Reserva confirmada! ${tenant?.business_name || "A arena"} aguarda você no horário marcado.`,
			);
			setBookingSuccess(true);
			setShowBookingModal(false);

			// Limpa form após 3 segundos
			setTimeout(() => {
				setSelectedSlot(null);
				setReserveSuccess(null);
				setPlayerName("");
				setPlayerPhone("");
				setBookingDuration(60);
			}, 3000);
		} catch (error: unknown) {
			let message: string;
			if (error instanceof Error) {
				message = error.message;
				// Se for erro de rede ou timeout, adiciona dica de atualização
				if (
					message.includes("Failed to fetch") ||
					message.includes("NetworkError")
				) {
					message =
						"Erro de conexão. Tente recarregar a página (arraste para baixo).";
				}
			} else {
				message = "Erro ao confirmar reserva. Tente recarregar a página.";
			}

			setReserveError(message);
		} finally {
			setIsReserving(false);
		}
	};

	const sendWhatsapp = (type: "deposit" | "full" | "standard") => {
		if (!selectedSlot || !tenant) return;
		const { slot, courtName } = selectedSlot;
		const configs = (tenant.settings?.booking || {}) as BookingConfig;

		const dateFmt = format(selectedDate, "dd/MM (EEEE)", { locale: ptBR });
		const finalPrice = calculatePrice(
			slot.price,
			selectedSlot?.halfHourPrice,
			bookingDuration,
		);
		const durationText = bookingDuration === 90 ? "1h30" : "1h";

		// Calcula horário de término
		const [startHour, startMin] = slot.time.split(":").map(Number);
		const endDate = new Date(selectedDate);
		endDate.setHours(startHour, startMin, 0, 0);
		endDate.setMinutes(endDate.getMinutes() + bookingDuration);
		const endTime = format(endDate, "HH:mm");

		let textoPagamento = "";

		if (type === "deposit") {
			const percent = configs.deposit_value || DEFAULT_DEPOSIT_PERCENT;
			const sinal =
				configs.deposit_type === "fixed" ?
					configs.deposit_value
				:	finalPrice * (percent / 100);
			textoPagamento = `*Pagar SINAL via PIX*
Valor do sinal: R$ ${sinal.toFixed(2)}
Restante: R$ ${(finalPrice - sinal).toFixed(2)} (no local)

*IMPORTANTE:* Apos pagar, envie o comprovante aqui!`;
		} else if (type === "full") {
			const valorFinal =
				finalPrice * (1 - configs.full_payment_discount_percent / 100);
			textoPagamento = `*Pagar TUDO via PIX (COM DESCONTO)*
Valor com ${configs.full_payment_discount_percent}% OFF: R$ ${valorFinal.toFixed(2)}
De: R$ ${finalPrice.toFixed(2)}

*IMPORTANTE:* Apos pagar, envie o comprovante aqui!`;
		} else {
			textoPagamento = `*Pagar via PIX*
Valor total: R$ ${finalPrice.toFixed(2)}

*IMPORTANTE:* Apos pagar, envie o comprovante aqui!`;
		}

		const msg = `Ola! Quero reservar:

*${courtName}*
*${dateFmt}*
*${slot.time} - ${endTime} (${durationText})*

${textoPagamento}

Qual a chave PIX?`;

		(async () => {
			setReserveError(null);

			// Revalidação rápida: evita mandar o jogador pro WhatsApp com horário que acabou de ser ocupado.
			const dateStr = format(selectedDate, "yyyy-MM-dd");
			let occupied = new Set(
				occupiedSlots.map((s) => `${s.court_id}-${s.slot_time}`),
			);

			try {
				if (cleanSubdomain) {
					const { data, error } = await supabase.rpc(
						"fn_public_get_occupied_slots",
						{
							p_subdomain: cleanSubdomain,
							p_date: dateStr,
						},
					);
					if (!error) {
						const rows =
							(data as Array<{ court_id: string; slot_time: string }> | null) ??
							[];
						occupied = new Set(
							rows
								.filter((r) => !!r.court_id && !!r.slot_time)
								.map((r) => `${r.court_id}-${r.slot_time.slice(0, 5)}`),
						);
					}
				}
			} catch {
				// Se a revalidação falhar, segue o fluxo padrão (WhatsApp).
			}

			const slotKey = `${selectedSlot.courtId}-${slot.time}`;
			if (occupied.has(slotKey)) {
				setReserveError(
					"Horário indisponível. Esse horário acabou de ser reservado para esta quadra. Escolha outro horário.",
				);
				return;
			}

			const phoneDigits = toWhatsAppLinkPhone(tenant.phone || "");
			const link = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
				msg,
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
					<p className="text-gray-300 text-sm">
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
	const configs = (tenant.settings?.booking || {}) as BookingConfig;

	// Verificar se está aberto (baseado em horário atual)
	const now = new Date();
	const currentHour = now.getHours();
	const dayOfWeek = now.getDay();
	const isSunday = dayOfWeek === 0;
	const weekdayHours = configs.weekday_hours || { start: 7, end: 23 };
	const sundayHours = configs.sunday_hours || { start: 7, end: 23 };
	const hours = isSunday ? sundayHours : weekdayHours;
	const isOpen = currentHour >= hours.start && currentHour < hours.end;

	// Endereço formatado para Maps/Waze
	const fullAddress =
		tenant.street ?
			formatFullAddress(
				tenant.street,
				tenant.number || undefined,
				tenant.complement || undefined,
				tenant.neighborhood || undefined,
				tenant.city || undefined,
				tenant.state || undefined,
			)
		:	tenant.address || "";

	const mapsUrl =
		fullAddress ?
			`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
		:	null;
	const wazeUrl =
		fullAddress ?
			`https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`
		:	null;

	return (
		<div
			className={`min-h-screen bg-slate-50 font-sans ${
				selectedSlot && !reserveSuccess ? "pb-24" : "pb-6"
			}`}>
			{showConfetti && <Confetti />}

			{/* Badge de versão (aparece apenas quando há erro ou em dev) */}
			{(reserveError || import.meta.env.DEV) && (
				<div className="fixed top-2 right-2 z-50 bg-gray-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full font-mono">
					{BOOKING_PUBLIC_VERSION}
				</div>
			)}

			{/* Header Imersivo (Hero Section) - NOVO DESIGN MOBILE FIRST */}
			<div className="relative h-64 md:h-80 overflow-hidden">
				{/* Background com gradiente ou foto de capa (futuro) */}
				<div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800" />
				<div className="absolute inset-0 bg-black/25" />

				{/* Conteúdo do Header */}
				<div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
					{/* Top Bar - Botões de Ação */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{/* Status Aberto/Fechado */}
							<div
								className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/15 ${
									isOpen ?
										"bg-emerald-500/90 text-white"
									:	"bg-slate-600/90 text-white"
								}`}>
								<div
									className={`w-2 h-2 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-white"}`}
								/>
								<span className="text-xs font-semibold">
									{isOpen ? "Aberto Agora" : "Fechado"}
								</span>
							</div>
						</div>

						{/* Botões de Ação */}
						<div className="flex items-center gap-2">
							{mapsUrl && (
								<button
									onClick={() => window.open(mapsUrl, "_blank")}
									className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all active:scale-95"
									aria-label="Como chegar">
									<Navigation className="w-5 h-5" />
								</button>
							)}
							{tenant.phone && (
								<button
									onClick={() => {
										const phoneDigits = toWhatsAppLinkPhone(tenant.phone || "");
										const msg = `Ola! Estou no calendario de *${tenant.business_name}*. Gostaria de mais informacoes.`;
										window.open(
											`https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`,
											"_blank",
										);
									}}
									className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all active:scale-95"
									aria-label="WhatsApp">
									<MessageCircle className="w-5 h-5" />
								</button>
							)}
						</div>
					</div>

					{/* Nome da Arena e Info */}
					<div className="space-y-2">
						<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight capitalize leading-tight drop-shadow-lg">
							{tenant.business_name}
						</h1>
						{tenant.description && (
							<p className="text-white/90 text-sm sm:text-base max-w-md drop-shadow">
								{tenant.description}
							</p>
						)}
						{fullAddress && (
							<div className="flex items-start gap-1.5 text-white/85 text-sm max-w-xl">
								<MapPin className="w-4 h-4 flex-shrink-0" />
								<span className="line-clamp-2">{fullAddress}</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Seletor de Data Horizontal (Estilo Google Calendar) */}
			<div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
				<div className="max-w-2xl mx-auto px-4 py-3">
					<div
						ref={carouselRef}
						className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar">
						{Array.from({ length: 21 }).map((_, i) => {
							const date = addDays(new Date(), i);
							const isSelected = isSameDay(date, selectedDate);
							const isToday = i === 0;
							const dayName =
								isToday ? "HOJE" : (
									format(date, "EEE", { locale: ptBR })
										.toUpperCase()
										.replace(".", "")
								);

							return (
								<button
									ref={(el) => {
										if (el) dateButtonRefs.current.set(i, el);
									}}
									key={i}
									onClick={() => setSelectedDate(date)}
									className={`flex-shrink-0 snap-center flex flex-col items-center justify-center min-w-[64px] h-20 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
										isSelected ?
											"bg-emerald-600 text-white border-emerald-600 shadow-sm"
										:	"bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
									}`}>
									<span
										className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
											isSelected ? "text-white/90" : "text-slate-400"
										}`}>
										{dayName}
									</span>
									<span
										className={`text-2xl font-bold ${
											isSelected ? "text-white" : "text-slate-950"
										}`}>
										{format(date, "dd")}
									</span>
									<span
										className={`text-[10px] mt-0.5 ${
											isSelected ? "text-white/80" : "text-slate-400"
										}`}>
										{format(date, "MMM", { locale: ptBR })}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Lista de Quadras e Horários */}
			<div className="max-w-2xl mx-auto px-4 mt-5 sm:mt-6 space-y-5 sm:space-y-6 pb-6">
				{/* Banner Promoção */}
				{courtsWithSlots.some((c) => c.slots.some((s) => s.hasDiscount)) && (
					<div className="bg-white border border-emerald-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
						<div className="bg-emerald-600 p-2 rounded-lg">
							<Sparkles className="w-5 h-5 text-white" />
						</div>
						<div className="flex-1">
							<p className="font-semibold text-emerald-900 text-sm">
								Reserve com 7+ dias de antecedência
							</p>
							<p className="text-xs text-emerald-700">
								E ganhe{" "}
								<strong>{configs.full_payment_discount_percent}% OFF</strong> no
								pagamento à vista!
							</p>
						</div>
					</div>
				)}

				{/* Lista de Quadras */}
				{courtsWithSlots.map((court) => (
					<div
						key={court.id}
						className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
						{/* Header da Quadra */}
						<div className="px-4 sm:px-5 py-4 bg-slate-50 border-b border-slate-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="bg-emerald-100 p-2.5 rounded-lg">
										<Trophy className="w-5 h-5 text-emerald-600" />
									</div>
									<div>
										<h3 className="font-bold text-slate-950 text-lg">
											{court.name}
										</h3>
										<p className="text-xs text-slate-500">
											{court.slots.filter((s) => !s.isOccupied).length}{" "}
											{court.slots.filter((s) => !s.isOccupied).length === 1 ?
												"horário disponível"
											:	"horários disponíveis"}
											{court.slots.filter((s) => s.isOccupied).length > 0 && (
												<span className="text-slate-500 ml-1">
													• {court.slots.filter((s) => s.isOccupied).length}{" "}
													reservado
													{(
														court.slots.filter((s) => s.isOccupied).length !== 1
													) ?
														"s"
													:	""}
												</span>
											)}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Grid de Horários */}
						<div className="p-4">
							{court.slots.length === 0 ?
								<div className="text-center py-12 text-slate-400">
									<Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
									<p className="text-sm font-medium">
										Sem horários livres para este dia
									</p>
								</div>
							:	<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{court.slots.map((slot, index) => {
										// Stagger effect baseado no índice (máximo 6 delays diferentes)
										const staggerClass = `stagger-${(index % 6) + 1}`;
										const isSelected =
											selectedSlot?.courtId === court.id &&
											selectedSlot?.slot.time === slot.time;
										const finalPrice =
											slot.hasDiscount ?
												Math.round(
													slot.price *
														(1 - configs.full_payment_discount_percent / 100),
												)
											:	slot.price;

										// Se está ocupado, mostra com estilo diferente
										if (slot.isOccupied) {
											return (
												<div
													key={slot.time}
													className={`relative flex flex-col items-center justify-center min-h-[72px] py-3 px-2 rounded-lg border bg-slate-100 border-slate-200 opacity-85 cursor-not-allowed animate-reveal-up ${staggerClass}`}>
													{/* Ícone de cadeado */}
													<Lock className="w-4 h-4 text-slate-500 mb-1" />

													{/* Horário */}
													<span className="text-base font-bold text-slate-500 line-through">
														{slot.time}
													</span>

													{/* Label "Reservado" */}
													<span className="text-[10px] text-slate-500 font-semibold mt-0.5">
														Reservado
													</span>
												</div>
											);
										}

										return (
											<button
												key={slot.time}
												onClick={() =>
													handleBooking(court.id, court.name, slot)
												}
												data-testid="slot-available"
												className={`relative group flex flex-col items-center justify-center min-h-[72px] py-3 px-2 rounded-lg border transition-all duration-200 active:scale-[0.98] animate-reveal-up ${staggerClass} ${
													isSelected ?
														"bg-emerald-600 border-emerald-600 text-white shadow-sm"
													:	"bg-white border-slate-200 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50"
												}`}>
												{/* Badge Promo */}
												{slot.hasDiscount && !isSelected && (
													<span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
														-{configs.full_payment_discount_percent}%
													</span>
												)}

												{/* Horário */}
												<span
													className={`text-base font-bold mb-1 ${
														isSelected ? "text-white" : "text-slate-950"
													}`}>
													{slot.time}
												</span>

												{/* Preço */}
												<div className="flex flex-col items-center gap-0.5">
													{slot.hasDiscount && !isSelected && (
														<span className="text-[10px] text-gray-300 line-through">
															R$ {slot.price}
														</span>
													)}
													<span
														className={`text-sm font-bold ${
															isSelected ? "text-white"
															: slot.hasDiscount ? "text-emerald-600"
															: "text-gray-700"
														}`}>
														R$ {finalPrice}
													</span>
												</div>
											</button>
										);
									})}
								</div>
							}
						</div>
					</div>
				))}
			</div>

			{/* Sticky Footer - Resumo da Reserva */}
			{selectedSlot && !reserveSuccess && (
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 shadow-xl">
					<div className="max-w-2xl mx-auto px-4 py-4">
						<div className="flex items-center justify-between gap-4">
							{/* Resumo */}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-slate-950 truncate">
									{selectedSlot.courtName}
								</p>
								<div className="flex items-center gap-2 mt-0.5">
									<Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
									<span className="text-sm text-slate-500">
										{format(selectedDate, "dd/MM", { locale: ptBR })} •{" "}
										{selectedSlot.slot.time}
										{bookingDuration === 90 && " - 1h30"}
									</span>
								</div>
								<p className="text-lg font-bold text-emerald-600 mt-1">
									R${" "}
									{calculatePrice(
										selectedSlot.slot.price,
										selectedSlot.halfHourPrice,
										bookingDuration,
									).toFixed(2)}
								</p>
							</div>

							{/* Botão de Ação */}
							<button
								onClick={() => setShowBookingModal(true)}
								className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 sm:px-6 py-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center gap-2">
								<span>Reservar Agora</span>
								<ChevronRightIcon className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Checkout Completo (Abre quando clica em "Reservar Agora") */}
			{selectedSlot && showBookingModal && (
				<div
					data-testid="booking-modal"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowBookingModal(false);
						}
					}}
					className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
					<div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 max-h-[90vh] overflow-y-auto">
						<div className="p-5 sm:p-6 text-center border-b border-slate-200 bg-slate-50">
							<h3 className="text-lg sm:text-xl font-bold text-slate-950">
								Confirmar Reserva
							</h3>
							<p className="text-slate-500 text-sm mt-1.5">
								{selectedSlot.courtName} •{" "}
								{format(selectedDate, "dd/MM", { locale: ptBR })} •{" "}
								{selectedSlot.slot.time}
								{bookingDuration === 90 && " - 1h30"}
							</p>
						</div>

						<div className="p-6 space-y-3">
							{reserveError && (
								<div className="space-y-2">
									<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
										{reserveError}
									</div>
									<button
										onClick={() => {
											// Limpa cache do service worker se disponível
											if ("caches" in window) {
												caches.keys().then((keys) => {
													keys.forEach((key) => caches.delete(key));
												});
											}
											// Recarrega com cache bypass
											window.location.reload();
										}}
										type="button"
										className="w-full py-2 px-4 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-medium transition-colors">
										🔄 Recarregar página (limpar cache)
									</button>
								</div>
							)}

							{reserveSuccess && (
								<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm font-medium">
									✅ {reserveSuccess}
								</div>
							)}

							{!reserveSuccess && (
								<>
									{/* Seleção de Duração */}
									<div className="mb-4">
										<label className="block text-sm font-medium text-slate-700 mb-2">
											Duração do jogo
										</label>
										<div className="grid grid-cols-2 gap-2">
											<button
												type="button"
												onClick={() => setBookingDuration(60)}
												disabled={isReserving}
												aria-pressed={bookingDuration === 60}
												className={`py-2.5 px-4 rounded-lg border font-medium transition-all ${
													bookingDuration === 60 ?
														"border-emerald-600 bg-emerald-50 text-emerald-700"
													:	"border-slate-200 bg-white text-slate-700 hover:border-slate-300"
												} disabled:opacity-50`}>
												1 hora
											</button>
											<button
												type="button"
												onClick={() => setBookingDuration(90)}
												disabled={isReserving}
												aria-pressed={bookingDuration === 90}
												className={`py-2.5 px-4 rounded-lg border font-medium transition-all ${
													bookingDuration === 90 ?
														"border-emerald-600 bg-emerald-50 text-emerald-700"
													:	"border-slate-200 bg-white text-slate-700 hover:border-slate-300"
												} disabled:opacity-50`}>
												1h30
											</button>
										</div>
									</div>

									{/* Formulário de Dados do Jogador */}
									<div className="space-y-3 mb-4">
										<div>
											<label
												htmlFor="booking-player-name"
												className="block text-sm font-medium text-slate-700 mb-1">
												Seu nome
											</label>
											<input
												id="booking-player-name"
												data-testid="booking-player-name"
												type="text"
												value={playerName}
												onChange={(e) => setPlayerName(e.target.value)}
												placeholder="Ex: João"
												className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 text-slate-950 font-medium placeholder:text-slate-400"
												disabled={isReserving}
												maxLength={50}
											/>
										</div>
										<div>
											<label
												htmlFor="booking-player-phone"
												className="block text-sm font-medium text-slate-700 mb-1">
												Seu telefone (WhatsApp)
											</label>
											<input
												id="booking-player-phone"
												data-testid="booking-player-phone"
												type="tel"
												value={playerPhone}
												onChange={(e) => {
													const formatted = formatPhoneInput(e.target.value);
													setPlayerPhone(formatted);
												}}
												placeholder="(11) 99988-7766"
												className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 text-slate-950 font-medium placeholder:text-slate-400"
												disabled={isReserving}
												maxLength={15}
											/>
										</div>
									</div>

									{/* Opção 1: Pagar no Balcão (Principal) */}
									<button
										onClick={handleDirectBooking}
										disabled={isReserving}
										className="w-full bg-slate-950 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
										{isReserving ?
											<>
												<Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
												<span className="text-sm sm:text-base">
													Confirmando...
												</span>
											</>
										:	<>
												<Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
												<span className="text-sm sm:text-base">
													Reservar e Pagar no Balcão
												</span>
											</>
										}
									</button>

									<p className="text-xs text-slate-500 text-center">
										Você paga quando chegar • R${" "}
										{calculatePrice(
											selectedSlot.slot.price,
											selectedSlot.halfHourPrice,
											bookingDuration,
										).toFixed(2)}
										{bookingDuration === 90 &&
											selectedSlot.halfHourPrice &&
											` (${selectedSlot.slot.price.toFixed(2)} + ${selectedSlot.halfHourPrice.toFixed(2)})`}
									</p>

									{/* Divider */}
									<div className="relative my-4">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-slate-200"></div>
										</div>
										<div className="relative flex justify-center text-xs uppercase">
											<span className="bg-white px-2 text-slate-400 font-medium">
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
												<p className="text-xs text-gray-300">
													Garante + enviar comprovante
												</p>
											</div>
											<span className="font-bold text-green-600 text-lg">
												R${" "}
												{(configs.deposit_type === "fixed" ?
													configs.deposit_value
												:	calculatePrice(
														selectedSlot.slot.price,
														selectedSlot.halfHourPrice,
														bookingDuration,
													) *
													(configs.deposit_value / 100)
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
												<p className="text-xs text-gray-300">
													Desconto + enviar comprovante
												</p>
											</div>
											<div className="text-right">
												<p className="text-xs text-gray-300 line-through">
													R${" "}
													{calculatePrice(
														selectedSlot.slot.price,
														selectedSlot.halfHourPrice,
														bookingDuration,
													).toFixed(2)}
												</p>
												<span className="font-bold text-primary text-lg">
													R${" "}
													{(
														calculatePrice(
															selectedSlot.slot.price,
															selectedSlot.halfHourPrice,
															bookingDuration,
														) *
														(1 - configs.full_payment_discount_percent / 100)
													).toFixed(2)}
												</span>
											</div>
										</button>
									)}

									{/* Opção 4: Padrão (sem sinal nem desconto) - enviar comprovante via WhatsApp */}
									{!configs.require_deposit &&
										!configs.enable_full_payment_discount && (
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
									setShowBookingModal(false);
									if (reserveSuccess) {
										setSelectedSlot(null);
										setPlayerName("");
										setPlayerPhone("");
									}
								}}
								className="text-sm text-gray-300 hover:text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-200/50 transition-colors">
								{reserveSuccess ? "Fechar" : "Cancelar"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Skeleton Simples
// Skeleton Premium Mobile-First
function PublicSkeleton() {
	return (
		<div className="bg-gray-50 pb-12 font-sans">
			{/* Header Skeleton */}
			<div className="relative h-64 md:h-80 bg-gray-200 animate-pulse">
				<div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
				<div className="absolute bottom-0 left-0 w-full p-6 pb-20 md:pb-24">
					<div className="max-w-4xl mx-auto space-y-4">
						<Skeleton className="h-6 w-24 bg-white/20 rounded-full" />
						<Skeleton className="h-10 w-3/4 bg-white/30 rounded-lg" />
						<div className="flex gap-2">
							<Skeleton className="h-4 w-1/3 bg-white/20 rounded" />
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 -mt-16 md:-mt-20 relative z-20 space-y-6">
				{/* Calendar Strip Skeleton */}
				<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-6">
					<div className="flex gap-3 overflow-hidden">
						{[...Array(6)].map((_, i) => (
							<Skeleton
								key={i}
								className="flex-shrink-0 w-16 h-20 rounded-xl bg-gray-100"
							/>
						))}
					</div>
				</div>

				{/* Courts Skeleton */}
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
						<div className="p-4 border-b border-slate-100 flex justify-between items-center">
							<div className="flex items-center gap-3">
								<Skeleton className="w-10 h-10 rounded-full bg-gray-100" />
								<div className="space-y-2">
									<Skeleton className="h-5 w-32 bg-gray-100 rounded" />
									<Skeleton className="h-3 w-20 bg-gray-50 rounded" />
								</div>
							</div>
						</div>
						<div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
							{[...Array(6)].map((_, j) => (
								<Skeleton
									key={j}
									className="h-[72px] rounded-lg bg-slate-50 border border-transparent"
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

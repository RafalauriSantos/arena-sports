/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	useMemo,
	ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { TimeSlot, Booking } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";
import { normalizeCustomerPhone, isValidCustomerPhone } from "@/lib/phone";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatLocalDate = (date: Date) =>
	`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatLocalTime = (date: Date) =>
	`${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

// Interface para tipar o retorno cru do Supabase (Database Layer)
interface CourtDB {
	id: string;
	name: string;
	base_price: number;
	tenant_id: string;
	active: boolean;
}

interface BookingDB {
	id: string;
	tenant_id: string;
	court_id: string;
	customer_name: string;
	customer_phone: string;
	start_time: string;
	end_time: string;
	total_price: number;
	paid_amount?: number;
	deposit_percent?: number;
	status: string;
	created_at: string;
	started_at?: string | null;
	completed_at?: string | null;
	cancelled_at?: string | null;
	court?: { name: string };
}

interface BookingsContextType {
	timeSlots: TimeSlot[];
	bookings: Booking[];
	loading: boolean;
	refreshData: () => Promise<void>;
	addBooking: (booking: Partial<Booking>) => Promise<void>;
	updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
	deleteBooking: (id: string) => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(
	undefined
);

// Configurações
const OPENING_HOUR = 7;
const CLOSING_HOUR = 23;

export function BookingsProvider({ children }: { children: ReactNode }) {
	const { tenantId } = useAuth();
	const { toast } = useToast();
	const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
	const refreshTimerRef = useRef<number | null>(null);
	const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

	const isBookingOverlapError = (err: unknown) => {
		const code = getStringProp(err, "code");
		const message = getStringProp(err, "message") ?? "";
		return (
			code === "23P01" ||
			/code\s*23P01/i.test(message) ||
			/exclusion constraint/i.test(message) ||
			/bookings_no_overlap_active/i.test(message)
		);
	};

	const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [courts, setCourts] = useState<CourtDB[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	// 1. FUNÇÃO MESTRA DE BUSCA (Core Logic)
	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			// A. Resolução do Tenant ID (Fail-safe)
			let currentTenantId = tenantId;

			if (!currentTenantId) {
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (user) {
					const { data: profile } = await supabase
						.from("profiles")
						.select("tenant_id")
						.eq("id", user.id)
						.single();
					currentTenantId = profile?.tenant_id;
				}
			}

			if (!currentTenantId) {
				setLoading(false);
				return;
			}

			// B. Busca Paralela (Alta Performance)
			const [courtsRes, bookingsRes] = await Promise.all([
				supabase
					.from("courts")
					.select("*")
					.eq("tenant_id", currentTenantId)
					.eq("active", true),
				supabase
					.from("bookings")
					.select("*, court:courts(name)")
					.eq("tenant_id", currentTenantId),
			]);

			if (courtsRes.error) throw courtsRes.error;
			if (bookingsRes.error) throw bookingsRes.error;

			const fetchedCourts = (courtsRes.data as CourtDB[]) || [];
			const fetchedBookingsRaw =
				(bookingsRes.data as unknown as BookingDB[]) || [];

			// C. Mapeamento (Data Transformation Layer)
			const mappedBookings: Booking[] = fetchedBookingsRaw.map((b) => {
				const startTime = new Date(b.start_time);
				const endTime = new Date(b.end_time);

			return {
				id: b.id,
				tenantId: b.tenant_id,
				slotId: b.id,
				fieldId: b.court_id,
				fieldName: b.court?.name || "Quadra",
				customerName: b.customer_name,
				customerPhone: b.customer_phone,
				// IMPORTANTE: `start_time` vem em ISO (UTC). Para exibir corretamente
				// no Brasil, formatamos a data/hora a partir do Date (timezone local).
				date: formatLocalDate(startTime),
				time: formatLocalTime(startTime),
				startTime,
				endTime,
				totalPrice: b.total_price,
				paidAmount: typeof b.paid_amount === "number" ? b.paid_amount : 0,
				depositPercent:
					typeof b.deposit_percent === "number"
						? b.deposit_percent
						: undefined,
				paymentStatus: b.status === "paid" ? "paid" : "pending",
				status: b.status === "paid" ? "confirmed" : "pending_approval",
				bookedBy: b.customer_name,
				players: [b.customer_name],
				createdAt: b.created_at,
				startedAt: b.started_at,
				completedAt: b.completed_at,
				cancelledAt: b.cancelled_at,
			};
			});

			setCourts(fetchedCourts);
			setBookings(mappedBookings);

			// D. Geração Otimizada de Slots (Algoritmo O(n))
			const generatedSlots: TimeSlot[] = [];
			const today = formatLocalDate(new Date());

			// CRÍTICO: Cria um Hash Set para lookup O(1).
			// Evita o problema de performance do .find() dentro do loop.
			const bookingLookup = new Set(
				mappedBookings.map((b) => `${b.fieldId}-${b.date}-${b.time}`)
			);

			fetchedCourts.forEach((court) => {
				for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour++) {
					const timeString = `${hour.toString().padStart(2, "0")}:00`;
					const lookupKey = `${court.id}-${today}-${timeString}`;

					// Verificação instantânea
					const isReserved = bookingLookup.has(lookupKey);

					// Recupera dados do booking se existir (apenas para display)
					const existingBooking = isReserved
						? mappedBookings.find(
								(b) =>
									b.fieldId === court.id &&
									b.time === timeString &&
									b.date === today
						  )
						: undefined;

					generatedSlots.push({
						id: lookupKey,
						fieldId: court.id,
						date: today,
						time: timeString,
						status: isReserved ? "reserved" : "available",
						pricePerPlayer: court.base_price, // <--- CORRIGIDO AQUI
						courtName: court.name,
						bookedBy: existingBooking?.customerName,
					});
				}
			});

			setTimeSlots(generatedSlots);
		} catch (error) {
			console.error("Erro ao carregar dados:", error);
			toast({
				title: "Erro de conexão",
				description: "Falha ao sincronizar com o servidor.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenantId, toast]);

	const resolveTenantId = useCallback(async () => {
		if (tenantId) return tenantId;

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return null;

		const { data: profile } = await supabase
			.from("profiles")
			.select("tenant_id")
			.eq("id", user.id)
			.single();

		return profile?.tenant_id ?? null;
	}, [tenantId]);

	// Carrega dados iniciais
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Atualiza ref sempre que fetchData mudar (para usar no real-time)
	useEffect(() => {
		fetchDataRef.current = fetchData;
	}, [fetchData]);

	// REMOVIDO: Polling periódico estava causando re-renders constantes
	// O real-time já cobre as atualizações instantâneas
	// Se necessário, podemos adicionar um polling mais espaçado (ex: 60s) apenas como fallback

		// Realtime (profissional): 1 canal por tenant, filtro por tenant_id,
		// e refresh com debounce (evita refetch em cascata).
		useEffect(() => {
			let isMounted = true;

			const scheduleRefresh = () => {
				if (!isMounted) return;
				if (refreshTimerRef.current) {
					window.clearTimeout(refreshTimerRef.current);
				}
				// Debounce de 300ms para UPDATE/DELETE
				refreshTimerRef.current = window.setTimeout(() => {
					if (isMounted) {
						fetchDataRef.current(); // Usa ref para garantir função atualizada
					}
				}, 300);
			};

		const setup = async () => {
			const currentTenantId = await resolveTenantId();
			if (!isMounted || !currentTenantId) {
				// Silencioso - é normal em desenvolvimento (StrictMode executa 2x)
				return;
			}

			// Log apenas na primeira conexão
			console.log("📡 [REALTIME] Conectando canal para tenant:", currentTenantId);

			// Se já existe canal (troca de tenant, hot reload), remove antes.
			if (realtimeChannelRef.current) {
				supabase.removeChannel(realtimeChannelRef.current);
				realtimeChannelRef.current = null;
			}

			// Canal com nome estável (sem timestamp) para melhor reconexão
			const channelName = `bookings-ctx-${currentTenantId}`;
			
			const channel = supabase
				.channel(channelName, {
					config: {
						// Configurações otimizadas para real-time
						broadcast: { self: false },
						presence: { key: '' }
					}
				})
				.on(
					"postgres_changes",
					{
						event: "*", // INSERT, UPDATE, DELETE
						schema: "public",
						table: "bookings",
						// IMPORTANTE: Filtro no formato correto do Supabase
						filter: `tenant_id=eq.${currentTenantId}`,
					},
					(payload) => {
						// Log apenas para INSERT (nova reserva) para evitar poluição
						if (payload.eventType === 'INSERT') {
							console.log("🔥 [REALTIME] Nova reserva detectada:", {
								id: payload.new?.id,
								customer: payload.new?.customer_name,
								time: payload.new?.start_time
							});
						}
						
						// Verifica se o tenant_id do evento corresponde ao tenant atual
						const eventTenantId = payload.new?.tenant_id || payload.old?.tenant_id;
						if (eventTenantId !== currentTenantId) {
							console.warn("⚠️ [REALTIME] Evento de tenant diferente ignorado:", {
								eventTenantId,
								currentTenantId
							});
							return;
						}
						
						// Força refresh IMEDIATO para INSERT (nova reserva) - sem debounce
						if (payload.eventType === 'INSERT') {
							// Cancela qualquer refresh pendente
							if (refreshTimerRef.current) {
								window.clearTimeout(refreshTimerRef.current);
								refreshTimerRef.current = null;
							}
							
							// Refresh IMEDIATO sem debounce para nova reserva
							if (isMounted) {
								// Usa setTimeout(0) para garantir que está fora do callback do real-time
								setTimeout(() => {
									if (isMounted) {
										fetchDataRef.current().catch((err) => {
											console.error("❌ [REALTIME] Erro ao recarregar:", err);
										});
									}
								}, 0);
							}
						} else {
							// UPDATE/DELETE com debounce (não é crítico)
							scheduleRefresh();
						}
					}
				)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "courts",
						filter: `tenant_id=eq.${currentTenantId}`,
					},
					(payload) => {
						// Court alterado - atualiza com debounce
						scheduleRefresh();
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log("✅ [REALTIME] Conectado! Escutando eventos de bookings e courts");
					} else if (status === 'CHANNEL_ERROR') {
						console.error("❌ [REALTIME] Erro na conexão:", err);
					} else if (status === 'TIMED_OUT' || status === 'CLOSED') {
						console.warn("⚠️ [REALTIME] Conexão perdida. Status:", status);
					}
				});

			realtimeChannelRef.current = channel;
		};

		setup();

		return () => {
			isMounted = false;
			if (refreshTimerRef.current) {
				window.clearTimeout(refreshTimerRef.current);
				refreshTimerRef.current = null;
			}
			if (realtimeChannelRef.current) {
				supabase.removeChannel(realtimeChannelRef.current);
				realtimeChannelRef.current = null;
			}
		};
	}, [resolveTenantId, fetchData]);

	// 2. ADICIONAR RESERVA (Write Operation)
	const addBooking = async (booking: Partial<Booking>) => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Usuário não autenticado");

			// Garante tenant_id atualizado
			const { data: profile } = await supabase
				.from("profiles")
				.select("tenant_id")
				.eq("id", user.id)
				.single();

			if (!profile?.tenant_id) throw new Error("Empresa não encontrada");

			// Construção Segura de Datas ISO
			const startISO = `${booking.date}T${booking.time}:00`;
			const startDateObj = new Date(startISO);
			const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000); // +1 hora

			const customerPhone = normalizeCustomerPhone(booking.customerPhone || "");
			if (!customerPhone) {
				throw new Error("Telefone é obrigatório para criar a reserva.");
			}
			if (!isValidCustomerPhone(customerPhone)) {
				throw new Error(
					"Telefone inválido (use DDD + número: 10 ou 11 dígitos)."
				);
			}

			const payload = {
				tenant_id: profile.tenant_id,
				court_id: booking.fieldId,
				customer_name: booking.customerName || "Cliente",
				customer_phone: customerPhone,
				start_time: startDateObj.toISOString(),
				end_time: endDateObj.toISOString(),
				total_price: booking.totalPrice || 0,
				status: booking.paymentStatus === "paid" ? "paid" : "pending",
			};

			const { error } = await supabase.from("bookings").insert(payload);

			if (error) throw error;

			await fetchData();
			toast({ title: "Agendamento criado com sucesso!" });
		} catch (error: unknown) {
			console.error(error);
			if (isBookingOverlapError(error)) {
				toast({
					title: "Horário indisponível",
					description:
						"Já existe uma reserva para esta quadra nesse horário. Escolha outro horário.",
					variant: "destructive",
				});
				return;
			}
			const message =
				getStringProp(error, "message") ||
				"Verifique os dados e tente novamente.";
			toast({
				title: "Erro ao criar",
				description: message,
				variant: "destructive",
			});
		}
	};

	// 3. ATUALIZAR RESERVA
	const updateBooking = async (id: string, updates: Partial<Booking>) => {
		try {
			const payload: Record<string, unknown> = {};

			if (updates.customerName) payload.customer_name = updates.customerName;
			if (typeof updates.customerPhone === "string") {
				const customerPhone = normalizeCustomerPhone(updates.customerPhone);
				if (!customerPhone) {
					throw new Error("Telefone é obrigatório para a reserva.");
				}
				if (!isValidCustomerPhone(customerPhone)) {
					throw new Error(
						"Telefone inválido (use DDD + número: 10 ou 11 dígitos)."
					);
				}
				payload.customer_phone = customerPhone;
			}
			if (updates.paymentStatus) {
				payload.status = updates.paymentStatus === "paid" ? "paid" : "pending";
				// When marking as paid, also set paid_amount to total_price
				if (updates.paymentStatus === "paid") {
					const existing = bookings.find((b) => b.id === id);
					if (existing?.totalPrice != null) {
						payload.paid_amount = existing.totalPrice;
						payload.deposit_percent = null;
					}
				}
			}
			if (typeof updates.paidAmount === "number") {
				payload.paid_amount = updates.paidAmount;
			}
			if (typeof updates.depositPercent === "number") {
				payload.deposit_percent = updates.depositPercent;
			}

			const { error } = await supabase
				.from("bookings")
				.update(payload)
				.eq("id", id);

			if (error) throw error;

			await fetchData();
			toast({ title: "Agendamento atualizado" });
		} catch (error) {
			console.error(error);
			toast({ title: "Erro ao atualizar", variant: "destructive" });
		}
	};

	// 4. DELETAR RESERVA
	const deleteBooking = async (id: string) => {
		try {
			const { error } = await supabase.from("bookings").delete().eq("id", id);

			if (error) throw error;

			await fetchData();
			toast({ title: "Agendamento removido" });
		} catch (error) {
			console.error(error);
			toast({ title: "Erro ao remover", variant: "destructive" });
		}
	};

	// Memoiza o valor do contexto para evitar re-renders desnecessários
	// Apenas bookings, timeSlots e loading como dependências (dados)
	// As funções são estáveis (useCallback), então não precisam estar nas dependências
	const contextValue = useMemo(() => {
		return {
			timeSlots,
			bookings,
			loading,
			refreshData: fetchData,
			addBooking,
			updateBooking,
			deleteBooking,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeSlots, bookings, loading]); // Apenas dados, não funções

	return (
		<BookingsContext.Provider value={contextValue}>
			{children}
		</BookingsContext.Provider>
	);
}

export const useBookings = () => {
	const context = useContext(BookingsContext);
	if (!context) {
		throw new Error("useBookings must be used within BookingsProvider");
	}
	return context;
};

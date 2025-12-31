/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { TimeSlot, Booking } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";

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
	status: string;
	created_at: string;
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

	const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
	const [bookings, setBookings] = useState<Booking[]>([]);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
			const mappedBookings: Booking[] = fetchedBookingsRaw.map((b) => ({
				id: b.id,
				tenantId: b.tenant_id,
				slotId: b.id,
				fieldId: b.court_id,
				fieldName: b.court?.name || "Quadra",
				customerName: b.customer_name,
				customerPhone: b.customer_phone,
				date: b.start_time.split("T")[0],
				time: b.start_time.split("T")[1].substring(0, 5), // HH:mm
				startTime: new Date(b.start_time),
				endTime: new Date(b.end_time),
				totalPrice: b.total_price,
				paymentStatus: b.status === "paid" ? "paid" : "pending",
				status: b.status === "paid" ? "confirmed" : "pending_approval",
				bookedBy: b.customer_name,
				players: [b.customer_name],
				createdAt: b.created_at,
			}));

			setCourts(fetchedCourts);
			setBookings(mappedBookings);

			// D. Geração Otimizada de Slots (Algoritmo O(n))
			const generatedSlots: TimeSlot[] = [];
			const today = new Date().toISOString().split("T")[0];

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

	useEffect(() => {
		fetchData();
	}, [fetchData]);

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

			const payload = {
				tenant_id: profile.tenant_id,
				court_id: booking.fieldId,
				customer_name: booking.customerName || "Cliente",
				customer_phone: booking.customerPhone,
				start_time: startDateObj.toISOString(),
				end_time: endDateObj.toISOString(),
				total_price: booking.totalPrice || 0,
				status: booking.paymentStatus === "paid" ? "paid" : "pending",
			};

			const { error } = await supabase.from("bookings").insert(payload);

			if (error) throw error;

			await fetchData();
			toast({ title: "Agendamento criado com sucesso!" });
		} catch (error: any) {
			console.error(error);
			toast({
				title: "Erro ao criar",
				description: error.message || "Verifique os dados e tente novamente.",
				variant: "destructive",
			});
		}
	};

	// 3. ATUALIZAR RESERVA
	const updateBooking = async (id: string, updates: Partial<Booking>) => {
		try {
			const payload: Record<string, any> = {};

			if (updates.customerName) payload.customer_name = updates.customerName;
			if (updates.customerPhone) payload.customer_phone = updates.customerPhone;
			if (updates.paymentStatus) {
				payload.status = updates.paymentStatus === "paid" ? "paid" : "pending";
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

	return (
		<BookingsContext.Provider
			value={{
				timeSlots,
				bookings,
				loading,
				refreshData: fetchData,
				addBooking,
				updateBooking,
				deleteBooking,
			}}>
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

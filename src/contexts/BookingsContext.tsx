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
import { TimeSlot, Booking, PaymentStatus } from "@/types/booking";

interface BookingsContextType {
	timeSlots: TimeSlot[];
	bookings: Booking[];
	loading: boolean;
	updateTimeSlot: (slotId: string, updates: Partial<TimeSlot>) => Promise<void>;
	addBooking: (booking: Booking) => Promise<void>;
	updateBooking: (
		bookingId: string,
		updates: Partial<Booking>
	) => Promise<void>;
	deleteBooking: (bookingId: string) => Promise<void>;
	blockTimeSlot: (slotId: string, reason: string) => Promise<void>;
	refreshData: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | undefined>(
	undefined
);

const toDateString = (value?: string | null) => {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

const toTimeString = (value?: string | null) => {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(11, 16);
};

const combineDateTime = (date?: string | null, time?: string | null) => {
	if (!date || !time) return undefined;
	const dt = new Date(`${date}T${time}:00`);
	return Number.isNaN(dt.getTime()) ? undefined : dt;
};

const generateFallbackSlots = (): TimeSlot[] => [];

export function BookingsProvider({ children }: { children: ReactNode }) {
	const { tenantId } = useAuth();
	const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	const fetchData = useCallback(async () => {
		if (!tenantId) {
			setTimeSlots([]);
			setBookings([]);
			setLoading(false);
			return;
		}

		setLoading(true);

		try {
			const [slotsRes, bookingsRes] = await Promise.all([
				supabase
					.from("arena_time_slots")
					.select("id, tenant_id, date, time, field_id, status, price_override")
					.eq("tenant_id", tenantId),
				supabase
					.from("arena_reservations")
					.select(
						"id, tenant_id, customer_name, customer_phone, court_name, start_time, end_time, total_price, payment_status, slot_id"
					)
					.eq("tenant_id", tenantId),
			]);

			const mappedSlots: TimeSlot[] = (slotsRes.data ?? []).map((s) => {
				const start = combineDateTime(
					s.date as string | null,
					s.time as string | null
				);
				const end = start
					? new Date(start.getTime() + 60 * 60 * 1000)
					: undefined;
				return {
					id: String(s.id),
					tenantId: s.tenant_id ? String(s.tenant_id) : undefined,
					status: (s.status as TimeSlot["status"]) ?? "available",
					courtName: null,
					fieldId: (s.field_id as string | null) ?? null,
					date: (s.date as string | undefined) ?? "",
					time: (s.time as string | undefined) ?? "",
					startTime: start,
					endTime: end,
					pricePerPlayer: (s as { price_override?: number }).price_override,
				};
			});

			const slotMap = new Map<string, TimeSlot>();
			mappedSlots.forEach((slot) => slotMap.set(slot.id, slot));

			const mappedBookings: Booking[] = (bookingsRes.data ?? []).map((b) => {
				const start = b.start_time
					? new Date(b.start_time)
					: combineDateTime(
							slotMap.get(String(b.slot_id))?.date,
							slotMap.get(String(b.slot_id))?.time
					  );
				const end = b.end_time
					? new Date(b.end_time)
					: start
					? new Date(start.getTime() + 60 * 60 * 1000)
					: undefined;
				const slot = b.slot_id ? slotMap.get(String(b.slot_id)) : undefined;
				const paymentStatus =
					(b.payment_status as PaymentStatus | null) ?? null;

				return {
					id: String(b.id),
					slotId: b.slot_id ? String(b.slot_id) : "",
					tenantId: String(b.tenant_id),
					customerName: b.customer_name ?? "",
					customerPhone: b.customer_phone ?? null,
					courtName: b.court_name ?? null,
					startTime: start,
					endTime: end,
					totalPrice: b.total_price ?? null,
					paymentStatus,
					fieldId: slot?.fieldId ?? null,
					fieldName: slot?.courtName ?? b.court_name ?? null,
					date: slot?.date ?? toDateString(b.start_time),
					time: slot?.time ?? toTimeString(b.start_time),
					status: paymentStatus === "paid" ? "confirmed" : "pending_approval",
					bookedBy: b.customer_name ?? undefined,
					players: b.customer_name ? [b.customer_name] : [],
					createdAt: start?.toISOString(),
				};
			});

			setTimeSlots(mappedSlots);
			setBookings(mappedBookings);
		} catch (error) {
			console.error("Erro ao carregar dados de agendamentos", error);
			setTimeSlots(generateFallbackSlots());
			setBookings([]);
		} finally {
			setLoading(false);
		}
	}, [tenantId]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const updateTimeSlot = async (slotId: string, updates: Partial<TimeSlot>) => {
		if (!tenantId) return;
		const payload: Record<string, unknown> = {};

		if (updates.status) payload.status = updates.status;
		if (updates.fieldId) payload.field_id = updates.fieldId;
		if (updates.date) payload.date = updates.date;
		if (updates.time) payload.time = updates.time;

		await supabase
			.from("arena_time_slots")
			.update(payload)
			.eq("id", slotId)
			.eq("tenant_id", tenantId);
		await fetchData();
	};

	const addBooking = async (booking: Booking) => {
		if (!tenantId) return;

		const startISO = booking.startTime
			? booking.startTime.toISOString()
			: booking.date && booking.time
			? new Date(`${booking.date}T${booking.time}:00`).toISOString()
			: new Date().toISOString();
		const endISO = booking.endTime
			? booking.endTime.toISOString()
			: booking.date && booking.time
			? new Date(`${booking.date}T${booking.time}:00`).toISOString()
			: new Date().toISOString();

		await supabase.from("arena_reservations").insert([
			{
				id: booking.id,
				tenant_id: tenantId,
				customer_name: booking.customerName,
				customer_phone: booking.customerPhone,
				court_name: booking.courtName,
				start_time: startISO,
				end_time: endISO,
				total_price: booking.totalPrice,
				payment_status: booking.paymentStatus,
				slot_id: booking.slotId,
			},
		]);
		await fetchData();
	};

	const updateBooking = async (
		bookingId: string,
		updates: Partial<Booking>
	) => {
		if (!tenantId) return;

		const payload: Record<string, unknown> = {
			customer_name: updates.customerName,
			customer_phone: updates.customerPhone,
			court_name: updates.courtName,
			total_price: updates.totalPrice,
			payment_status: updates.paymentStatus,
		};

		if (updates.startTime) payload.start_time = updates.startTime.toISOString();
		if (updates.endTime) payload.end_time = updates.endTime.toISOString();

		await supabase
			.from("arena_reservations")
			.update(payload)
			.eq("id", bookingId)
			.eq("tenant_id", tenantId);
		await fetchData();
	};

	const deleteBooking = async (bookingId: string) => {
		if (!tenantId) return;
		await supabase
			.from("arena_reservations")
			.delete()
			.eq("id", bookingId)
			.eq("tenant_id", tenantId);
		await fetchData();
	};

	const blockTimeSlot = async (slotId: string, reason: string) => {
		if (!tenantId) return;
		await supabase
			.from("arena_time_slots")
			.update({ status: "reserved", court_name: reason })
			.eq("id", slotId)
			.eq("tenant_id", tenantId);
		await fetchData();
	};

	const refreshData = async () => {
		await fetchData();
	};

	return (
		<BookingsContext.Provider
			value={{
				timeSlots,
				bookings,
				loading,
				updateTimeSlot,
				addBooking,
				updateBooking,
				deleteBooking,
				blockTimeSlot,
				refreshData,
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

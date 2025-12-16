/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { TimeSlot, Booking } from "@/types/booking";
import { initialTimeSlots, initialBookings } from "@/data/mockData";

interface BookingsContextType {
	timeSlots: TimeSlot[];
	bookings: Booking[];
	updateTimeSlot: (slotId: string, updates: Partial<TimeSlot>) => void;
	addBooking: (booking: Booking) => void;
	updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
	deleteBooking: (bookingId: string) => void;
	blockTimeSlot: (slotId: string, reason: string) => void;
	refreshData: () => void;
}

const BookingsContext = createContext<BookingsContextType | undefined>(
	undefined
);

const STORAGE_KEYS = {
	SLOTS: "arena_time_slots",
	BOOKINGS: "arena_bookings",
};

export function BookingsProvider({ children }: { children: ReactNode }) {
	const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
		const stored = localStorage.getItem(STORAGE_KEYS.SLOTS);
		return stored ? JSON.parse(stored) : initialTimeSlots;
	});

	const [bookings, setBookings] = useState<Booking[]>(() => {
		const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
		return stored ? JSON.parse(stored) : initialBookings;
	});

	// Persist to localStorage whenever data changes
	useEffect(() => {
		localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(timeSlots));
	}, [timeSlots]);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
	}, [bookings]);

	// Listen for changes from OTHER tabs/windows (storage event)
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === STORAGE_KEYS.SLOTS && e.newValue) {
				setTimeSlots(JSON.parse(e.newValue));
			}
			if (e.key === STORAGE_KEYS.BOOKINGS && e.newValue) {
				setBookings(JSON.parse(e.newValue));
			}
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	// Poll localStorage periodically for same-tab updates (more reliable)
	useEffect(() => {
		const interval = setInterval(() => {
			const storedSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
			const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

			if (storedSlots) {
				const parsedSlots = JSON.parse(storedSlots);
				// Only update if data actually changed
				if (JSON.stringify(parsedSlots) !== JSON.stringify(timeSlots)) {
					setTimeSlots(parsedSlots);
				}
			}

			if (storedBookings) {
				const parsedBookings = JSON.parse(storedBookings);
				// Only update if data actually changed
				if (JSON.stringify(parsedBookings) !== JSON.stringify(bookings)) {
					setBookings(parsedBookings);
				}
			}
		}, 1000); // Check every second

		return () => clearInterval(interval);
	}, [timeSlots, bookings]);

	const updateTimeSlot = (slotId: string, updates: Partial<TimeSlot>) => {
		setTimeSlots((prev) =>
			prev.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))
		);
	};

	const addBooking = (booking: Booking) => {
		setBookings((prev) => [...prev, booking]);
	};

	const updateBooking = (bookingId: string, updates: Partial<Booking>) => {
		setBookings((prev) =>
			prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
		);
	};

	const deleteBooking = (bookingId: string) => {
		const booking = bookings.find((b) => b.id === bookingId);
		if (booking) {
			// Free up the time slot
			updateTimeSlot(booking.slotId, {
				status: "available",
				bookedBy: undefined,
				paymentType: undefined,
			});
		}
		setBookings((prev) => prev.filter((b) => b.id !== bookingId));
	};

	const blockTimeSlot = (slotId: string, reason: string) => {
		updateTimeSlot(slotId, {
			status: "reserved",
			bookedBy: `🔒 ${reason}`,
		});
	};

	const refreshData = () => {
		const storedSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
		const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

		if (storedSlots) setTimeSlots(JSON.parse(storedSlots));
		if (storedBookings) setBookings(JSON.parse(storedBookings));
	};

	return (
		<BookingsContext.Provider
			value={{
				timeSlots,
				bookings,
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

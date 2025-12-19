/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useMemo,
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

	// Optimized: Use refs to avoid JSON.stringify in dependencies
	// Poll localStorage periodically for same-tab updates (more reliable)
	// Reduced frequency from 1s to 3s and removed expensive JSON.stringify comparison
	useEffect(() => {
		let lastSlotsHash = "";
		let lastBookingsHash = "";

		const interval = setInterval(() => {
			const storedSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
			const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

			if (storedSlots) {
				// Simple hash check instead of full JSON.stringify
				const slotsHash = storedSlots.slice(0, 100) + storedSlots.length;
				if (slotsHash !== lastSlotsHash) {
					try {
						const parsedSlots = JSON.parse(storedSlots);
						setTimeSlots(parsedSlots);
						lastSlotsHash = slotsHash;
					} catch (e) {
						console.error("Error parsing slots from localStorage:", e);
					}
				}
			}

			if (storedBookings) {
				// Simple hash check instead of full JSON.stringify
				const bookingsHash = storedBookings.slice(0, 100) + storedBookings.length;
				if (bookingsHash !== lastBookingsHash) {
					try {
						const parsedBookings = JSON.parse(storedBookings);
						setBookings(parsedBookings);
						lastBookingsHash = bookingsHash;
					} catch (e) {
						console.error("Error parsing bookings from localStorage:", e);
					}
				}
			}
		}, 3000); // Reduced from 1s to 3s - still responsive but less CPU intensive

		return () => clearInterval(interval);
	}, []); // Empty deps - using refs internally

	// Memoized callbacks to prevent unnecessary re-renders
	const updateTimeSlot = useCallback((slotId: string, updates: Partial<TimeSlot>) => {
		setTimeSlots((prev) =>
			prev.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))
		);
	}, []);

	const addBooking = useCallback((booking: Booking) => {
		setBookings((prev) => [...prev, booking]);
	}, []);

	const updateBooking = useCallback((bookingId: string, updates: Partial<Booking>) => {
		setBookings((prev) =>
			prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
		);
	}, []);

	const deleteBooking = useCallback((bookingId: string) => {
		setBookings((prev) => {
			const booking = prev.find((b) => b.id === bookingId);
			if (booking) {
				// Free up the time slot
				setTimeSlots((currentSlots) =>
					currentSlots.map((slot) =>
						slot.id === booking.slotId
							? {
									...slot,
									status: "available" as const,
									bookedBy: undefined,
									paymentType: undefined,
								}
							: slot
					)
				);
			}
			return prev.filter((b) => b.id !== bookingId);
		});
	}, []);

	const blockTimeSlot = useCallback((slotId: string, reason: string) => {
		updateTimeSlot(slotId, {
			status: "reserved",
			bookedBy: `🔒 ${reason}`,
		});
	}, [updateTimeSlot]);

	const refreshData = useCallback(() => {
		const storedSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
		const storedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

		if (storedSlots) {
			try {
				setTimeSlots(JSON.parse(storedSlots));
			} catch (e) {
				console.error("Error parsing slots:", e);
			}
		}
		if (storedBookings) {
			try {
				setBookings(JSON.parse(storedBookings));
			} catch (e) {
				console.error("Error parsing bookings:", e);
			}
		}
	}, []);

	// Memoize context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			timeSlots,
			bookings,
			updateTimeSlot,
			addBooking,
			updateBooking,
			deleteBooking,
			blockTimeSlot,
			refreshData,
		}),
		[timeSlots, bookings, updateTimeSlot, addBooking, updateBooking, deleteBooking, blockTimeSlot, refreshData]
	);

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

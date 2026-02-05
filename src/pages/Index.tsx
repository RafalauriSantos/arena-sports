import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/Header";
import { FieldSelector } from "@/components/FieldSelector";
import { DateStrip } from "@/components/DateStrip";
import { DateSection } from "@/components/DateSection";
import { BottomNav } from "@/components/BottomNav";
import { LoginScreen } from "@/components/LoginScreen";
import { MensalistaCard } from "@/components/MensalistaCard";
import { TimeSlot, Booking, PaymentType } from "@/types/booking";
import { FieldId } from "@/config/arena";
import { ARENA_CONFIG } from "@/config/arena";
import { useBookings } from "@/contexts/BookingsContext";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy components that are conditionally rendered
const PaymentDrawer = lazy(() =>
	import("@/components/PaymentDrawer").then((module) => ({
		default: module.PaymentDrawer,
	})),
);
const SuccessScreen = lazy(() =>
	import("@/components/SuccessScreen").then((module) => ({
		default: module.SuccessScreen,
	})),
);
const BookingConfirmation = lazy(() =>
	import("@/components/BookingConfirmation").then((module) => ({
		default: module.BookingConfirmation,
	})),
);
const BookingHistory = lazy(() =>
	import("@/components/BookingHistory").then((module) => ({
		default: module.BookingHistory,
	})),
);

type View = "login" | "player" | "success" | "confirmation" | "history";

const Index = () => {
	const {
		timeSlots,
		bookings,
		updateTimeSlot,
		addBooking,
		updateBooking,
		deleteBooking,
	} = useBookings();
	const [activeView, setActiveView] = useState<View>("login");
	const [userPhone, setUserPhone] = useState<string>("");
	const [selectedField, setSelectedField] = useState<FieldId>("principal");
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
	const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const { toast } = useToast();

	const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

	const filteredSlots = useMemo(() => {
		return timeSlots.filter(
			(slot) => slot.fieldId === selectedField && slot.date === selectedDateStr,
		);
	}, [timeSlots, selectedField, selectedDateStr]);

	const userBookings = useMemo(
		() =>
			bookings.filter(
				(b) => b.bookedBy === userPhone || b.players.includes(userPhone),
			),
		[bookings, userPhone],
	);

	const displayDate = format(selectedDate, "EEEE, d 'de' MMMM", {
		locale: ptBR,
	});

	const handleLogin = useCallback(
		(phone: string) => {
			setUserPhone(phone);
			setActiveView("player");
			toast({
				title: "Bem-vindo!",
				description: "Escolha seu horário para jogar",
			});
		},
		[toast],
	);

	const handleSlotClick = useCallback((slot: TimeSlot) => {
		if (slot.status === "available") {
			setSelectedSlot(slot);
			setIsDrawerOpen(true);
		}
	}, []);

	const handleBookingConfirm = useCallback(
		(slot: TimeSlot, paymentType: PaymentType, name: string) => {
			const field = ARENA_CONFIG.fields.find((f) => f.id === slot.fieldId);
			if (!field) return;

			updateTimeSlot(slot.id, {
				status: paymentType === "pix" ? "reserved" : "pending",
				bookedBy: name,
				paymentType,
			});

			const newBooking: Booking = {
				id: `b${Date.now()}`,
				slotId: slot.id,
				fieldId: slot.fieldId,
				fieldName: field.name,
				date: slot.date,
				time: slot.time,
				paymentType,
				status: paymentType === "pix" ? "confirmed" : "pending_approval",
				bookedBy: name,
				players: [name],
				pricePerPlayer:
					(paymentType === "pix" ? field.priceOnline : field.priceLocal) /
					field.players,
				totalPlayers: field.players,
				createdAt: new Date().toISOString(),
			};

			addBooking(newBooking);
			setCurrentBooking(newBooking);
			setIsDrawerOpen(false);
			setActiveView("confirmation");

			toast({
				title:
					paymentType === "pix" ?
						"Reserva confirmada!"
					:	"Solicitação enviada!",
				description:
					paymentType === "pix" ?
						"Seu horário está garantido."
					:	"Aguardando aprovação do dono da arena.",
			});
		},
		[addBooking, toast, updateTimeSlot],
	);

	const handlePaymentSelection = useCallback(
		(slot: TimeSlot, paymentType: PaymentType, name: string) => {
			handleBookingConfirm(slot, paymentType, name);
		},
		[handleBookingConfirm],
	);

	const handleUpdatePlayers = useCallback(
		(players: string[]) => {
			if (!currentBooking) return;

			setCurrentBooking((prev) => (prev ? { ...prev, players } : null));
			updateBooking(currentBooking.id, { players });
		},
		[currentBooking, updateBooking],
	);

	const handleCancelBooking = useCallback(
		(bookingId: string) => {
			const booking = bookings.find((b) => b.id === bookingId);
			deleteBooking(bookingId);

			toast({
				title: "Reserva cancelada",
				description: `A reserva de ${booking?.bookedBy} foi cancelada.`,
			});
		},
		[bookings, deleteBooking, toast],
	);

	const handleBackFromSuccess = useCallback(() => {
		setActiveView("player");
		setCurrentBooking(null);
	}, []);

	const handleViewBookingFromHistory = useCallback((booking: Booking) => {
		setCurrentBooking(booking);
		setActiveView("success");
	}, []);

	// Login Screen
	if (activeView === "login") {
		return <LoginScreen onLogin={handleLogin} />;
	}

	// Confirmation Screen
	if (activeView === "confirmation" && currentBooking) {
		return (
			<Suspense
				fallback={
					<div className="min-h-screen bg-background flex items-center justify-center">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					</div>
				}>
				<BookingConfirmation
					booking={currentBooking}
					onContinue={() => setActiveView("success")}
					onBack={handleBackFromSuccess}
				/>
			</Suspense>
		);
	}

	// Success/Team Management Screen
	if (activeView === "success" && currentBooking) {
		return (
			<Suspense
				fallback={
					<div className="min-h-screen bg-background flex items-center justify-center">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					</div>
				}>
				<SuccessScreen
					booking={currentBooking}
					onBack={handleBackFromSuccess}
					onUpdatePlayers={handleUpdatePlayers}
				/>
			</Suspense>
		);
	}

	// Booking History Screen
	if (activeView === "history") {
		return (
			<Suspense
				fallback={
					<div className="min-h-screen bg-background flex items-center justify-center">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					</div>
				}>
				<BookingHistory
					bookings={userBookings}
					onBack={() => setActiveView("player")}
					onCancelBooking={handleCancelBooking}
					onViewBooking={handleViewBookingFromHistory}
				/>
			</Suspense>
		);
	}

	// Player Home
	return (
		<div className="min-h-screen bg-background pb-28 md:pb-24">
			<Header />

			<main className="container px-5 md:px-6 pt-6 pb-4 md:py-5 space-y-3 md:space-y-4">
				{/* Field Selector (Pills) */}
				<FieldSelector
					selectedField={selectedField}
					onFieldChange={setSelectedField}
				/>

				{/* Date Strip (Horizontal Scroll) */}
				<DateStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />

				{/* Mensalista Card (Premium) */}
				<MensalistaCard />

				{/* Schedule */}
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Horários Disponíveis
					</h2>

					<DateSection
						title={displayDate}
						slots={filteredSlots}
						onSlotClick={handleSlotClick}
					/>

					{filteredSlots.length === 0 && (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								Nenhum horário disponível para esta data.
							</p>
						</div>
					)}
				</div>
			</main>

			{/* Payment Drawer */}
			{isDrawerOpen && (
				<Suspense fallback={null}>
					<PaymentDrawer
						slot={selectedSlot}
						isOpen={isDrawerOpen}
						onClose={() => setIsDrawerOpen(false)}
						onConfirm={handlePaymentSelection}
					/>
				</Suspense>
			)}

			{/* Bottom Navigation */}
			<BottomNav
				activeView="player"
				onViewChange={(view) => setActiveView(view)}
			/>
		</div>
	);
};

export default Index;

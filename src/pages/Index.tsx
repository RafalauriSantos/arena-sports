import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { FieldSelector } from "@/components/FieldSelector";
import { DateSection } from "@/components/DateSection";
import { PaymentDrawer } from "@/components/PaymentDrawer";
import { SuccessScreen } from "@/components/SuccessScreen";
import { AdminDashboard } from "@/components/AdminDashboard";
import { BottomNav } from "@/components/BottomNav";
import { TimeSlot, Booking, PaymentType } from "@/types/booking";
import { FieldId } from "@/config/arena";
import { ARENA_CONFIG } from "@/config/arena";
import { 
  initialTimeSlots, 
  initialBookings, 
  todayStr, 
  tomorrowStr,
  todayDisplay,
  tomorrowDisplay
} from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type View = "player" | "admin" | "success";

const Index = () => {
  const [activeView, setActiveView] = useState<View>("player");
  const [selectedField, setSelectedField] = useState<FieldId>("principal");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();

  const filteredSlots = useMemo(() => {
    return timeSlots.filter(slot => slot.fieldId === selectedField);
  }, [timeSlots, selectedField]);

  const todaySlots = filteredSlots.filter(slot => slot.date === todayStr);
  const tomorrowSlots = filteredSlots.filter(slot => slot.date === tomorrowStr);

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsDrawerOpen(true);
  };

  const handleBookingConfirm = (slot: TimeSlot, paymentType: PaymentType, name: string) => {
    const field = ARENA_CONFIG.fields.find(f => f.id === slot.fieldId);
    if (!field) return;

    // Update slot status
    setTimeSlots(prev => prev.map(s => 
      s.id === slot.id 
        ? { ...s, status: paymentType === "pix" ? "reserved" : "pending", bookedBy: name, paymentType }
        : s
    ));

    // Create booking
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
      pricePerPlayer: (paymentType === "pix" ? field.priceOnline : field.priceLocal) / field.players,
      totalPlayers: field.players,
      createdAt: new Date().toISOString(),
    };

    setBookings(prev => [...prev, newBooking]);
    setCurrentBooking(newBooking);
    setIsDrawerOpen(false);
    setActiveView("success");

    toast({
      title: paymentType === "pix" ? "Reserva confirmada!" : "Solicitação enviada!",
      description: paymentType === "pix" 
        ? "Seu horário está garantido." 
        : "Aguardando aprovação do dono da arena.",
    });
  };

  const handleUpdatePlayers = (players: string[]) => {
    if (!currentBooking) return;
    
    setCurrentBooking(prev => prev ? { ...prev, players } : null);
    setBookings(prev => prev.map(b => 
      b.id === currentBooking.id ? { ...b, players } : b
    ));
  };

  const handleApproveBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: "approved" } : b
    ));

    setTimeSlots(prev => prev.map(s => 
      s.id === booking.slotId ? { ...s, status: "reserved" } : s
    ));

    toast({
      title: "Reserva aprovada!",
      description: `${booking.bookedBy} foi notificado.`,
    });
  };

  const handleRejectBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.filter(b => b.id !== bookingId));

    setTimeSlots(prev => prev.map(s => 
      s.id === booking.slotId ? { ...s, status: "available", bookedBy: undefined, paymentType: undefined } : s
    ));

    toast({
      title: "Reserva recusada",
      description: `${booking.bookedBy} foi notificado.`,
      variant: "destructive",
    });
  };

  const handleBackFromSuccess = () => {
    setActiveView("player");
    setCurrentBooking(null);
  };

  // Success Screen
  if (activeView === "success" && currentBooking) {
    return (
      <SuccessScreen 
        booking={currentBooking} 
        onBack={handleBackFromSuccess}
        onUpdatePlayers={handleUpdatePlayers}
      />
    );
  }

  // Admin Dashboard
  if (activeView === "admin") {
    return (
      <>
        <AdminDashboard 
          bookings={bookings}
          onApprove={handleApproveBooking}
          onReject={handleRejectBooking}
          onBack={() => setActiveView("player")}
        />
        <BottomNav 
          activeView="admin" 
          onViewChange={(view) => setActiveView(view)} 
        />
      </>
    );
  }

  // Player Home
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Field Selector */}
        <FieldSelector 
          selectedField={selectedField}
          onFieldChange={setSelectedField}
        />

        {/* Schedule */}
        <div className="space-y-6">
          <DateSection 
            title={`Hoje - ${todayDisplay}`}
            slots={todaySlots}
            onSlotClick={handleSlotClick}
          />
          <DateSection 
            title={`Amanhã - ${tomorrowDisplay}`}
            slots={tomorrowSlots}
            onSlotClick={handleSlotClick}
          />
        </div>
      </main>

      {/* Payment Drawer */}
      <PaymentDrawer
        slot={selectedSlot}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onConfirm={handleBookingConfirm}
      />

      {/* Bottom Navigation */}
      <BottomNav 
        activeView="player" 
        onViewChange={(view) => setActiveView(view)} 
      />
    </div>
  );
};

export default Index;

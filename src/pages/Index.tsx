import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { FieldSelector } from "@/components/FieldSelector";
import { DateStrip } from "@/components/DateStrip";
import { DateSection } from "@/components/DateSection";
import { PaymentDrawer } from "@/components/PaymentDrawer";
import { SuccessScreen } from "@/components/SuccessScreen";
import { AdminDashboardNew } from "@/components/admin/AdminDashboardNew";
import { BottomNav } from "@/components/BottomNav";
import { TimeSlot, Booking, PaymentType } from "@/types/booking";
import { FieldId } from "@/config/arena";
import { ARENA_CONFIG } from "@/config/arena";
import { 
  initialTimeSlots, 
  initialBookings
} from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type View = "player" | "admin" | "success";

const Index = () => {
  const [activeView, setActiveView] = useState<View>("player");
  const [selectedField, setSelectedField] = useState<FieldId>("principal");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  
  const filteredSlots = useMemo(() => {
    return timeSlots.filter(slot => 
      slot.fieldId === selectedField && slot.date === selectedDateStr
    );
  }, [timeSlots, selectedField, selectedDateStr]);

  const displayDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.status === "available") {
      setSelectedSlot(slot);
      setIsDrawerOpen(true);
    }
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

  const handleToggleMensalista = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    const wasAlreadyMensalista = booking?.isMensalista;
    
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, isMensalista: !b.isMensalista } : b
    ));

    toast({
      title: wasAlreadyMensalista ? "Mensalista removido" : "Mensalista adicionado!",
      description: wasAlreadyMensalista 
        ? `${booking?.bookedBy} não é mais mensalista.`
        : `${booking?.bookedBy} agora é mensalista fixo.`,
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.filter(b => b.id !== bookingId));
    setTimeSlots(prev => prev.map(s => 
      s.id === booking.slotId ? { ...s, status: "available", bookedBy: undefined, paymentType: undefined } : s
    ));

    toast({
      title: "Reserva cancelada",
      description: `A reserva de ${booking.bookedBy} foi cancelada.`,
      variant: "destructive",
    });
  };

  const handleMarkAsPaid = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: "confirmed" } : b
    ));
    
    setTimeSlots(prev => prev.map(s => 
      s.id === booking.slotId ? { ...s, status: "reserved" } : s
    ));

    toast({
      title: "Pagamento confirmado!",
      description: `${booking.bookedBy} pagou no local.`,
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
      <AdminDashboardNew 
        bookings={bookings}
        timeSlots={timeSlots}
        selectedField={selectedField}
        selectedDate={selectedDateStr}
        onApproveBooking={handleApproveBooking}
        onRejectBooking={handleRejectBooking}
        onToggleMensalista={handleToggleMensalista}
        onCancelBooking={handleCancelBooking}
        onMarkAsPaid={handleMarkAsPaid}
        onBackToPlayer={() => setActiveView("player")}
      />
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

        {/* Date Strip Navigation */}
        <DateStrip 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {/* Schedule */}
        <div className="space-y-4">
          <DateSection 
            title={displayDate}
            slots={filteredSlots}
            onSlotClick={handleSlotClick}
          />

          {/* Empty state / Hint */}
          {filteredSlots.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum horário disponível para esta data.</p>
            </div>
          )}

          {/* Scroll Hint */}
          {filteredSlots.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Procurando outra data? Use o calendário no topo 👆</span>
            </div>
          )}
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

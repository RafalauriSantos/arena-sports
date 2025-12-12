import { useState, useMemo } from "react";
import { Booking, TimeSlot } from "@/types/booking";
import { ARENA_CONFIG } from "@/config/arena";
import { AdminFinancialHeader } from "./AdminFinancialHeader";
import { ApprovalCard } from "./ApprovalCard";
import { AdminSlotCard, SlotStatus } from "./AdminSlotCard";
import { AdminBottomNav, AdminTab } from "./AdminBottomNav";
import { SupportModal } from "./SupportModal";
import { SlotDetailsModal } from "./SlotDetailsModal";
import { MensalistasView } from "./MensalistasView";
import { Calendar } from "lucide-react";

interface AdminDashboardNewProps {
  bookings: Booking[];
  timeSlots: TimeSlot[];
  selectedField: string;
  selectedDate: string;
  onApproveBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onToggleMensalista: (id: string) => void;
  onBlockSlot?: (time: string) => void;
  onUnblockSlot?: (time: string) => void;
  onCancelBooking?: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onBackToPlayer: () => void;
}

export function AdminDashboardNew({
  bookings,
  timeSlots,
  selectedField,
  selectedDate,
  onApproveBooking,
  onRejectBooking,
  onToggleMensalista,
  onBlockSlot,
  onUnblockSlot,
  onCancelBooking,
  onMarkAsPaid,
  onBackToPlayer,
}: AdminDashboardNewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("today");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);

  // Calculate financial data
  const todayBookings = bookings.filter((b) => b.date === selectedDate);
  const confirmedBookings = todayBookings.filter((b) => b.status === "confirmed" || b.status === "approved");
  const pendingBookings = todayBookings.filter(
    (b) => b.status === "pending_approval" && b.paymentType === "local"
  );
  const mensalistaBookings = bookings.filter((b) => b.isMensalista);

  const calculateAmount = (booking: Booking) => booking.pricePerPlayer * booking.totalPlayers;

  const todayRevenue = confirmedBookings.reduce((sum, b) => sum + calculateAmount(b), 0);

  // Get slots for selected field and date
  const filteredSlots = timeSlots.filter(
    (slot) => slot.fieldId === selectedField && slot.date === selectedDate
  );

  // Generate time slots for the day
  const daySlots = useMemo(() => {
    const slots: { time: string; status: SlotStatus; booking?: Booking }[] = [];
    const times = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

    times.forEach((time) => {
      const booking = todayBookings.find(
        (b) => b.time === time && b.fieldId === selectedField
      );
      const isBlocked = blockedSlots.includes(time);

      if (booking) {
        let status: SlotStatus = "pix_confirmed";
        if (booking.isMensalista) {
          status = "mensalista";
        } else if (booking.paymentType === "local" && booking.status === "pending_approval") {
          status = "local_pending";
        } else if (booking.paymentType === "local" && (booking.status === "confirmed" || booking.status === "approved")) {
          status = "pix_confirmed";
        }
        slots.push({ time, status, booking });
      } else if (isBlocked) {
        slots.push({ time, status: "blocked" });
      } else {
        slots.push({ time, status: "available" });
      }
    });

    return slots;
  }, [todayBookings, selectedField, blockedSlots]);

  const handleTabChange = (tab: AdminTab) => {
    if (tab === "support") {
      setSupportModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleBlockSlot = (time: string) => {
    setBlockedSlots((prev) => [...prev, time]);
    onBlockSlot?.(time);
  };

  const handleUnblockSlot = (time: string) => {
    setBlockedSlots((prev) => prev.filter((t) => t !== time));
    onUnblockSlot?.(time);
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const field = ARENA_CONFIG.fields.find((f) => f.id === selectedField);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AdminFinancialHeader
        todayRevenue={todayRevenue}
        confirmedGames={confirmedBookings.length}
        pendingGames={pendingBookings.length}
        onSettingsClick={() => {}}
      />

      {/* Pending Approvals */}
      {activeTab === "today" && pendingBookings.length > 0 && (
        <div className="pt-4">
          {pendingBookings.map((booking) => (
            <ApprovalCard
              key={booking.id}
              booking={booking}
              onApprove={onApproveBooking}
              onReject={onRejectBooking}
            />
          ))}
        </div>
      )}

      {/* Today's Agenda */}
      {activeTab === "today" && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agenda de Hoje - {field?.name}
          </h2>

          <div className="space-y-3">
            {daySlots.map((slot) => (
              <AdminSlotCard
                key={slot.time}
                time={slot.time}
                status={slot.status}
                customerName={slot.booking?.bookedBy}
                customerPhone={undefined}
                onBlock={() => handleBlockSlot(slot.time)}
                onUnblock={() => handleUnblockSlot(slot.time)}
                onViewDetails={() => slot.booking && handleViewDetails(slot.booking)}
                onMarkAsPaid={() => slot.booking && onMarkAsPaid?.(slot.booking.id)}
                onCancel={() => slot.booking && onCancelBooking?.(slot.booking.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Calendar View (Future) */}
      {activeTab === "calendar" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Calendário Futuro
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Em breve você poderá visualizar e gerenciar reservas futuras aqui.
          </p>
        </div>
      )}

      {/* Mensalistas View */}
      {activeTab === "mensalistas" && (
        <MensalistasView mensalistas={mensalistaBookings} />
      )}

      <AdminBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <SupportModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />

      <SlotDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        booking={selectedBooking}
        onMarkAsPaid={() => {
          if (selectedBooking) {
            onMarkAsPaid?.(selectedBooking.id);
            setDetailsModalOpen(false);
          }
        }}
        onCancel={() => {
          if (selectedBooking) {
            onCancelBooking?.(selectedBooking.id);
            setDetailsModalOpen(false);
          }
        }}
        onToggleMensalista={() => {
          if (selectedBooking) {
            onToggleMensalista(selectedBooking.id);
            setDetailsModalOpen(false);
          }
        }}
      />
    </div>
  );
}

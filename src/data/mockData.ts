import { TimeSlot, Booking } from "@/types/booking";

const today = new Date();

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Generate time slots for the entire month
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let slotId = 1;

  // Generate for 30 days starting from today
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    // Create a fresh date for each day to avoid mutation issues
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Removed console.log for production performance

    // Define working hours based on day of week
    let startHour: number;
    let endHour: number;

    if (dayOfWeek === 0) {
      // Domingo: 8h às 12h
      startHour = 8;
      endHour = 12;
    } else {
      // Segunda a Sábado: 9h às 22h
      startHour = 9;
      endHour = 22;
    }

    // Generate slots for both fields
    const fields: Array<{ id: "principal" | "medio" }> = [
      { id: "principal" },
      { id: "medio" }
    ];

    fields.forEach(field => {
      for (let hour = startHour; hour <= endHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;

        slots.push({
          id: slotId.toString(),
          time: timeStr,
          status: "available",
          date: dateStr,
          fieldId: field.id,
        });

        slotId++;
      }
    });
  }

  return slots;
};

export const initialTimeSlots: TimeSlot[] = generateTimeSlots();

const todayStr = formatDate(today);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = formatDate(tomorrow);

export const initialBookings: Booking[] = [
  {
    id: "b1",
    slotId: "3",
    fieldId: "principal",
    fieldName: "Campo Principal",
    date: todayStr,
    time: "20:00",
    paymentType: "local",
    status: "pending_approval",
    bookedBy: "Carlos Mendes",
    players: ["Carlos Mendes", "Pedro Alves", "Lucas Costa"],
    pricePerPlayer: 13.33,
    totalPlayers: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b2",
    slotId: "8",
    fieldId: "principal",
    fieldName: "Campo Principal",
    date: tomorrowStr,
    time: "20:00",
    paymentType: "local",
    status: "pending_approval",
    bookedBy: "Roberto Lima",
    players: ["Roberto Lima"],
    pricePerPlayer: 13.33,
    totalPlayers: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b3",
    slotId: "5",
    fieldId: "principal",
    fieldName: "Campo Principal",
    date: todayStr,
    time: "22:00",
    paymentType: "pix",
    status: "confirmed",
    bookedBy: "Time Amigos FC",
    players: ["Marcos", "Felipe", "Bruno", "Gustavo", "Ricardo", "Thiago", "Daniel", "André", "Vitor", "Paulo", "Henrique", "Eduardo"],
    pricePerPlayer: 12.50,
    totalPlayers: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "b4",
    slotId: "14",
    fieldId: "medio",
    fieldName: "Campo Médio",
    date: todayStr,
    time: "21:00",
    paymentType: "local",
    status: "pending_approval",
    bookedBy: "André Santos",
    players: ["André Santos", "Fabio Lima"],
    pricePerPlayer: 14,
    totalPlayers: 10,
    createdAt: new Date().toISOString(),
  },
];

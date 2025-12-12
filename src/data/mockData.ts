import { TimeSlot, Booking } from "@/types/booking";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const formatDisplayDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric' };
  return date.toLocaleDateString('pt-BR', options);
};

export const todayStr = formatDate(today);
export const tomorrowStr = formatDate(tomorrow);
export const todayDisplay = formatDisplayDate(today);
export const tomorrowDisplay = formatDisplayDate(tomorrow);

export const initialTimeSlots: TimeSlot[] = [
  // Today - Campo Principal
  { id: "1", time: "18:00", status: "reserved", date: todayStr, fieldId: "principal", bookedBy: "João Silva" },
  { id: "2", time: "19:00", status: "available", date: todayStr, fieldId: "principal" },
  { id: "3", time: "20:00", status: "pending", date: todayStr, fieldId: "principal", bookedBy: "Carlos Mendes", paymentType: "local" },
  { id: "4", time: "21:00", status: "available", date: todayStr, fieldId: "principal" },
  { id: "5", time: "22:00", status: "reserved", date: todayStr, fieldId: "principal", bookedBy: "Time Amigos FC", paymentType: "pix" },
  
  // Tomorrow - Campo Principal
  { id: "6", time: "18:00", status: "available", date: tomorrowStr, fieldId: "principal" },
  { id: "7", time: "19:00", status: "available", date: tomorrowStr, fieldId: "principal" },
  { id: "8", time: "20:00", status: "pending", date: tomorrowStr, fieldId: "principal", bookedBy: "Roberto Lima", paymentType: "local" },
  { id: "9", time: "21:00", status: "available", date: tomorrowStr, fieldId: "principal" },
  { id: "10", time: "22:00", status: "available", date: tomorrowStr, fieldId: "principal" },
  
  // Today - Campo Médio
  { id: "11", time: "18:00", status: "available", date: todayStr, fieldId: "medio" },
  { id: "12", time: "19:00", status: "reserved", date: todayStr, fieldId: "medio", bookedBy: "Pelada do Zé", paymentType: "pix" },
  { id: "13", time: "20:00", status: "available", date: todayStr, fieldId: "medio" },
  { id: "14", time: "21:00", status: "pending", date: todayStr, fieldId: "medio", bookedBy: "André Santos", paymentType: "local" },
  { id: "15", time: "22:00", status: "available", date: todayStr, fieldId: "medio" },
  
  // Tomorrow - Campo Médio
  { id: "16", time: "18:00", status: "reserved", date: tomorrowStr, fieldId: "medio", bookedBy: "Time da Firma", paymentType: "pix" },
  { id: "17", time: "19:00", status: "available", date: tomorrowStr, fieldId: "medio" },
  { id: "18", time: "20:00", status: "available", date: tomorrowStr, fieldId: "medio" },
  { id: "19", time: "21:00", status: "available", date: tomorrowStr, fieldId: "medio" },
  { id: "20", time: "22:00", status: "reserved", date: tomorrowStr, fieldId: "medio", bookedBy: "Veteranos FC", paymentType: "pix" },
];

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

export type BookingStatus = "available" | "reserved" | "pending";

export type PaymentType = "pix" | "local";

export interface TimeSlot {
  id: string;
  time: string;
  status: BookingStatus;
  date: string;
  fieldId: string;
  bookedBy?: string;
  paymentType?: PaymentType;
}

export interface Booking {
  id: string;
  slotId: string;
  fieldId: string;
  fieldName: string;
  date: string;
  time: string;
  paymentType: PaymentType;
  status: "confirmed" | "pending_approval" | "approved" | "rejected";
  bookedBy: string;
  players: string[];
  pricePerPlayer: number;
  totalPlayers: number;
  createdAt: string;
}

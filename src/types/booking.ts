export type BookingStatus = "available" | "reserved" | "pending";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentType = "pix" | "local";

export interface TimeSlot {
  id: string;
  tenantId?: string;
  date: string;
  time: string;
  status: BookingStatus;
  fieldId?: string | null;
  courtName?: string | null;
  startTime?: Date;
  endTime?: Date;
  bookedBy?: string;
  paymentType?: PaymentType;
  priceOverride?: number | null;
}

export interface Booking {
  id: string;
  slotId: string;
  tenantId: string;
  customerName: string;
  customerPhone?: string | null;
  courtName?: string | null;
  startTime?: Date;
  endTime?: Date;
  totalPrice?: number | null;
  paymentStatus?: PaymentStatus | null;
  paymentType?: PaymentType;
  // Derived fields for legacy UI
  fieldId?: string | null;
  fieldName?: string | null;
  date?: string;
  time?: string;
  status?: "confirmed" | "pending_approval" | "approved" | "rejected";
  bookedBy?: string;
  players?: string[];
  pricePerPlayer?: number;
  totalPlayers?: number;
  createdAt?: string;
  isMensalista?: boolean;
}

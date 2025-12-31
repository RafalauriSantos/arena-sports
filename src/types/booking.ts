
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type BookingStatus = 'confirmed' | 'pending_approval' | 'cancelled' | 'pending';

export interface Booking {
  id: string;
  tenantId?: string;
  slotId?: string;
  fieldId: string;
  fieldName: string;
  customerName: string;
  customerPhone?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  startTime?: Date;
  endTime?: Date;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookedBy?: string;
  players?: string[];
  createdAt?: string;
  courtName?: string; // Adicionado para compatibilidade com o front antigo
}

export interface TimeSlot {
  id: string;
  fieldId: string;
  date: string;
  time: string;
  status: 'available' | 'reserved' | 'blocked';
  // 👇 AQUI ESTAVA FALTANDO ESSA LINHA:
  pricePerPlayer: number;
  courtName?: string;
  bookedBy?: string;
  startTime?: Date;   // Opcional para facilitar cálculos no front
  endTime?: Date;     // Opcional
  tenantId?: string;
}

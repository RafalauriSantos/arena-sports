
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentType = 'per_player' | 'full' | 'deposit' | 'mensalista';
export type BookingStatus =
  | 'confirmed'
  | 'pending_approval'
  | 'pending_payment'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected';

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
  paidAmount?: number; // quanto já foi pago (sinal ou total)
  depositPercent?: number; // percentual do sinal, quando aplicável
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookedBy?: string;
  players?: string[];
  createdAt?: string;
  courtName?: string; // Adicionado para compatibilidade com o front antigo
  startedAt?: string | null; // Quando o jogo começou
  completedAt?: string | null; // Quando o jogo terminou
  cancelledAt?: string | null; // Quando foi cancelado
  // Campos de pagamento e tipo de reserva
  paymentType?: PaymentType;
  pricePerPlayer?: number;
  totalPlayers?: number;
  isMensalista?: boolean;
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

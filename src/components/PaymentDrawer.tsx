import { useState } from "react";
import { X, Zap, Clock, DollarSign, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { TimeSlot, PaymentType } from "@/types/booking";
import { ARENA_CONFIG } from "@/config/arena";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaymentDrawerProps {
  slot: TimeSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (slot: TimeSlot, paymentType: PaymentType, name: string) => void;
}

type PaymentOption = "signal" | "full" | "local";

export function PaymentDrawer({ slot, isOpen, onClose, onConfirm }: PaymentDrawerProps) {
  const [name, setName] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null);

  if (!slot) return null;

  const field = ARENA_CONFIG.fields.find((f) => f.id === slot.fieldId);
  const priceLocal = field?.priceLocal || 160;
  const priceOnline = field?.priceOnline || 150;
  const signalAmount = 50;
  const remainingAmount = priceLocal - signalAmount;
  const discount = priceLocal - priceOnline;

  const handleConfirm = () => {
    if (selectedPayment && name.trim()) {
      // Map payment option to PaymentType
      const paymentType: PaymentType = selectedPayment === "local" ? "local" : "pix";
      onConfirm(slot, paymentType, name.trim());
      setName("");
      setSelectedPayment(null);
    }
  };

  const displayDate = new Date(slot.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-card border-border max-h-[90vh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto">
          <DrawerHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-xl font-bold text-foreground">
                  Reserva: {slot.time}
                </DrawerTitle>
                <p className="text-sm text-primary mt-1">{field?.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-secondary transition-colors btn-press"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-5">
            {/* Slot Info */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground number-display">{slot.time}</p>
                  <p className="text-sm text-muted-foreground capitalize">{displayDate}</p>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do Capitão</label>
              <Input
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border focus:ring-primary h-12 text-base"
              />
            </div>

            {/* Payment Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Escolha como pagar</p>

              {/* Option A - Signal (Recommended) */}
              <button
                onClick={() => setSelectedPayment("signal")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 btn-press relative overflow-hidden",
                  selectedPayment === "signal"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-primary/40 bg-card hover:border-primary/60"
                )}
              >
                {/* Recommended Badge */}
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
                  RECOMENDADO
                </div>
                
                <div className="flex items-start gap-3 pr-24">
                  <div className="p-2 rounded-lg bg-primary/20 mt-0.5">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">Pagar Sinal e Garantir</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pague R$ {signalAmount} agora via Pix e o resto na quadra
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-xs text-primary font-medium">Reserva Garantida Imediatamente</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pagar agora:</span>
                  <span className="text-2xl font-black text-primary number-display">R$ {signalAmount}</span>
                </div>
                {selectedPayment === "signal" && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionado</span>
                  </div>
                )}
              </button>

              {/* Option B - Full with Discount */}
              <button
                onClick={() => setSelectedPayment("full")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 btn-press",
                  selectedPayment === "full"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 mt-0.5">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">Pagar Valor Total</p>
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                        -R$ {discount} OFF
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pague tudo agora e economize
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground line-through">R$ {priceLocal}</p>
                    <p className="text-xl font-black text-primary number-display">R$ {priceOnline}</p>
                  </div>
                </div>
                {selectedPayment === "full" && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionado</span>
                  </div>
                )}
              </button>

              {/* Option C - Pay at Venue */}
              <button
                onClick={() => setSelectedPayment("local")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 btn-press",
                  selectedPayment === "local"
                    ? "border-warning bg-warning/10"
                    : "border-border bg-card hover:border-warning/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-warning/20 mt-0.5">
                    <DollarSign className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">Pagar na Quadra</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sem desconto, sujeito a aprovação
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <AlertTriangle className="w-3 h-3 text-warning" />
                      <span className="text-xs text-warning">
                        Sujeito a cancelamento se alguém pagar o sinal antes
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-warning number-display">R$ {priceLocal}</p>
                  </div>
                </div>
                {selectedPayment === "local" && (
                  <div className="mt-3 flex items-center gap-2 text-warning">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionado</span>
                  </div>
                )}
              </button>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={!selectedPayment || !name.trim()}
              className={cn(
                "w-full h-14 text-lg font-bold btn-press disabled:opacity-50 disabled:cursor-not-allowed",
                selectedPayment === "local"
                  ? "bg-warning hover:bg-warning/90 text-warning-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
              )}
            >
              {selectedPayment === "signal" || selectedPayment === "full" 
                ? "Gerar Pix e Confirmar" 
                : selectedPayment === "local" 
                  ? "Reservar Mesmo Assim" 
                  : "Selecione uma opção"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

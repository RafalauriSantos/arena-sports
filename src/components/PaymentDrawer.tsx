import { useState } from "react";
import { X, Zap, Clock, DollarSign, CheckCircle } from "lucide-react";
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

export function PaymentDrawer({ slot, isOpen, onClose, onConfirm }: PaymentDrawerProps) {
  const [name, setName] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);

  if (!slot) return null;

  const field = ARENA_CONFIG.fields.find((f) => f.id === slot.fieldId);
  const priceOnline = field?.priceOnline || 150;
  const priceLocal = field?.priceLocal || 160;
  const discount = priceLocal - priceOnline;

  const handleConfirm = () => {
    if (selectedPayment && name.trim()) {
      onConfirm(slot, selectedPayment, name.trim());
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
      <DrawerContent className="bg-card border-border">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-bold text-foreground">
                Reservar Horário
              </DrawerTitle>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors btn-press"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-6">
            {/* Slot Info */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">{slot.time}</p>
                  <p className="text-sm text-muted-foreground capitalize">{displayDate}</p>
                  <p className="text-sm text-primary">{field?.name}</p>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Seu nome</label>
              <Input
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border focus:ring-primary"
              />
            </div>

            {/* Payment Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Escolha como pagar</p>

              {/* Pix Option - Highlighted */}
              <button
                onClick={() => setSelectedPayment("pix")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 btn-press",
                  selectedPayment === "pix"
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-primary/30 bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 mt-0.5">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">Confirmar Pagamento (Pix)</p>
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          Economize R$ {discount}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reserva garantida imediatamente. Gera link Pix.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-primary">
                      R$ {priceOnline.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                {selectedPayment === "pix" && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionado</span>
                  </div>
                )}
              </button>

              {/* Local Option */}
              <button
                onClick={() => setSelectedPayment("local")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 btn-press",
                  selectedPayment === "local"
                    ? "border-warning bg-warning/10"
                    : "border-border bg-card hover:border-warning/50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning/20 mt-0.5">
                      <DollarSign className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Pagar Presencialmente</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sujeito à aprovação do dono. Preço cheio.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-warning">
                      R$ {priceLocal.toFixed(2).replace('.', ',')}
                    </p>
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
                selectedPayment === "pix" 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-primary"
                  : "bg-warning hover:bg-warning/90 text-warning-foreground"
              )}
            >
              {selectedPayment === "pix" ? "Confirmar Pagamento" : 
               selectedPayment === "local" ? "Reservar Mesmo Assim" : 
               "Confirmar Reserva"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

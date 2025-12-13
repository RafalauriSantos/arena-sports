import { useState, useEffect } from "react";
import { Copy, CheckCircle, Clock, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ARENA_CONFIG } from "@/config/arena";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  bookingCode: string;
  onPaymentConfirmed: () => void;
}

export function PixPaymentModal({
  open,
  onOpenChange,
  amount,
  bookingCode,
  onPaymentConfirmed,
}: PixPaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "checking" | "confirmed">("pending");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const { toast } = useToast();

  // Simulated Pix code
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${ARENA_CONFIG.pixKey}5204000053039865406${amount.toFixed(2)}5802BR5925${ARENA_CONFIG.name.toUpperCase().slice(0, 25)}6009SAO PAULO62140510${bookingCode}6304`;

  useEffect(() => {
    if (!open || paymentStatus === "confirmed") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, paymentStatus]);

  // Simulate automatic payment confirmation (in real app, this would be a webhook)
  useEffect(() => {
    if (paymentStatus === "checking") {
      const timer = setTimeout(() => {
        setPaymentStatus("confirmed");
        toast({
          title: "✅ Pagamento confirmado!",
          description: "Sua reserva foi garantida com sucesso.",
        });
        setTimeout(() => {
          onPaymentConfirmed();
          onOpenChange(false);
        }, 2000);
      }, 3000); // Simulate 3 second confirmation

      return () => clearTimeout(timer);
    }
  }, [paymentStatus, onPaymentConfirmed, onOpenChange, toast]);

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast({
      title: "Código Pix copiado!",
      description: "Cole no seu app de pagamento",
    });
  };

  const handleConfirmPayment = () => {
    setPaymentStatus("checking");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate simulated QR code pattern
  const generateQRPattern = () => {
    const pattern = [];
    for (let i = 0; i < 144; i++) {
      pattern.push(
        <div
          key={i}
          className={`w-2 h-2 ${Math.random() > 0.5 ? "bg-foreground" : "bg-background"}`}
        />
      );
    }
    return pattern;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Pagamento via Pix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {paymentStatus === "confirmed" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary animate-scale-in" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
                <p className="text-muted-foreground mt-1">Sua reserva está garantida</p>
              </div>
            </div>
          ) : paymentStatus === "checking" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
                <Clock className="w-12 h-12 text-warning" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">Verificando pagamento...</h3>
                <p className="text-muted-foreground mt-1">Aguarde alguns segundos</p>
              </div>
            </div>
          ) : (
            <>
              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor a pagar</p>
                <p className="text-4xl font-bold text-primary">
                  R$ {amount.toFixed(2).replace(".", ",")}
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 text-warning">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Expira em {formatTime(countdown)}
                </span>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-background rounded-xl border border-border">
                  <div className="w-48 h-48 grid grid-cols-12 gap-0.5 p-2 bg-background">
                    {generateQRPattern()}
                  </div>
                </div>
              </div>

              {/* Pix Code */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Ou copie o código Pix:</p>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-secondary rounded-lg text-xs text-muted-foreground break-all font-mono">
                    {pixCode.slice(0, 50)}...
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPixCode}
                    className="shrink-0 border-primary text-primary hover:bg-primary/10"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirmPayment}
                className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground btn-press glow-primary"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Já fiz o Pix
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                O pagamento será confirmado automaticamente quando recebido
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

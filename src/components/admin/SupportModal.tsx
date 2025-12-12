import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  const handleWhatsAppClick = () => {
    const phone = "5515999999999"; // Developer's phone
    const message = encodeURIComponent(
      "Olá Rafael! Preciso de suporte com o Sao Paulo Center."
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Suporte Técnico
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {/* Developer Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4 glow-primary">
            <span className="text-4xl font-bold text-primary-foreground">R</span>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-1">Rafael</h3>
          <p className="text-sm text-muted-foreground mb-6">Desenvolvedor</p>

          <Button
            onClick={handleWhatsAppClick}
            className="w-full btn-press bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chamar Rafael no WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

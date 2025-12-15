import { Crown, MessageCircle, ArrowRight } from "lucide-react";
import { ARENA_CONFIG } from "@/config/arena";
import { cn } from "@/lib/utils";

export function MensalistaCard() {
  const handleClick = () => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse em ser *Mensalista* na ${ARENA_CONFIG.name}. Gostaria de saber mais sobre os horários fixos disponíveis.`
    );
    window.open(`https://wa.me/${ARENA_CONFIG.whatsapp}?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 border-gold/50 bg-gradient-to-r from-gold/10 to-gold/5",
        "hover:border-gold hover:glow-gold transition-all duration-300 btn-press",
        "flex items-center justify-between group"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold/20">
          <Crown className="w-6 h-6 text-gold" />
        </div>
        <div className="text-left">
          <p className="font-bold text-gold">Seja Mensalista</p>
          <p className="text-sm text-muted-foreground">
            Horário fixo toda semana
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-gold">
        <MessageCircle className="w-4 h-4" />
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}

import { useState } from "react";
import { CheckCircle, Copy, Users, Shirt, Plus, ArrowLeft, Share2 } from "lucide-react";
import { Booking } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SuccessScreenProps {
  booking: Booking;
  onBack: () => void;
  onUpdatePlayers: (players: string[]) => void;
}

export function SuccessScreen({ booking, onBack, onUpdatePlayers }: SuccessScreenProps) {
  const [newPlayer, setNewPlayer] = useState("");
  const { toast } = useToast();

  const remainingPlayers = booking.totalPlayers - booking.players.length;
  const pricePerPlayer = (booking.paymentType === "pix" ? 150 : 160) / booking.totalPlayers;

  const displayDate = new Date(booking.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const handleCopyLink = () => {
    const link = `${window.location.origin}/jogo/${booking.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "Compartilhe com seu time",
    });
  };

  const handleAddPlayer = () => {
    if (newPlayer.trim() && booking.players.length < booking.totalPlayers) {
      onUpdatePlayers([...booking.players, newPlayer.trim()]);
      setNewPlayer("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPlayer();
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors btn-press"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-primary/20 glow-primary-strong animate-pulse-glow">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jogo Confirmado!</h1>
            <p className="text-muted-foreground mt-1">
              {booking.paymentType === "pix" ? "Pagamento via Pix recebido" : "Aguardando aprovação do dono"}
            </p>
          </div>
        </div>

        {/* Booking Summary Card */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{booking.time}</p>
              <p className="text-muted-foreground capitalize">{displayDate}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">{booking.fieldName}</p>
              <p className="text-sm text-muted-foreground">{booking.totalPlayers} jogadores</p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Responsável</span>
            <span className="font-medium text-foreground">{booking.bookedBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Forma de pagamento</span>
            <span className={cn(
              "font-medium",
              booking.paymentType === "pix" ? "text-primary" : "text-warning"
            )}>
              {booking.paymentType === "pix" ? "Pix" : "No local"}
            </span>
          </div>
        </div>

        {/* Share Button */}
        <Button
          onClick={handleCopyLink}
          className="w-full h-14 gap-3 bg-secondary hover:bg-secondary/80 text-foreground font-semibold btn-press"
        >
          <Share2 className="w-5 h-5" />
          Copiar Link do Jogo
        </Button>

        {/* Players Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Convocação do Time
            </h2>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              remainingPlayers > 0 ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"
            )}>
              {remainingPlayers > 0 
                ? `Faltam ${remainingPlayers} jogadores` 
                : "Time completo!"}
            </div>
          </div>

          {remainingPlayers > 0 && (
            <p className="text-sm text-muted-foreground">
              R$ {pricePerPlayer.toFixed(2).replace('.', ',')} por pessoa
            </p>
          )}

          {/* Add Player Input */}
          {remainingPlayers > 0 && (
            <div className="flex gap-2">
              <Input
                placeholder="Nome do jogador"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-secondary border-border"
              />
              <Button
                onClick={handleAddPlayer}
                disabled={!newPlayer.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground btn-press"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Players Grid */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: booking.totalPlayers }).map((_, index) => {
              const player = booking.players[index];
              return (
                <div
                  key={index}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all",
                    player 
                      ? "bg-primary/20 border border-primary/50" 
                      : "bg-secondary/50 border border-dashed border-border"
                  )}
                >
                  <Shirt className={cn(
                    "w-6 h-6 mb-1",
                    player ? "text-primary" : "text-muted-foreground/50"
                  )} />
                  <span className="text-xs text-center font-medium text-muted-foreground truncate w-full">
                    {player || `#${index + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

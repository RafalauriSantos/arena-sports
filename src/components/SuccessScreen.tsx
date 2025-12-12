import { useState } from "react";
import { CheckCircle, Copy, Users, Shirt, Plus, ArrowLeft, Share2, MessageCircle, Crown, QrCode, Download, Clock, CheckCircle2 } from "lucide-react";
import { Booking } from "@/types/booking";
import { ARENA_CONFIG } from "@/config/arena";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SuccessScreenProps {
  booking: Booking;
  onBack: () => void;
  onUpdatePlayers: (players: string[]) => void;
}

type PlayerStatus = "pending" | "awaiting" | "paid";

interface Player {
  name: string;
  status: PlayerStatus;
}

export function SuccessScreen({ booking, onBack, onUpdatePlayers }: SuccessScreenProps) {
  const [newPlayer, setNewPlayer] = useState("");
  const { toast } = useToast();
  
  // Initialize players with status
  const [players, setPlayers] = useState<Player[]>(
    booking.players.map(name => ({ name, status: "pending" as PlayerStatus }))
  );
  
  // Vaquinha state
  const [vaquinhaEnabled, setVaquinhaEnabled] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);

  const remainingPlayers = booking.totalPlayers - players.length;
  const pricePerPlayer = (booking.paymentType === "pix" ? 150 : 160) / booking.totalPlayers;
  
  // Vaquinha calculations
  const paidPlayers = players.filter(p => p.status === "paid");
  const totalCollected = paidPlayers.length * pricePerPlayer;
  const totalNeeded = booking.totalPlayers * pricePerPlayer;
  const progressPercent = players.length > 0 ? (totalCollected / totalNeeded) * 100 : 0;

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

  const handleCopyPaymentLink = () => {
    const link = `${window.location.origin}/pagamento/${booking.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link de pagamento copiado!",
      description: "Envie para os jogadores pagarem suas partes",
    });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `🎉 *Reserva Confirmada!*\n\n` +
      `📍 ${ARENA_CONFIG.name}\n` +
      `⚽ ${booking.fieldName}\n` +
      `📅 ${displayDate}\n` +
      `🕐 ${booking.time}\n` +
      `👤 Responsável: ${booking.bookedBy}\n` +
      `💳 Pagamento: ${booking.paymentType === "pix" ? "Pix (Confirmado)" : "No Local"}\n\n` +
      `Segue comprovante da reserva!`
    );
    window.open(`https://wa.me/${ARENA_CONFIG.whatsapp}?text=${message}`, "_blank");
  };

  const handleAddPlayer = () => {
    if (newPlayer.trim() && players.length < booking.totalPlayers) {
      const newPlayerObj: Player = { name: newPlayer.trim(), status: "pending" };
      setPlayers([...players, newPlayerObj]);
      onUpdatePlayers([...booking.players, newPlayer.trim()]);
      setNewPlayer("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPlayer();
    }
  };

  const handlePlayerPayment = (playerName: string) => {
    setSelectedPlayer(playerName);
  };

  const handleConfirmSentPix = () => {
    if (selectedPlayer) {
      setPlayers(players.map(p => 
        p.name === selectedPlayer ? { ...p, status: "awaiting" as PlayerStatus } : p
      ));
      setSelectedPlayer(null);
      toast({
        title: "Aguardando confirmação",
        description: "O capitão irá confirmar seu pagamento.",
      });
    }
  };

  const handleConfirmReceived = (playerName: string) => {
    setPlayers(players.map(p => 
      p.name === playerName ? { ...p, status: "paid" as PlayerStatus } : p
    ));
    toast({
      title: "Pagamento confirmado!",
      description: `${playerName} está confirmado no jogo.`,
    });
  };

  const handleShowReceipt = (playerName: string) => {
    setShowReceipt(playerName);
  };

  const handlePayArena = () => {
    handleWhatsApp();
    toast({
      title: "Redirecionando para pagamento",
      description: "Envie o Pix para a arena!",
    });
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case "paid": return "bg-primary/20 border-primary text-primary";
      case "awaiting": return "bg-warning/20 border-warning text-warning";
      default: return "bg-secondary/50 border-border text-muted-foreground";
    }
  };

  const getStatusIcon = (status: PlayerStatus) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "awaiting": return <Clock className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  // Receipt Modal View
  if (showReceipt) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center animate-fade-in">
        <Card className="w-full max-w-sm bg-primary p-6 text-primary-foreground rounded-2xl">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">PAGAMENTO CONFIRMADO</h2>
            <div className="space-y-2 py-4 border-y border-primary-foreground/30">
              <p className="text-lg font-semibold">{showReceipt}</p>
              <p className="text-sm opacity-80 capitalize">{displayDate}</p>
              <p className="text-sm opacity-80">{booking.time} - {booking.fieldName}</p>
              <p className="text-2xl font-bold mt-2">R$ {pricePerPlayer.toFixed(2).replace('.', ',')}</p>
            </div>
            <p className="text-xs opacity-60">Validado pelo {ARENA_CONFIG.name}</p>
            <p className="text-xs opacity-60">ID: {booking.id.slice(0, 8)}</p>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="secondary" 
                className="flex-1 btn-press"
                onClick={() => setShowReceipt(null)}
              >
                Fechar
              </Button>
              <Button 
                className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90 btn-press"
                onClick={() => {
                  toast({
                    title: "Comprovante salvo!",
                    description: "Faça uma screenshot para guardar.",
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Player Payment View (QR Code)
  if (selectedPlayer) {
    return (
      <div className="min-h-screen bg-background p-4 animate-fade-in">
        <Button 
          variant="ghost" 
          className="mb-4 text-muted-foreground btn-press"
          onClick={() => setSelectedPlayer(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-card border-border p-6 text-center space-y-6 rounded-2xl">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">Pagar Minha Parte</h2>
            <p className="text-muted-foreground text-sm mt-1">{selectedPlayer}</p>
          </div>

          <div className="py-6 border-y border-border">
            <p className="text-3xl font-bold text-primary">R$ {pricePerPlayer.toFixed(2).replace('.', ',')}</p>
            <p className="text-muted-foreground text-sm mt-2">Chave Pix do Capitão:</p>
            <p className="text-foreground font-mono text-sm bg-secondary/50 p-2 rounded mt-2 break-all">
              {pixKey || "chave-pix-exemplo@email.com"}
            </p>
          </div>

          {/* Simulated QR Code */}
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center p-4">
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded grid grid-cols-8 grid-rows-8 gap-0.5 p-2">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg btn-press"
            onClick={handleConfirmSentPix}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Já fiz o Pix
          </Button>
        </Card>
      </div>
    );
  }

  // Main Success Screen
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

        {/* Vaquinha Inteligente Section */}
        <Card className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Vaquinha Inteligente</p>
                <p className="text-muted-foreground text-xs">Receba dos jogadores pelo app</p>
              </div>
            </div>
            <Switch 
              checked={vaquinhaEnabled} 
              onCheckedChange={setVaquinhaEnabled}
            />
          </div>

          {vaquinhaEnabled && (
            <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Sua Chave Pix (Capitão)
                </label>
                <Input
                  placeholder="email@exemplo.com, telefone ou CPF"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full border-primary text-primary hover:bg-primary/10 btn-press"
                onClick={handleCopyPaymentLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link de Pagamento do Time
              </Button>
            </div>
          )}
        </Card>

        {/* Progress Bar (only when vaquinha is enabled) */}
        {vaquinhaEnabled && players.length > 0 && (
          <Card className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Arrecadado</p>
              <p className="text-sm font-semibold text-foreground">
                R$ {totalCollected.toFixed(2).replace('.', ',')} / R$ {totalNeeded.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {paidPlayers.length} de {booking.totalPlayers} jogadores confirmados
            </p>

            {progressPercent >= 100 && (
              <Button 
                className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 btn-press"
                onClick={handlePayArena}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Pagar Arena Agora
              </Button>
            )}
          </Card>
        )}

        {/* WhatsApp Button */}
        <Button
          onClick={handleWhatsApp}
          className="w-full h-14 gap-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold btn-press"
        >
          <MessageCircle className="w-5 h-5" />
          Enviar Comprovante no WhatsApp do Dono
        </Button>

        {/* Share Button */}
        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="w-full h-12 gap-3 border-border text-foreground font-medium btn-press"
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

          {/* Players Grid with Vaquinha Status */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: booking.totalPlayers }).map((_, index) => {
              const player = players[index];
              
              if (player) {
                return (
                  <Card 
                    key={index}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      getStatusColor(player.status)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                        player.status === "paid" ? "bg-primary/30" : 
                        player.status === "awaiting" ? "bg-warning/30" : "bg-secondary"
                      )}>
                        <Shirt className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium truncate flex-1">{player.name}</span>
                      {getStatusIcon(player.status)}
                    </div>

                    {/* Action buttons based on status and vaquinha */}
                    {vaquinhaEnabled && (
                      <div className="mt-2">
                        {player.status === "pending" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-7 border-border btn-press"
                            onClick={() => handlePlayerPayment(player.name)}
                          >
                            Pagar Minha Parte
                          </Button>
                        )}
                        {player.status === "awaiting" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-7 border-warning text-warning hover:bg-warning/10 btn-press"
                            onClick={() => handleConfirmReceived(player.name)}
                          >
                            Confirmar Recebimento
                          </Button>
                        )}
                        {player.status === "paid" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-7 border-primary text-primary hover:bg-primary/10 btn-press"
                            onClick={() => handleShowReceipt(player.name)}
                          >
                            Ver Comprovante
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              }

              return (
                <Card 
                  key={index}
                  className="p-3 rounded-xl border border-dashed border-border bg-secondary/20"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center">
                      <Shirt className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <span className="text-sm text-muted-foreground">Vaga #{index + 1}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
	CheckCircle,
	Copy,
	Users,
	Plus,
	ArrowLeft,
	Share2,
	MessageCircle,
	Crown,
	QrCode,
	Download,
	Clock,
	CheckCircle2,
	Ticket,
} from "lucide-react";
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

export function SuccessScreen({
	booking,
	onBack,
	onUpdatePlayers,
}: SuccessScreenProps) {
	const [newPlayer, setNewPlayer] = useState("");
	const { toast } = useToast();

	const [players, setPlayers] = useState<Player[]>(
		booking.players.map((name) => ({ name, status: "pending" as PlayerStatus }))
	);

	const [vaquinhaEnabled, setVaquinhaEnabled] = useState(false);
	const [pixKey, setPixKey] = useState("");
	const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
	const [showReceipt, setShowReceipt] = useState<string | null>(null);

	const remainingPlayers = booking.totalPlayers - players.length;
	const pricePerPlayer =
		(booking.paymentType === "pix" ? 150 : 160) / booking.totalPlayers;

	const paidPlayers = players.filter((p) => p.status === "paid");
	const totalCollected = paidPlayers.length * pricePerPlayer;
	const totalNeeded = booking.totalPlayers * pricePerPlayer;
	const progressPercent =
		players.length > 0 ? (totalCollected / totalNeeded) * 100 : 0;

	const displayDate = new Date(booking.date).toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	const shareMessage = `🎉 *Jogo Marcado!*\n\n📍 ${ARENA_CONFIG.name}\n⚽ ${booking.fieldName}\n📅 ${displayDate}\n🕐 ${booking.time}\n\nBora galera! 💪`;

	const handleShareWhatsApp = () => {
		const message = encodeURIComponent(shareMessage);
		window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
		toast({
			title: "WhatsApp aberto!",
			description: "Compartilhe com seu grupo",
		});
	};

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
			description: "Envie para os jogadores",
		});
	};

	const handleWhatsAppOwner = () => {
		const displayDateShort = new Date(booking.date).toLocaleDateString("pt-BR");
		const message = encodeURIComponent(
			`Olá! Fiz um agendamento via ArenaSys: ${displayDateShort} às ${booking.time}. Segue o comprovante.`
		);
		window.open(
			`https://wa.me/${ARENA_CONFIG.whatsapp}?text=${message}`,
			"_blank"
		);
	};

	const handleAddPlayer = () => {
		if (newPlayer.trim() && players.length < booking.totalPlayers) {
			const newPlayerObj: Player = {
				name: newPlayer.trim(),
				status: "pending",
			};
			setPlayers([...players, newPlayerObj]);
			onUpdatePlayers([...booking.players, newPlayer.trim()]);
			setNewPlayer("");
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleAddPlayer();
	};

	const handlePlayerPayment = (playerName: string) =>
		setSelectedPlayer(playerName);

	const handleConfirmSentPix = () => {
		if (selectedPlayer) {
			setPlayers(
				players.map((p) =>
					p.name === selectedPlayer
						? { ...p, status: "awaiting" as PlayerStatus }
						: p
				)
			);
			setSelectedPlayer(null);
			toast({
				title: "Aguardando confirmação",
				description: "O capitão irá confirmar seu pagamento.",
			});
		}
	};

	const handleConfirmReceived = (playerName: string) => {
		setPlayers(
			players.map((p) =>
				p.name === playerName ? { ...p, status: "paid" as PlayerStatus } : p
			)
		);
		toast({
			title: "Pagamento confirmado!",
			description: `${playerName} está confirmado no jogo.`,
		});
	};

	const handleShowReceipt = (playerName: string) => setShowReceipt(playerName);

	const handlePayArena = () => {
		handleWhatsAppOwner();
		toast({
			title: "Redirecionando para pagamento",
			description: "Envie o Pix para a arena!",
		});
	};

	const getStatusColor = (status: PlayerStatus) => {
		switch (status) {
			case "paid":
				return "bg-primary/20 border-primary text-primary";
			case "awaiting":
				return "bg-warning/20 border-warning text-warning";
			default:
				return "bg-secondary/50 border-border text-muted-foreground";
		}
	};

	// Receipt Modal
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
							<p className="text-sm opacity-80">
								{booking.time} - {booking.fieldName}
							</p>
							<p className="text-2xl font-bold mt-2 number-display">
								R$ {pricePerPlayer.toFixed(2).replace(".", ",")}
							</p>
						</div>
						<p className="text-xs opacity-60">
							Validado pelo {ARENA_CONFIG.name}
						</p>
						<div className="flex gap-2 pt-4">
							<Button
								variant="secondary"
								className="flex-1 btn-press"
								onClick={() => setShowReceipt(null)}>
								Fechar
							</Button>
							<Button className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90 btn-press">
								<Download className="h-4 w-4 mr-2" />
								Salvar
							</Button>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	// Player Payment QR View
	if (selectedPlayer) {
		return (
			<div className="min-h-screen bg-background p-4 animate-fade-in">
				<Button
					variant="ghost"
					className="mb-4 text-muted-foreground btn-press"
					onClick={() => setSelectedPlayer(null)}>
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
						<h2 className="text-xl font-bold text-foreground">
							Pagar Minha Parte
						</h2>
						<p className="text-muted-foreground text-sm mt-1">
							{selectedPlayer}
						</p>
					</div>
					<div className="py-6 border-y border-border">
						<p className="text-3xl font-black text-primary number-display">
							R$ {pricePerPlayer.toFixed(2).replace(".", ",")}
						</p>
						<p className="text-muted-foreground text-sm mt-2">
							Chave Pix do Capitão:
						</p>
						<p className="text-foreground font-mono text-sm bg-secondary/50 p-2 rounded mt-2 break-all">
							{pixKey || "chave-pix@exemplo.com"}
						</p>
					</div>
					<div className="flex justify-center">
						<div className="w-48 h-48 bg-foreground rounded-lg flex items-center justify-center p-4">
							<div className="w-full h-full bg-background rounded grid grid-cols-8 grid-rows-8 gap-0.5 p-2">
								{Array.from({ length: 64 }).map((_, i) => (
									<div
										key={i}
										className={`${
											Math.random() > 0.5 ? "bg-foreground" : "bg-transparent"
										}`}
									/>
								))}
							</div>
						</div>
					</div>
					<Button
						className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg btn-press"
						onClick={handleConfirmSentPix}>
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
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors btn-press">
						<ArrowLeft className="w-5 h-5" />
						<span>Voltar</span>
					</button>
				</div>
			</div>

			<div className="container px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-28 md:pb-6">
				{/* Ticket/Comprovante Visual */}
				<Card className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 p-6 rounded-2xl">
					{/* Ticket Perforations */}
					<div className="absolute left-0 top-1/2 w-4 h-8 bg-background rounded-r-full -translate-y-1/2" />
					<div className="absolute right-0 top-1/2 w-4 h-8 bg-background rounded-l-full -translate-y-1/2" />

					<div className="text-center space-y-4">
						<div className="inline-flex p-4 rounded-full bg-primary/20 glow-primary-strong">
							<Ticket className="w-10 h-10 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-black text-foreground">
								Jogo Confirmado!
							</h1>
							<p className="text-muted-foreground mt-1">
								{booking.paymentType === "pix"
									? "✓ Pagamento confirmado"
									: "Aguardando aprovação"}
							</p>
						</div>

						{/* Dashed line */}
						<div className="border-t-2 border-dashed border-border my-4" />

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
							<div>
								<p className="text-xs text-muted-foreground uppercase">
									Horário
								</p>
								<p className="text-2xl font-black text-foreground number-display">
									{booking.time}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase">Campo</p>
								<p className="text-lg font-bold text-primary">
									{booking.fieldName}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase">Data</p>
								<p className="text-sm font-medium text-foreground capitalize">
									{displayDate}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase">
									Responsável
								</p>
								<p className="text-sm font-medium text-foreground">
									{booking.bookedBy}
								</p>
							</div>
						</div>
					</div>
				</Card>

				{/* Main CTA - Share to Group */}
				<Button
					onClick={handleShareWhatsApp}
					className="w-full h-14 md:h-16 gap-2 md:gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-lg btn-press glow-primary">
					<MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
					Enviar Convite no Grupo do Time
				</Button>

				{/* Secondary Actions */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
					<Button
						onClick={handleWhatsAppOwner}
						variant="outline"
						className="h-12 gap-2 border-border text-foreground font-medium btn-press">
						<MessageCircle className="w-4 h-4" />
						Dono da Arena
					</Button>
					<Button
						onClick={handleCopyLink}
						variant="outline"
						className="h-12 gap-2 border-border text-foreground font-medium btn-press">
						<Share2 className="w-4 h-4" />
						Copiar Link
					</Button>
				</div>

				{/* Vaquinha Section */}
				<Card className="p-5 rounded-2xl bg-card border border-border space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center">
								<Crown className="h-5 w-5 text-gold" />
							</div>
							<div>
								<p className="font-semibold text-foreground">
									Vaquinha Inteligente
								</p>
								<p className="text-muted-foreground text-xs">
									Receba dos jogadores
								</p>
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
									Sua Chave Pix
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
								onClick={handleCopyPaymentLink}>
								<Copy className="h-4 w-4 mr-2" />
								Copiar Link de Pagamento
							</Button>
						</div>
					)}
				</Card>

				{/* Progress (when vaquinha enabled) */}
				{vaquinhaEnabled && players.length > 0 && (
					<Card className="p-5 rounded-2xl bg-card border border-border space-y-3">
						<div className="flex justify-between items-center">
							<p className="text-sm text-muted-foreground">Arrecadado</p>
							<p className="text-sm font-bold text-foreground number-display">
								R$ {totalCollected.toFixed(2).replace(".", ",")} / R${" "}
								{totalNeeded.toFixed(2).replace(".", ",")}
							</p>
						</div>
						<Progress value={progressPercent} className="h-3" />
						{progressPercent >= 100 && (
							<Button
								className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 btn-press"
								onClick={handlePayArena}>
								<CheckCircle className="h-5 w-5 mr-2" />
								Pagar Arena Agora
							</Button>
						)}
					</Card>
				)}

				{/* Players Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-bold text-foreground flex items-center gap-2">
							<Users className="w-5 h-5 text-primary" />
							Convocação
						</h2>
						<div
							className={cn(
								"px-3 py-1 rounded-full text-sm font-medium",
								remainingPlayers > 0
									? "bg-warning/20 text-warning"
									: "bg-primary/20 text-primary"
							)}>
							{remainingPlayers > 0
								? `Faltam ${remainingPlayers}`
								: "Completo!"}
						</div>
					</div>

					{remainingPlayers > 0 && (
						<p className="text-sm text-muted-foreground number-display">
							R$ {pricePerPlayer.toFixed(2).replace(".", ",")} por pessoa
						</p>
					)}

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
								className="bg-primary hover:bg-primary/90 text-primary-foreground btn-press">
								<Plus className="w-5 h-5" />
							</Button>
						</div>
					)}

					{/* Players Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{Array.from({ length: booking.totalPlayers }).map((_, index) => {
							const player = players[index];

							if (player) {
								return (
									<Card
										key={index}
										className={cn(
											"p-3 rounded-xl border-2 transition-all",
											getStatusColor(player.status)
										)}>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="text-lg font-bold number-display">
													{index + 1}
												</span>
												<span className="text-sm font-medium truncate max-w-20">
													{player.name}
												</span>
											</div>
											{player.status === "paid" && (
												<CheckCircle2 className="h-4 w-4" />
											)}
											{player.status === "awaiting" && (
												<Clock className="h-4 w-4" />
											)}
										</div>

										{vaquinhaEnabled && (
											<div className="mt-2">
												{player.status === "pending" && (
													<Button
														size="sm"
														variant="outline"
														className="w-full h-7 text-xs"
														onClick={() => handlePlayerPayment(player.name)}>
														Pagar
													</Button>
												)}
												{player.status === "awaiting" && (
													<Button
														size="sm"
														className="w-full h-7 text-xs bg-warning text-warning-foreground"
														onClick={() => handleConfirmReceived(player.name)}>
														Confirmar
													</Button>
												)}
												{player.status === "paid" && (
													<Button
														size="sm"
														variant="ghost"
														className="w-full h-7 text-xs"
														onClick={() => handleShowReceipt(player.name)}>
														Ver Recibo
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
									className="p-3 rounded-xl border-2 border-dashed border-border bg-card/50">
									<div className="flex items-center gap-2 text-muted-foreground">
										<span className="text-lg font-bold number-display">
											{index + 1}
										</span>
										<span className="text-sm">Vago</span>
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

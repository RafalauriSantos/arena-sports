import {
	CheckCircle,
	Copy,
	Download,
	MapPin,
	Calendar,
	Clock,
	CreditCard,
	Hash,
	ArrowLeft,
	Share2,
} from "lucide-react";
import { Booking } from "@/types/booking";
import { ARENA_SPORTS_CONFIG } from "@/config/arena";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface BookingConfirmationProps {
	booking: Booking;
	onContinue: () => void;
	onBack: () => void;
}

export function BookingConfirmation({
	booking,
	onContinue,
	onBack,
}: BookingConfirmationProps) {
	const { toast } = useToast();

	const displayDate = new Date(booking.date).toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const bookingCode = booking.id.toUpperCase().slice(0, 6).padStart(6, "0");

	const handleCopyCode = () => {
		navigator.clipboard.writeText(bookingCode);
		toast({
			title: "Código copiado!",
			description: `Código ${bookingCode} copiado para área de transferência`,
		});
	};

	const handleDownloadReceipt = () => {
		// Create receipt content
		const receiptContent = `
═══════════════════════════════════════
        ${ARENA_SPORTS_CONFIG.name}
═══════════════════════════════════════

✅ AGENDAMENTO CONFIRMADO!

Campo: ${booking.fieldName}
Data: ${displayDate}
Horário: ${booking.time}
Status: ${booking.status === "confirmed" ? "Pago" : "Pendente"}
Código: ${bookingCode}

Responsável: ${booking.bookedBy}
Forma de pagamento: ${booking.paymentType === "pix" ? "Pix" : "No Local"}
Valor: R$ ${(booking.pricePerPlayer * booking.totalPlayers)
			.toFixed(2)
			.replace(".", ",")}

═══════════════════════════════════════
        Obrigado pela preferência!
═══════════════════════════════════════
    `.trim();

		const blob = new Blob([receiptContent], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `comprovante-${bookingCode}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toast({
			title: "Comprovante baixado!",
			description: "O arquivo foi salvo no seu dispositivo",
		});
	};

	const handleShare = () => {
		const shareText = `✅ Agendamento confirmado!\n\n📍 ${ARENA_CONFIG.name}\n⚽ ${booking.fieldName}\n📅 ${displayDate}\n🕐 ${booking.time}\n🔢 Código: ${bookingCode}`;

		if (navigator.share) {
			navigator.share({
				title: "Confirmação de Agendamento",
				text: shareText,
			});
		} else {
			navigator.clipboard.writeText(shareText);
			toast({
				title: "Copiado para compartilhar!",
				description: "Cole em qualquer app para enviar",
			});
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="p-4 flex items-center gap-4 border-b border-border">
				<button
					onClick={onBack}
					className="p-2 rounded-lg hover:bg-secondary btn-press">
					<ArrowLeft className="w-5 h-5 text-foreground" />
				</button>
				<h1 className="text-lg font-bold text-foreground">Confirmação</h1>
			</header>

			<div className="flex-1 p-4 pb-28 md:pb-32 overflow-y-auto">
				{/* Success Icon */}
				<div className="flex flex-col items-center mb-6">
					<div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-scale-in">
						<CheckCircle className="w-12 h-12 text-primary" />
					</div>
					<h2 className="text-2xl font-bold text-foreground">
						Agendamento Confirmado!
					</h2>
					<p className="text-muted-foreground mt-1">
						Sua reserva foi registrada com sucesso
					</p>
				</div>

				{/* Booking Card */}
				<Card className="p-6 bg-card border-border mb-6">
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-primary/20">
								<MapPin className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Campo</p>
								<p className="font-semibold text-foreground">
									{booking.fieldName}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-primary/20">
								<Calendar className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Data</p>
								<p className="font-semibold text-foreground capitalize">
									{displayDate}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-primary/20">
								<Clock className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Horário</p>
								<p className="font-semibold text-foreground">{booking.time}</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-primary/20">
								<CreditCard className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Status</p>
								<p
									className={`font-semibold ${
										booking.status === "confirmed"
											? "text-primary"
											: "text-warning"
									}`}>
									{booking.status === "confirmed" ? "Pago" : "Pendente"}
								</p>
							</div>
						</div>

						<div className="pt-4 border-t border-border">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-secondary">
										<Hash className="w-5 h-5 text-muted-foreground" />
									</div>
									<div>
										<p className="text-sm text-muted-foreground">Código</p>
										<p className="font-bold text-xl text-foreground font-mono">
											{bookingCode}
										</p>
									</div>
								</div>
								<Button
									variant="outline"
									size="icon"
									onClick={handleCopyCode}
									className="border-primary text-primary hover:bg-primary/10">
									<Copy className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>
				</Card>

				{/* Action Buttons */}
				<div className="space-y-3">
					<Button
						onClick={handleDownloadReceipt}
						variant="outline"
						className="w-full h-12 border-primary text-primary hover:bg-primary/10 btn-press">
						<Download className="w-5 h-5 mr-2" />
						Baixar Comprovante
					</Button>

					<Button
						onClick={handleShare}
						variant="outline"
						className="w-full h-12 border-border text-foreground hover:bg-secondary btn-press">
						<Share2 className="w-5 h-5 mr-2" />
						Compartilhar
					</Button>

					<Button
						onClick={onContinue}
						className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground btn-press glow-primary">
						Gerenciar Time
					</Button>
				</div>
			</div>
		</div>
	);
}

import { useState } from "react";
import {
	X,
	Zap,
	Clock,
	DollarSign,
	CheckCircle,
	Shield,
	AlertTriangle,
} from "lucide-react";
import { TimeSlot, PaymentType } from "@/types/booking";
import { ARENA_SPORTS_CONFIG } from "@/config/arena";
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

export function PaymentDrawer({
	slot,
	isOpen,
	onClose,
	onConfirm,
}: PaymentDrawerProps) {
	const [name, setName] = useState("");

	if (!slot) return null;

	const field = ARENA_SPORTS_CONFIG.fields.find((f) => f.id === slot.fieldId);
	const priceLocal = field?.priceLocal || 160;
	const priceOnline = field?.priceOnline || 150;
	const signalAmount = 50;
	const remainingAmount = priceLocal - signalAmount;
	const discount = priceLocal - priceOnline;

	const handleConfirm = () => {
		if (name.trim()) {
			onConfirm(slot, "local", name.trim());
			setName("");
		}
	};

	const displayDate = new Date(slot.date).toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	return (
		<Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DrawerContent className="bg-card border-border max-h-[92vh] safe-area-bottom">
				<div className="mx-auto w-full max-w-md overflow-y-auto">
					<DrawerHeader className="text-left pb-2 px-4 pt-4">
						<div className="flex items-center justify-between">
							<div>
								<DrawerTitle className="text-lg md:text-xl font-bold text-foreground">
									Reserva: {slot.time}
								</DrawerTitle>
								<p className="text-xs md:text-sm text-primary mt-1">
									{field?.name}
								</p>
							</div>
							<button
								onClick={onClose}
								className="p-2 rounded-xl hover:bg-secondary transition-colors btn-press">
								<X className="w-5 h-5 text-muted-foreground" />
							</button>
						</div>
					</DrawerHeader>

					<div className="px-4 pb-6 md:pb-8 space-y-4 md:space-y-5">
						{/* Slot Info */}
						<div className="p-4 rounded-xl bg-secondary/50 border border-border">
							<div className="flex items-center gap-3">
								<div className="p-3 rounded-xl bg-primary/20">
									<Clock className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="font-bold text-lg text-foreground number-display">
										{slot.time}
									</p>
									<p className="text-sm text-muted-foreground capitalize">
										{displayDate}
									</p>
								</div>
							</div>
						</div>

						{/* Name Input */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Nome do Capitão
							</label>
							<Input
								placeholder="Seu nome completo"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="bg-secondary border-border focus:ring-primary h-12 text-base"
							/>
						</div>

						{/* Payment Options */}
						<div className="space-y-3">
							<p className="text-sm font-medium text-foreground">
								Confirmação da Reserva
							</p>

							{/* Only Option - Pay at Venue */}
							<div className="w-full p-4 rounded-xl border-2 border-warning bg-warning/10 text-left">
								<div className="flex items-start gap-3">
									<div className="p-2 rounded-lg bg-warning/20 mt-0.5">
										<DollarSign className="w-5 h-5 text-warning" />
									</div>
									<div className="flex-1">
										<p className="font-bold text-foreground">Pagar na Quadra</p>
										<p className="text-sm text-muted-foreground mt-1">
											Pagamento será feito no local (Pix ou dinheiro)
										</p>
									</div>
									<div className="text-right">
										<p className="text-xl font-black text-warning number-display">
											R$ {priceLocal}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Confirm Button */}
						<Button
							onClick={handleConfirm}
							disabled={!name.trim()}
							className="w-full h-12 md:h-14 text-base md:text-lg font-bold btn-press bg-warning hover:bg-warning/90 text-warning-foreground disabled:opacity-50 disabled:cursor-not-allowed mb-2">
							Confirmar Reserva
						</Button>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

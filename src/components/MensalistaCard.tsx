import { memo, useCallback } from "react";
import { Crown, MessageCircle, ArrowRight } from "lucide-react";
import { ARENA_SPORTS_CONFIG } from "@/config/arena";
import { cn } from "@/lib/utils";

export const MensalistaCard = memo(function MensalistaCard() {
	const handleClick = useCallback(() => {
		const message = encodeURIComponent(
			`Olá! Tenho interesse em ser *Mensalista* na ${ARENA_SPORTS_CONFIG.name}. Gostaria de saber mais sobre os horários fixos disponíveis.`
		);
		window.open(
			`https://wa.me/${ARENA_SPORTS_CONFIG.whatsapp}?text=${message}`,
			"_blank"
		);
	}, []);

	return (
		<button
			onClick={handleClick}
			className={cn(
				"w-full p-3 md:p-4 rounded-2xl border-2 border-gold/50 bg-gradient-to-r from-gold/10 to-gold/5",
				"hover:border-gold hover:glow-gold transition-all duration-300 btn-press",
				"flex items-center justify-between group"
			)}>
			<div className="flex items-center gap-2 md:gap-3">
				<div className="p-2 md:p-2.5 rounded-xl bg-gold/20">
					<Crown className="w-5 h-5 md:w-6 md:h-6 text-gold" />
				</div>
				<div className="text-left">
					<p className="font-bold text-sm md:text-base text-gold">
						Seja Mensalista
					</p>
					<p className="text-xs md:text-sm text-muted-foreground">
						Horário fixo toda semana
					</p>
				</div>
			</div>
			<div className="flex items-center gap-1.5 md:gap-2 text-gold">
				<MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
				<ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
			</div>
		</button>
	);
});

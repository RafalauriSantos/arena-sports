import { MessageCircle, Headphones, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ARENA_CONFIG } from "@/config/arena";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

interface SupportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
	const { tenantId } = useAuth();
	const [arenaName, setArenaName] = useState("minha arena");

	useEffect(() => {
		if (!tenantId || !open) return;

		const loadArenaName = async () => {
			try {
				const { data } = await supabase
					.from("tenants")
					.select("business_name")
					.eq("id", tenantId)
					.maybeSingle();

				if (data?.business_name) {
					setArenaName(data.business_name);
				}
			} catch (error) {
				console.error("Erro ao carregar nome da arena:", error);
			}
		};

		loadArenaName();
	}, [tenantId, open]);

	const handleWhatsAppClick = () => {
		const phone = ARENA_CONFIG.whatsapp || "5511999999999";
		const message = encodeURIComponent(
			`Olá! Preciso de suporte com o ${arenaName}.`
		);
		window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-white border-gray-200 shadow-xl">
				<DialogHeader>
					<DialogTitle className="text-center text-gray-900 text-xl font-semibold">
						Falar com Suporte
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col items-center py-6 space-y-4">
					{/* Ícone de Suporte */}
					<div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 shadow-lg">
						<Headphones className="h-10 w-10 text-white" />
					</div>

					<div className="text-center space-y-2">
						<h3 className="text-lg font-semibold text-gray-900">
							Equipe de Suporte
						</h3>
						<p className="text-sm text-gray-600">
							Estamos aqui para ajudar você com qualquer dúvida ou problema.
						</p>
					</div>

					<div className="w-full space-y-3 pt-2">
						<Button
							onClick={handleWhatsAppClick}
							className="w-full h-12 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold shadow-md">
							<MessageCircle className="w-5 h-5 mr-2" />
							Falar no WhatsApp
						</Button>

						<p className="text-xs text-gray-500 text-center">
							Resposta rápida via WhatsApp. Geralmente respondemos em até 1 hora.
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

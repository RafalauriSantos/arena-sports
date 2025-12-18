"use client";

import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
} from "@/components/ui/card";

export function DivulgacaoCard() {
        const handleShare = async () => {
                const publicBookingUrl = `${window.location.origin}/agendar`;
                const shareData = {
                        title: "Agende seu Jogo",
                        text: "Fala craque! ⚽ A agenda tá aberta. Clica aqui pra reservar:",
                        url: publicBookingUrl,
                };

                try {
                        if (navigator.share) {
                                await navigator.share(shareData);
                        } else {
                                // Fallback for desktop
                                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                                        `${shareData.text} ${shareData.url}`
                                )}`;
                                window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                        }
                } catch (error) {
                        console.error("Erro ao compartilhar:", error);
                        // Fallback for failed share attempt
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                                `${shareData.text} ${shareData.url}`
                        )}`;
                        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                }
        };

        return (
                <Card className="bg-slate-900 border-green-500/30 border">
                        <CardHeader className="flex flex-row items-start gap-4">
                                <div className="bg-green-500/10 p-3 rounded-full">
                                        <Megaphone className="w-6 h-6 text-green-400" />
                                </div>
                                <div className="flex-1">
                                        <CardTitle className="text-lg font-bold text-white">
                                                Bora lotar a quadra?
                                        </CardTitle>
                                        <CardDescription className="text-slate-400 mt-1">
                                                Clique no botão e envie o link para seus clientes. O sucesso é um
                                                clique de distância!
                                        </CardDescription>
                                </div>
                        </CardHeader>
                        <CardContent>
                                <Button
                                        onClick={handleShare}
                                        className="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-bold text-md animate-pulse"
                                        size="lg">
                                        <span className="mr-2">📢</span>
                                        DISPARAR NO WHATSAPP
                                </Button>
                        </CardContent>
                </Card>
        );
}

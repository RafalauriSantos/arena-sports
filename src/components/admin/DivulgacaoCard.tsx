/* eslint-disable react-refresh/only-export-components */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Link as LinkIcon, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function DivulgacaoCard() {
	const { toast } = useToast();
	const { tenantId } = useAuth();
	const [arenaName, setArenaName] = useState("Sua arena");
	const [subdomain, setSubdomain] = useState<string | null>(null);
	const [whatsapp, setWhatsapp] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		if (!tenantId) return;

		const loadTenant = async () => {
			try {
				const { data, error } = await supabase
					.from("tenants")
					.select("business_name, subdomain, phone")
					.eq("id", tenantId)
					.maybeSingle();

				if (!active) return;
				if (error) {
					console.error("Erro ao carregar tenant", error);
					return;
				}
				if (data) {
					if (data.business_name) setArenaName(data.business_name);
					if (data.subdomain) setSubdomain(data.subdomain);
					if (data.phone) setWhatsapp(data.phone);
				}
			} catch (err) {
				if (!active) return;
				console.error("Erro ao buscar tenant", err);
			}
		};

		loadTenant();

		return () => {
			active = false;
		};
	}, [tenantId]);

	const { shareLink } = useMemo(() => {
		const isBrowser = typeof window !== "undefined";

		// Lógica de Subdomínio vs ID
		let link = "";
		if (subdomain) {
			link = `https://${subdomain}.app.seusistema.com`; // Ajuste conforme seu domínio base real
		} else if (tenantId) {
			// Fallback para ID se não tiver subdomínio configurado
			const origin = isBrowser
				? window.location.origin
				: "https://e-sportivo.vercel.app";
			link = `${origin}/agendar/${tenantId}`;
		}

		return {
			shareLink: link,
		};
	}, [tenantId, subdomain]);

	const clickableLink = useMemo(
		() =>
			shareLink.startsWith("https://")
				? shareLink
				: shareLink.replace("http://", "https://"),
		[shareLink]
	);

	const message = useMemo(
		() =>
			`${
				arenaName ? `Bora reservar na ${arenaName}!` : "Fala galera!"
			} Link oficial: ${clickableLink}`,
		[arenaName, clickableLink]
	);

	const copyToClipboard = async () => {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(message);
			toast({
				title: "Link copiado",
				description: "Cole no app que preferir.",
			});
			return true;
		}
		return false;
	};

	const handleShare = async () => {
		try {
			// Usa o telefone do tenant se disponível para abrir o chat direto, ou share genérico
			const targetPhone = whatsapp ? whatsapp.replace(/\D/g, "") : "";
			const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(
				message
			)}`;
			window.open(whatsappUrl, "_blank", "noopener,noreferrer");
		} catch (error) {
			console.error("Erro ao abrir WhatsApp", error);
			const copied = await copyToClipboard();
			if (!copied)
				toast({
					title: "Copie o link",
					description: clickableLink,
					variant: "destructive",
				});
		}
	};

	return (
		<Card className="bg-slate-900 border-primary/30 border backdrop-blur">
			<CardHeader className="flex flex-row items-start gap-4">
				<div className="bg-primary/10 p-3 rounded-full">
					<Megaphone className="w-6 h-6 text-primary" />
				</div>
				<div className="flex-1 space-y-1">
					<CardTitle className="text-lg font-bold text-white">
						Bora lotar a quadra?
					</CardTitle>
					<CardDescription className="text-slate-400">
						Gere um link compartilhável e envie pelo WhatsApp, Instagram ou
						qualquer rede.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid gap-2">
					<label className="text-xs text-slate-400 flex items-center gap-2">
						<LinkIcon className="h-4 w-4" /> Link público da sua arena
					</label>
					<div className="flex items-center gap-2">
						<Input
							value={clickableLink}
							readOnly
							className="bg-slate-800/70 border-primary/20 text-white"
						/>
						<Button
							variant="outline"
							className="border-primary/50 text-white"
							onClick={copyToClipboard}
							type="button">
							<Copy className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<Button
					onClick={handleShare}
					className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-md"
					size="lg"
					type="button">
					<Share2 className="h-5 w-5 mr-2" />
					Disparar no WhatsApp
				</Button>
			</CardContent>
		</Card>
	);
}

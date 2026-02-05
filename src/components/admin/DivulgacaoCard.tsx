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

		// 🔥 REALTIME: Atualiza nome da arena, subdomain e telefone em tempo real
		const channel = supabase
			.channel(`divulgacao-tenant-${tenantId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "tenants",
					filter: `id=eq.${tenantId}`,
				},
				(payload) => {
					if (!active) return;
					const updated = payload.new as {
						business_name?: string;
						subdomain?: string;
						phone?: string;
					};
					if (updated.business_name) setArenaName(updated.business_name);
					if (updated.subdomain) setSubdomain(updated.subdomain);
					if (updated.phone) setWhatsapp(updated.phone);
					console.log(
						"✅ [DivulgacaoCard] Nome da arena atualizado em tempo real:",
						updated.business_name,
					);
				},
			)
			.subscribe();

		return () => {
			active = false;
			supabase.removeChannel(channel);
		};
	}, [tenantId]);

	const { shareLink } = useMemo(() => {
		const isBrowser = typeof window !== "undefined";

		// Sempre usar domínio de produção para links compartilháveis
		// Se estiver em desenvolvimento, usar variável de ambiente ou detectar automaticamente
		let origin = "";

		if (isBrowser) {
			// Detectar se está em produção ou desenvolvimento
			const isLocalhost =
				window.location.hostname === "localhost" ||
				window.location.hostname.includes("127.0.0.1") ||
				window.location.hostname.includes("192.168.");

			if (isLocalhost) {
				// Em desenvolvimento: usar variável de ambiente ou domínio de produção
				const prodUrl =
					import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_APP_URL;
				origin = prodUrl || "https://arenasys.com.br"; // Sempre usar domínio de produção em dev
			} else {
				// Em produção: sempre usar o domínio atual (já está em produção)
				origin = window.location.origin;
			}
		} else {
			origin = "https://arenasys.com.br"; // Domínio de produção
		}

		// Lógica de Subdomínio vs ID
		let link = "";
		if (subdomain) {
			// Usa a rota /agendar/:subdomain
			link = `${origin}/agendar/${subdomain}`;
		} else if (tenantId) {
			// Fallback para ID se não tiver subdomínio configurado (não recomendado, mas funciona)
			link = `${origin}/agendar/${tenantId}`;
		} else {
			// Se não tiver nem subdomain nem tenantId, retorna link vazio
			link = "";
		}

		return {
			shareLink: link,
		};
	}, [tenantId, subdomain]);

	const clickableLink = useMemo(
		() =>
			shareLink.startsWith("https://") ? shareLink : (
				shareLink.replace("http://", "https://")
			),
		[shareLink],
	);

	const message = useMemo(
		() =>
			`${
				arenaName ? `Bora reservar na ${arenaName}!` : "Fala galera!"
			} Link oficial: ${clickableLink}`,
		[arenaName, clickableLink],
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
				message,
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
							className="bg-slate-800/70 border-primary/20 text-white cursor-pointer"
							onClick={() => {
								if (clickableLink) {
									window.open(clickableLink, "_blank", "noopener,noreferrer");
								}
							}}
							title="Clique para abrir o link"
						/>
						<Button
							variant="outline"
							className="border-primary/50 text-white"
							onClick={() => {
								if (clickableLink) {
									window.open(clickableLink, "_blank", "noopener,noreferrer");
								} else {
									copyToClipboard();
								}
							}}
							type="button"
							title="Abrir link no navegador">
							<LinkIcon className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="border-primary/50 text-white"
							onClick={copyToClipboard}
							type="button"
							title="Copiar link">
							<Copy className="h-4 w-4" />
						</Button>
					</div>
					{clickableLink && (
						<a
							href={clickableLink}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-primary hover:text-primary/80 underline flex items-center gap-1">
							<LinkIcon className="h-3 w-3" />
							Abrir link em nova aba
						</a>
					)}
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

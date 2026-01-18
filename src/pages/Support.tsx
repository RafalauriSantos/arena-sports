import { ARENA_CONFIG } from "@/config/arena";

export default function Support() {
	const whatsapp = ARENA_CONFIG.whatsapp;
	const whatsappLink = whatsapp ? `https://wa.me/${whatsapp}` : null;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-3xl px-4 py-10">
				<h1 className="text-3xl font-bold tracking-tight">Suporte</h1>
				<p className="mt-2 text-muted-foreground">
					Canais de atendimento do {ARENA_CONFIG.name} (RS VERSALITYS).
				</p>

				<div className="mt-8 space-y-5 leading-relaxed">
					<section className="space-y-2">
						<h2 className="text-xl font-semibold">WhatsApp</h2>
						{whatsappLink ? (
							<a className="text-primary underline" href={whatsappLink}>
								Abrir WhatsApp ({whatsapp})
							</a>
						) : (
							<p className="text-muted-foreground">WhatsApp não configurado.</p>
						)}
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">E-mail</h2>
						<p className="text-muted-foreground">
							Defina um e-mail real de suporte (ex.: suporte@seudominio.com) e
							use o mesmo contato nos canais de cobrança.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">Políticas</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>
								<a className="text-primary underline" href="/privacy">
									Política de Privacidade
								</a>
							</li>
							<li>
								<a className="text-primary underline" href="/terms">
									Termos de Serviço
								</a>
							</li>
						</ul>
					</section>
				</div>
			</div>
		</div>
	);
}

import { ARENA_CONFIG } from "@/config/arena";

export default function TermsOfService() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-3xl px-4 py-10">
				<h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
				<p className="mt-2 text-muted-foreground">
					Última atualização: {new Date().toLocaleDateString("pt-BR")}
				</p>

				<div className="mt-8 space-y-6 leading-relaxed">
					<section className="space-y-2">
						<h2 className="text-xl font-semibold">1) Aceite</h2>
						<p>
							Ao usar o {ARENA_CONFIG.name}, você concorda com estes
							termos.
						</p>
						<p>O serviço é operado por RS VERSALITYS.</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">2) O serviço</h2>
						<p>
							A plataforma oferece recursos de agenda, reservas e gestão para
							arenas.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">
							3) Conta e responsabilidades
						</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>Você é responsável por manter sua senha em segurança.</li>
							<li>
								Você é responsável pelos dados informados e pelas reservas
								criadas.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">4) Pagamentos</h2>
						<p>
							Quando habilitado, pagamentos/assinaturas podem ser processados
							por provedores terceiros (ex.: Stripe). Condições de planos podem
							variar.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">5) Suporte</h2>
						<p>Para dúvidas e suporte, acesse:</p>
						<a className="text-primary underline" href="/support">
							Página de Suporte
						</a>
					</section>
				</div>
			</div>
		</div>
	);
}

import { ARENA_CONFIG } from "@/config/arena";

export default function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto w-full max-w-3xl px-4 py-10">
				<h1 className="text-3xl font-bold tracking-tight">
					Política de Privacidade
				</h1>
				<p className="mt-2 text-muted-foreground">
					Última atualização: {new Date().toLocaleDateString("pt-BR")}
				</p>

				<div className="mt-8 space-y-6 leading-relaxed">
					<section className="space-y-2">
						<h2 className="text-xl font-semibold">1) Quem somos</h2>
						<p>
							Este site/aplicativo ("{ARENA_CONFIG.name}") permite a gestão e
							agendamento de quadras esportivas.
						</p>
						<p>
							A operação e manutenção do serviço é realizada por RS VERSALITYS.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">2) Quais dados coletamos</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>
								Dados de conta: e-mail e informações necessárias para
								autenticação.
							</li>
							<li>
								Dados de agendamento: nome do cliente, telefone e horário da
								reserva.
							</li>
							<li>
								Dados técnicos: logs básicos de acesso e erro para segurança e
								melhoria do serviço.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">3) Como usamos os dados</h2>
						<ul className="list-disc pl-6 space-y-1">
							<li>
								Para operar o sistema de agenda, reservas e painel
								administrativo.
							</li>
							<li>Para suporte ao cliente e comunicação sobre o serviço.</li>
							<li>
								Para prevenção de fraude e melhoria contínua da plataforma.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">4) Compartilhamento</h2>
						<p>
							Podemos compartilhar dados com provedores essenciais para operar o
							serviço (ex.: autenticação e infraestrutura). Quando aplicável,
							dados de pagamento são processados por provedores de pagamento
							(ex.: Stripe).
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">5) Segurança</h2>
						<p>
							Adotamos medidas técnicas e organizacionais razoáveis para
							proteger os dados contra acesso não autorizado, perda ou
							alteração.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-xl font-semibold">6) Contato</h2>
						<p>
							Para dúvidas sobre privacidade ou solicitações relacionadas a
							dados, acesse a página de suporte.
						</p>
						<a className="text-primary underline" href="/support">
							Ir para Suporte
						</a>
					</section>
				</div>
			</div>
		</div>
	);
}

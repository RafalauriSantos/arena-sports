import { Link } from "react-router-dom";
import {
	Zap,
	ArrowLeft,
	FileText,
	Shield,
	CreditCard,
	UserCheck,
	Headphones,
} from "lucide-react";

export default function TermsOfService() {
	return (
		<main role="main" className="min-h-screen marketing-dark text-white">
			{/* Header */}
			<header className="border-b border-white/[0.04] sticky top-0 marketing-dark-muted backdrop-blur-xl z-50">
				<div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link
						to="/"
						className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm">
						<ArrowLeft className="w-4 h-4" />
						Voltar para Home
					</Link>
					<Link to="/" className="flex items-center gap-2">
						<div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
							<Zap className="w-4 h-4 text-white" />
						</div>
						<span className="font-bold text-white">ArenaSys</span>
					</Link>
				</div>
			</header>

			{/* Hero */}
			<div className="border-b border-white/[0.04]">
				<div className="max-w-4xl mx-auto px-6 py-16">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
							<FileText className="w-6 h-6 text-emerald-400" />
						</div>
					</div>
					<h1 className="text-4xl md:text-5xl font-black mb-4">
						Termos de Serviço
					</h1>
					<p className="text-gray-300 text-lg">
						Última atualização: Janeiro de 2025
					</p>
				</div>
			</div>

			{/* Content */}
			<main className="max-w-4xl mx-auto px-6 py-16">
				<div className="space-y-12">
					{/* Intro */}
					<p className="text-gray-300 text-lg leading-relaxed">
						Bem-vindo ao ArenaSys. Ao utilizar nossa plataforma, você concorda
						com os termos descritos abaixo. Leia atentamente antes de utilizar
						nossos serviços.
					</p>

					{/* Section 1 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<UserCheck className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">1. Aceitação dos Termos</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-300 leading-relaxed">
							<p>
								Ao acessar ou usar o ArenaSys, você declara ter lido,
								compreendido e concordado com estes Termos de Serviço.
							</p>
							<p>
								O serviço é operado por{" "}
								<strong className="text-white">RS VERSALITYS</strong>, empresa
								brasileira comprometida com a excelência na gestão de arenas
								esportivas.
							</p>
						</div>
					</section>

					{/* Section 2 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Zap className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">2. Descrição do Serviço</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-300 leading-relaxed">
							<p>
								O ArenaSys é uma plataforma de gestão para arenas esportivas que
								oferece:
							</p>
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Sistema de agendamento e reservas online</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Painel administrativo para gestão de quadras</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Integração com meios de pagamento</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Relatórios e análises de faturamento</span>
								</li>
							</ul>
						</div>
					</section>

					{/* Section 3 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Shield className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">
								3. Responsabilidades do Usuário
							</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-300 leading-relaxed">
							<p>Como usuário do ArenaSys, você se compromete a:</p>
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Manter suas credenciais de acesso em segurança</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Fornecer informações verdadeiras e atualizadas</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Utilizar a plataforma de forma ética e legal</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Não compartilhar sua conta com terceiros</span>
								</li>
							</ul>
						</div>
					</section>

					{/* Section 4 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<CreditCard className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">
								4. Pagamentos e Assinaturas
							</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-300 leading-relaxed">
							<p>
								Os pagamentos são processados por provedores terceiros
								confiáveis, como o <strong className="text-white">Asaas</strong>
								.
							</p>
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Assinaturas são renovadas automaticamente no ciclo escolhido
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Cancelamentos podem ser feitos a qualquer momento</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Não há reembolso proporcional em caso de cancelamento
									</span>
								</li>
							</ul>
						</div>
					</section>

					{/* Section 5 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Headphones className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">5. Suporte e Contato</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-300 leading-relaxed">
							<p>
								Para dúvidas, sugestões ou suporte técnico, estamos à
								disposição:
							</p>
							<div className="flex flex-wrap gap-3 mt-4">
								<Link
									to="/support"
									className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm">
									<Headphones className="w-4 h-4" />
									Página de Suporte
								</Link>
								<a
									href="mailto:contato@arenasys.com.br"
									className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors text-sm">
									contato@arenasys.com.br
								</a>
							</div>
						</div>
					</section>
				</div>
			</main>

			{/* Footer simples */}
			<footer className="border-t border-white/[0.04] py-8">
				<div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-300 text-sm">
					<p>© 2025 ArenaSys. Todos os direitos reservados.</p>
					<div className="flex items-center gap-6">
						<Link to="/privacy" className="hover:text-white transition-colors">
							Privacidade
						</Link>
						<Link to="/support" className="hover:text-white transition-colors">
							Suporte
						</Link>
					</div>
				</div>
			</footer>
		</main>
	);
}

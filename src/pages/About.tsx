import { Link, useNavigate } from "react-router-dom";
import {
	Zap,
	ArrowLeft,
	Target,
	Users,
	Heart,
	Sparkles,
	TrendingUp,
	Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
	const navigate = useNavigate();

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
				<div className="max-w-4xl mx-auto px-6 py-20">
					<div className="flex items-center gap-3 mb-6">
						<div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center">
							<Zap className="w-7 h-7 text-white" />
						</div>
					</div>
					<h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
						Libertar donos de arena
						<br />
						<span className="text-emerald-400">do caos do WhatsApp</span>
					</h1>
					<p className="text-gray-300 text-xl max-w-2xl leading-relaxed">
						Nascemos com uma missão simples: transformar quadras esportivas em
						negócios lucrativos e previsíveis.
					</p>
				</div>
			</div>

			{/* Mission, Vision, Values */}
			<section className="max-w-4xl mx-auto px-6 py-20">
				<div className="grid md:grid-cols-3 gap-6">
					<div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
						<div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
							<Target className="w-6 h-6 text-emerald-400" />
						</div>
						<h3 className="text-xl font-bold mb-3">Nossa Missão</h3>
						<p className="text-gray-300 text-sm leading-relaxed">
							Democratizar a gestão profissional de quadras esportivas,
							permitindo que qualquer arena — de 1 ou 10 quadras — opere como um
							negócio moderno.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">
							<Users className="w-6 h-6 text-gray-300" />
						</div>
						<h3 className="text-xl font-bold mb-3">Nossa Visão</h3>
						<p className="text-gray-300 text-sm leading-relaxed">
							Ser a infraestrutura financeira e operacional de todas as arenas
							esportivas do Brasil, conectando jogadores e donos de quadra.
						</p>
					</div>

					<div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">
							<Heart className="w-6 h-6 text-gray-300" />
						</div>
						<h3 className="text-xl font-bold mb-3">Nossos Valores</h3>
						<p className="text-gray-300 text-sm leading-relaxed">
							Simplicidade acima de tudo. Lucro para o cliente primeiro.
							Tecnologia que serve pessoas.
						</p>
					</div>
				</div>
			</section>

			{/* The Problem */}
			<section className="border-y border-white/[0.04]">
				<div className="max-w-4xl mx-auto px-6 py-20">
					<h2 className="text-3xl font-black mb-12 text-center">
						Por que o ArenaSys existe?
					</h2>

					<div className="grid md:grid-cols-2 gap-6">
						{/* Problem */}
						<div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
							<div className="flex items-center gap-3 mb-4">
								<span className="text-2xl">😰</span>
								<h3 className="text-xl font-bold text-red-400">O Problema</h3>
							</div>
							<ul className="space-y-3 text-gray-300">
								<li className="flex items-start gap-2">
									<span className="text-red-400 mt-1">•</span>
									<span>4+ horas por dia no WhatsApp respondendo clientes</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-red-400 mt-1">•</span>
									<span>Reservas perdidas por demora na resposta</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-red-400 mt-1">•</span>
									<span>Calotes constantes de quem "esqueceu" de pagar</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-red-400 mt-1">•</span>
									<span>Zero visibilidade do próprio faturamento</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-red-400 mt-1">•</span>
									<span>Impossível tirar férias sem o negócio parar</span>
								</li>
							</ul>
						</div>

						{/* Solution */}
						<div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
							<div className="flex items-center gap-3 mb-4">
								<span className="text-2xl">🚀</span>
								<h3 className="text-xl font-bold text-emerald-400">
									Nossa Solução
								</h3>
							</div>
							<ul className="space-y-3 text-gray-300">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Cliente reserva e paga online, 24/7</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Sistema confirma automaticamente</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Pagamento antecipado elimina calotes</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Dashboard completo de faturamento</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Sua arena funciona enquanto você vive</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* Why Different */}
			<section className="max-w-4xl mx-auto px-6 py-20">
				<h2 className="text-3xl font-black mb-12 text-center">
					O que nos diferencia
				</h2>

				<div className="grid sm:grid-cols-3 gap-6">
					<div className="text-center p-6">
						<div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
							<Sparkles className="w-7 h-7 text-emerald-400" />
						</div>
						<h3 className="font-bold mb-2">Simplicidade</h3>
						<p className="text-gray-300 text-sm">
							Interface intuitiva que qualquer pessoa consegue usar em minutos.
						</p>
					</div>

					<div className="text-center p-6">
						<div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
							<TrendingUp className="w-7 h-7 text-emerald-400" />
						</div>
						<h3 className="font-bold mb-2">ROI Imediato</h3>
						<p className="text-gray-300 text-sm">
							O sistema se paga na primeira semana com redução de calotes.
						</p>
					</div>

					<div className="text-center p-6">
						<div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
							<Shield className="w-7 h-7 text-emerald-400" />
						</div>
						<h3 className="font-bold mb-2">Suporte Real</h3>
						<p className="text-gray-300 text-sm">
							Time brasileiro que entende seu negócio e responde rápido.
						</p>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-white/[0.04]">
				<div className="max-w-4xl mx-auto px-6 py-20 text-center">
					<h2 className="text-3xl md:text-4xl font-black mb-4">
						Pronto para transformar sua arena?
					</h2>
					<p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
						Comece grátis por 7 dias. Sem cartão de crédito. Sem compromisso.
					</p>
					<Button
						onClick={() => navigate("/login?mode=signup")}
						aria-label="Começar teste grátis por 7 dias do ArenaSys"
						className="h-14 px-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full text-lg">
						Começar Grátis por 7 Dias
					</Button>
				</div>
			</section>

			{/* Footer simples */}
			<footer className="border-t border-white/[0.04] py-8">
				<div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-300 text-sm">
					<p>© 2025 ArenaSys. Todos os direitos reservados.</p>
					<div className="flex items-center gap-6">
						<Link to="/terms" className="hover:text-white transition-colors">
							Termos
						</Link>
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

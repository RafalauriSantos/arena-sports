import { Link } from "react-router-dom";
import {
	Zap,
	ArrowLeft,
	ShieldCheck,
	Eye,
	Database,
	Share2,
	Lock,
	Mail,
} from "lucide-react";

export default function PrivacyPolicy() {
	return (
		<main role="main" className="min-h-screen bg-[#02040a] text-white">
			{/* Header */}
			<header className="border-b border-white/[0.04] sticky top-0 bg-[#02040a]/80 backdrop-blur-xl z-50">
				<div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link
						to="/"
						className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
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
							<ShieldCheck className="w-6 h-6 text-emerald-400" />
						</div>
					</div>
					<h1 className="text-4xl md:text-5xl font-black mb-4">
						Política de Privacidade
					</h1>
					<p className="text-gray-400 text-lg">
						Última atualização: Janeiro de 2025
					</p>
				</div>
			</div>

			{/* Content */}
			<main className="max-w-4xl mx-auto px-6 py-16">
				<div className="space-y-12">
					{/* Intro */}
					<p className="text-gray-300 text-lg leading-relaxed">
						Sua privacidade é importante para nós. Esta política explica quais
						dados coletamos, como os utilizamos e quais são seus direitos.
					</p>

					{/* Section 1 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Zap className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">1. Quem Somos</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-400 leading-relaxed">
							<p>
								O <strong className="text-white">ArenaSys</strong> é uma
								plataforma de gestão para arenas esportivas, desenvolvida e
								operada por{" "}
								<strong className="text-white">RS VERSALITYS</strong>.
							</p>
							<p>
								Nosso objetivo é simplificar a gestão de quadras esportivas,
								permitindo agendamentos online, controle financeiro e
								relacionamento com clientes.
							</p>
						</div>
					</section>

					{/* Section 2 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Database className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">2. Dados que Coletamos</h2>
						</div>
						<div className="pl-[52px] space-y-4 text-gray-400 leading-relaxed">
							<div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
								<h3 className="text-white font-medium mb-2">Dados de Conta</h3>
								<p className="text-sm">
									E-mail, nome e informações necessárias para autenticação e
									acesso à plataforma.
								</p>
							</div>
							<div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
								<h3 className="text-white font-medium mb-2">
									Dados de Agendamento
								</h3>
								<p className="text-sm">
									Nome do cliente, telefone, horário e quadra da reserva.
								</p>
							</div>
							<div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
								<h3 className="text-white font-medium mb-2">Dados Técnicos</h3>
								<p className="text-sm">
									Logs de acesso, endereço IP e informações do dispositivo para
									segurança e análise.
								</p>
							</div>
						</div>
					</section>

					{/* Section 3 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Eye className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">3. Como Usamos os Dados</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-400 leading-relaxed">
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Operar o sistema de agenda, reservas e painel administrativo
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Fornecer suporte ao cliente e comunicação sobre o serviço
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Prevenir fraudes e atividades maliciosas</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Melhorar continuamente a plataforma com base em análises
									</span>
								</li>
							</ul>
						</div>
					</section>

					{/* Section 4 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Share2 className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">
								4. Compartilhamento de Dados
							</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-400 leading-relaxed">
							<p>Seus dados podem ser compartilhados com:</p>
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Provedores de infraestrutura (hosting e banco de dados)
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>
										Processadores de pagamento (ex.: Asaas) quando aplicável
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Autoridades legais quando exigido por lei</span>
								</li>
							</ul>
							<p className="text-sm mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
								<strong className="text-emerald-400">Importante:</strong> Nunca
								vendemos seus dados pessoais.
							</p>
						</div>
					</section>

					{/* Section 5 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Lock className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">5. Segurança dos Dados</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-400 leading-relaxed">
							<p>
								Implementamos medidas técnicas e organizacionais para proteger
								seus dados:
							</p>
							<div className="grid sm:grid-cols-3 gap-3 mt-4">
								<div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
									<Lock className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
									<span className="text-sm">Criptografia SSL/TLS</span>
								</div>
								<div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
									<ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
									<span className="text-sm">Dados Criptografados</span>
								</div>
								<div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
									<Database className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
									<span className="text-sm">Servidores no Brasil</span>
								</div>
							</div>
						</div>
					</section>

					{/* Section 6 */}
					<section className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
								<Mail className="w-5 h-5 text-emerald-400" />
							</div>
							<h2 className="text-2xl font-bold">6. Seus Direitos</h2>
						</div>
						<div className="pl-[52px] space-y-3 text-gray-400 leading-relaxed">
							<p>De acordo com a LGPD, você tem direito a:</p>
							<ul className="space-y-2">
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Acessar seus dados pessoais</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Corrigir informações incorretas</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Solicitar exclusão dos seus dados</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-emerald-400 mt-1">•</span>
									<span>Portabilidade para outro serviço</span>
								</li>
							</ul>
							<div className="flex flex-wrap gap-3 mt-4">
								<Link
									to="/support"
									className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm">
									<Mail className="w-4 h-4" />
									Fale com o Suporte
								</Link>
							</div>
						</div>
					</section>
				</div>
			</main>

			{/* Footer simples */}
			<footer className="border-t border-white/[0.04] py-8">
				<div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
					<p>© 2025 ArenaSys. Todos os direitos reservados.</p>
					<div className="flex items-center gap-6">
						<Link to="/terms" className="hover:text-white transition-colors">
							Termos de Serviço
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

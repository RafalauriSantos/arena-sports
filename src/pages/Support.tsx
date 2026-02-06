import { Link } from "react-router-dom";
import {
	Zap,
	ArrowLeft,
	Headphones,
	MessageCircle,
	Mail,
	Clock,
	FileText,
	ShieldCheck,
} from "lucide-react";
import { ARENA_CONFIG } from "@/config/arena";
import { Button } from "@/components/ui/button";

export default function Support() {
	const whatsapp = ARENA_CONFIG.whatsapp;
	const whatsappLink = whatsapp ? `https://wa.me/${whatsapp}` : null;

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
							<Headphones className="w-6 h-6 text-emerald-400" />
						</div>
					</div>
					<h1 className="text-4xl md:text-5xl font-black mb-4">
						Central de Suporte
					</h1>
					<p className="text-gray-400 text-lg max-w-xl">
						Estamos aqui para ajudar. Escolha o canal de atendimento que
						preferir.
					</p>
				</div>
			</div>

			{/* Content */}
			<main className="max-w-4xl mx-auto px-6 py-16">
				{/* Contact Cards */}
				<div className="grid md:grid-cols-2 gap-6 mb-16">
					{/* WhatsApp */}
					<div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
						<div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
							<MessageCircle className="w-6 h-6 text-emerald-400" />
						</div>
						<h3 className="text-xl font-bold mb-2">WhatsApp</h3>
						<p className="text-gray-400 text-sm mb-4">
							Atendimento rápido via mensagem. Resposta em até 2 horas úteis.
						</p>
						{whatsappLink ?
							<a href={whatsappLink} target="_blank" rel="noopener noreferrer">
								<Button className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl">
									<MessageCircle className="w-4 h-4 mr-2" />
									Abrir WhatsApp
								</Button>
							</a>
						:	<p className="text-gray-500 text-sm">WhatsApp não configurado.</p>}
						{whatsapp && (
							<p className="text-gray-500 text-xs mt-3 text-center">
								+{whatsapp.slice(0, 2)} ({whatsapp.slice(2, 4)}){" "}
								{whatsapp.slice(4, 9)}-{whatsapp.slice(9)}
							</p>
						)}
					</div>

					{/* Email */}
					<div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
						<div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">
							<Mail className="w-6 h-6 text-gray-400" />
						</div>
						<h3 className="text-xl font-bold mb-2">E-mail</h3>
						<p className="text-gray-400 text-sm mb-4">
							Para assuntos mais complexos ou documentação. Resposta em até 24
							horas.
						</p>
						<a href="mailto:contato@arenasys.com.br">
							<Button
								variant="outline"
								className="w-full h-11 border-white/10 hover:bg-white/5 text-white font-medium rounded-xl">
								<Mail className="w-4 h-4 mr-2" />
								contato@arenasys.com.br
							</Button>
						</a>
					</div>
				</div>

				{/* Horários */}
				<section className="mb-16">
					<div className="flex items-center gap-3 mb-6">
						<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
							<Clock className="w-5 h-5 text-emerald-400" />
						</div>
						<h2 className="text-2xl font-bold">Horário de Atendimento</h2>
					</div>
					<div className="grid sm:grid-cols-2 gap-4">
						<div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
							<span className="text-emerald-400 text-sm font-medium">
								Segunda a Sexta
							</span>
							<p className="text-white text-lg font-bold mt-1">9h às 18h</p>
						</div>
						<div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
							<span className="text-emerald-400 text-sm font-medium">
								Sábados
							</span>
							<p className="text-white text-lg font-bold mt-1">9h às 12h</p>
						</div>
					</div>
					<p className="text-gray-500 text-sm mt-4">
						* Horário de Brasília (GMT-3). Atendimento via WhatsApp pode ter
						resposta mais rápida.
					</p>
				</section>

				{/* Links úteis */}
				<section>
					<h2 className="text-2xl font-bold mb-6">Links Úteis</h2>
					<div className="grid sm:grid-cols-2 gap-4">
						<Link
							to="/terms"
							className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] transition-colors group">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
								<FileText className="w-5 h-5 text-gray-400" />
							</div>
							<div>
								<h3 className="font-medium text-white">Termos de Serviço</h3>
								<p className="text-gray-500 text-sm">
									Condições de uso da plataforma
								</p>
							</div>
						</Link>
						<Link
							to="/privacy"
							className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] transition-colors group">
							<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
								<ShieldCheck className="w-5 h-5 text-gray-400" />
							</div>
							<div>
								<h3 className="font-medium text-white">
									Política de Privacidade
								</h3>
								<p className="text-gray-500 text-sm">
									Como protegemos seus dados
								</p>
							</div>
						</Link>
					</div>
				</section>
			</main>

			{/* Footer simples */}
			<footer className="border-t border-white/[0.04] py-8">
				<div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
					<p>© 2025 ArenaSys. Todos os direitos reservados.</p>
					<div className="flex items-center gap-6">
						<Link to="/terms" className="hover:text-white transition-colors">
							Termos
						</Link>
						<Link to="/privacy" className="hover:text-white transition-colors">
							Privacidade
						</Link>
					</div>
				</div>
			</footer>
		</main>
	);
}

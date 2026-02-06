import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Lock, ShieldCheck } from "lucide-react";

export function PremiumFooter() {
	return (
		<footer className="relative z-50 bg-[#050507] border-t border-emerald-500/10">
			{/* Newsletter Section */}
			<div className="border-b border-white/[0.04]">
				<div className="max-w-6xl mx-auto px-6 py-12">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<div>
							<h3 className="text-white font-semibold text-lg mb-1">
								Fique por dentro das novidades
							</h3>
							<p className="text-gray-300 text-sm">
								Receba dicas de gestão e atualizações do ArenaSys.
							</p>
						</div>
						<div className="flex items-center gap-3 w-full md:w-auto">
							<input
								type="email"
								placeholder="seu@email.com"
								className="flex-1 md:w-64 h-10 px-4 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
							/>
							<Button className="h-10 px-5 bg-white text-black font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
								Inscrever-se
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Navigation */}
			<div className="max-w-6xl mx-auto px-6 py-14">
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
					{/* Explore */}
					<div>
						<h4 className="text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-4">
							Explore
						</h4>
						<ul className="space-y-3">
							<li>
								<a
									href="#pricing"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Preços
								</a>
							</li>
							<li>
								<a
									href="#comparison"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Recursos
								</a>
							</li>
							<li>
								<a
									href="#faq"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Perguntas Frequentes
								</a>
							</li>
							<li>
								<Link
									to="/login"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Acessar Plataforma
								</Link>
							</li>
						</ul>
					</div>

					{/* Empresa */}
					<div>
						<h4 className="text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-4">
							Empresa
						</h4>
						<ul className="space-y-3">
							<li>
								<Link
									to="/about"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Sobre Nós
								</Link>
							</li>
							<li>
								<Link
									to="/support"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Suporte
								</Link>
							</li>
							<li>
								<a
									href="mailto:contato@arenasys.com.br"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Contato
								</a>
							</li>
						</ul>
					</div>

					{/* Legal */}
					<div>
						<h4 className="text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-4">
							Legal
						</h4>
						<ul className="space-y-3">
							<li>
								<Link
									to="/terms"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Termos de Serviço
								</Link>
							</li>
							<li>
								<Link
									to="/privacy"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Política de Privacidade
								</Link>
							</li>
						</ul>
					</div>

					{/* Comunidade */}
					<div>
						<h4 className="text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-4">
							Comunidade
						</h4>
						<ul className="space-y-3">
							<li>
								<a
									href="https://instagram.com/arenasys"
									target="_blank"
									rel="noopener noreferrer"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									Instagram
								</a>
							</li>
							<li>
								<a
									href="https://wa.me/5515981642350"
									target="_blank"
									rel="noopener noreferrer"
									className="text-gray-300 text-[13px] hover:text-white transition-colors">
									WhatsApp
								</a>
							</li>
						</ul>
					</div>

					{/* Segurança */}
					<div className="col-span-2 sm:col-span-1">
						<h4 className="text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-4">
							Segurança
						</h4>
						<ul className="space-y-3">
							<li className="flex items-center gap-2 text-gray-300 text-[13px]">
								<Lock className="w-3.5 h-3.5" />
								<span>SSL/TLS Criptografado</span>
							</li>
							<li className="flex items-center gap-2 text-gray-300 text-[13px]">
								<ShieldCheck className="w-3.5 h-3.5" />
								<span>Dados Protegidos</span>
							</li>
							<li className="flex items-center gap-2 text-gray-300 text-[13px]">
								<svg
									className="w-3.5 h-3.5"
									fill="currentColor"
									viewBox="0 0 24 24">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
								</svg>
								<span>Servidores no Brasil</span>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="border-t border-white/[0.04]">
				<div className="max-w-6xl mx-auto px-6 py-5">
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						{/* Logo & Copyright */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md flex items-center justify-center">
									<Zap className="w-3.5 h-3.5 text-white" />
								</div>
								<span className="font-bold text-white text-sm">ArenaSys</span>
							</div>
							<span className="text-gray-400 text-[11px] hidden sm:inline">
								|
							</span>
							<p className="text-gray-300 text-[11px] hidden sm:inline">
								© 2025 ArenaSys. Todos os direitos reservados.
							</p>
						</div>

						{/* Legal Links */}
						<div className="flex items-center gap-5 text-[11px]">
							<Link
								to="/terms"
								className="text-gray-300 hover:text-gray-300 transition-colors">
								Termos
							</Link>
							<Link
								to="/privacy"
								className="text-gray-300 hover:text-gray-300 transition-colors">
								Privacidade
							</Link>
							<span className="text-gray-400">Brasil 🇧🇷</span>
						</div>
					</div>

					{/* Mobile Copyright */}
					<p className="text-gray-300 text-[11px] text-center mt-4 sm:hidden">
						© 2025 ArenaSys. Todos os direitos reservados.
					</p>
				</div>
			</div>
		</footer>
	);
}

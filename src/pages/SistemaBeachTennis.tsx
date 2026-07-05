/**
 * Página SEO: Sistema para Beach Tennis
 */

import { SEO } from "../components/SEO";
import { Header } from "../components/Header";
import { PremiumFooter } from "../components/PremiumFooter";
import { useNavigate } from "react-router-dom";

export function SistemaBeachTennis() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen marketing-dark text-white">
			<SEO
				title="Sistema de Agendamento para Beach Tennis | Gestão de Quadras"
				description="Sistema especializado em quadras de beach tennis e padel. Agendamento online, pagamento no local ou via WhatsApp, controle de horários e mensalistas. Teste grátis 7 dias."
				keywords="sistema beach tennis, agendamento padel, software quadra beach tennis, gestão beach tennis, sistema reserva beach"
				canonical="/sistema-beach-tennis"
			/>

			<Header />

			<main className="container mx-auto px-4 py-12 max-w-4xl" role="main">
				<h1 className="text-4xl md:text-5xl font-bold mb-6">
					Sistema de Gestão para Quadras de Beach Tennis e Padel
				</h1>

				<div className="prose prose-invert max-w-none">
					<p className="text-xl text-gray-300 mb-8">
						Beach tennis está em alta! Gerencie suas quadras com
						profissionalismo. Agendamento online 24/7, pagamentos automáticos e
						controle total.
					</p>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Por que beach tennis precisa de um sistema específico?
					</h2>
					<p className="text-gray-300 mb-4">
						Quadras de beach tennis tem alta rotatividade, horários de 1 hora, e
						clientes exigentes. Gerenciar via WhatsApp é caótico. Com ArenaSys
						você profissionaliza:
					</p>
					<ul className="text-gray-300 mb-8 space-y-2">
						<li>
							🎾 <strong>Horários de 1 hora</strong> - configuração perfeita
							para beach
						</li>
						<li>
							💳 <strong>Pagamento no local ou via WhatsApp</strong> - fluxo
							simples para o cliente
						</li>
						<li>
							📱 <strong>Link exclusivo</strong> - clientes agendam pelo celular
						</li>
						<li>
							⏰ <strong>Lembretes automáticos</strong> - reduz esquecimento
						</li>
						<li>
							📊 <strong>Relatórios por quadra</strong> - saiba qual rende mais
						</li>
					</ul>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Funcionalidades para arenas de beach tennis
					</h2>
					<div className="grid md:grid-cols-2 gap-6 mb-8">
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								🏖️ Múltiplas quadras
							</h3>
							<p className="text-gray-300">
								Gerencie quantas quadras tiver no mesmo lugar
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								🌞 Preços por horário
							</h3>
							<p className="text-gray-300">
								Manhã, tarde, noite - cada um com seu preço
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">👥 Mensalistas</h3>
							<p className="text-gray-300">
								Horários fixos garantidos automaticamente
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								💰 Pagamento flexivel
							</h3>
							<p className="text-gray-300">
								Pagamento no local ou via WhatsApp
							</p>
						</div>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Como funciona?</h2>
					<ol className="text-gray-300 space-y-4 mb-8 list-decimal list-inside">
						<li>
							<strong>Você configura:</strong> Nome das quadras, horários
							disponíveis, preços.
						</li>
						<li>
							<strong>Recebe um link:</strong> Ex:
							arenasys.com.br/agendar/beachparadise
						</li>
						<li>
							<strong>Divulga o link:</strong> Instagram, WhatsApp Status,
							Stories.
						</li>
						<li>
							<strong>Clientes agendam sozinhos:</strong> Escolhem quadra,
							horário e confirmam o pagamento no local ou via WhatsApp.
						</li>
						<li>
							<strong>Você só confirma:</strong> Tudo aparece no dashboard. Zero
							trabalho manual.
						</li>
					</ol>

					<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 my-8">
						<h3 className="text-2xl font-bold mb-4">
							Comece Hoje - Teste Grátis 7 Dias
						</h3>
						<p className="text-gray-300 mb-6">
							Configure suas quadras em 10 minutos. Sem cartão de crédito. Sem
							complicação.
						</p>
						<button
							onClick={() => navigate("/login?mode=signup")}
							aria-label="Começar teste grátis de 7 dias do sistema para beach tennis"
							className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
							Começar Teste Grátis
						</button>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Quanto custa?</h2>
					<p className="text-gray-300 mb-4">
						<strong className="text-emerald-400">R$ 69,90/mês</strong> para
						agendamento ilimitado, sem fidelidade. Compare: você paga mais caro
						em luz de uma quadra por mês do que no sistema completo.
					</p>

					<h2 className="text-3xl font-bold mt-12 mb-4">Case real</h2>
					<div className="bg-white/5 p-6 rounded-lg mb-8">
						<p className="text-gray-300 italic mb-4">
							"Antes era WhatsApp o dia todo confirmando horários. Agora o
							sistema faz tudo. Clientes adoram porque veem horários disponíveis
							em tempo real. Faturamento aumentou 40% porque não perco mais
							reservas."
						</p>
						<p className="text-gray-300">— Arena Beach Club, São Paulo/SP</p>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Também serve para:</h2>
					<ul className="text-gray-300 space-y-2">
						<li>🎾 Padel</li>
						<li>🏸 Tênis</li>
						<li>🏐 Vôlei de praia</li>
						<li>⚽ Futebol de areia</li>
					</ul>
				</div>
			</main>

			<PremiumFooter />
		</div>
	);
}

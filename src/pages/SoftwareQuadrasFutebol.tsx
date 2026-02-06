/**
 * Página SEO: Software para Quadras de Futebol
 */

import { SEO } from "../components/SEO";
import { Header } from "../components/Header";
import { PremiumFooter } from "../components/PremiumFooter";
import { useNavigate } from "react-router-dom";

export function SoftwareQuadrasFutebol() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-[#02040a] text-white">
			<SEO
				title="Software para Quadras de Futebol e Society | Gestão Completa"
				description="Software completo para gestão de quadras de futebol society, futsal e campo. Agendamento online, pagamento PIX, controle de horários. Teste grátis 7 dias."
				keywords="software quadras futebol, sistema quadra society, gestão futsal, agendamento campo futebol, sistema aluguel quadra society"
				canonical="/software-quadras-futebol"
			/>

			<Header />

			<main className="container mx-auto px-4 py-12 max-w-4xl">
				<h1 className="text-4xl md:text-5xl font-bold mb-6">
					Software para Gestão de Quadras de Futebol e Society
				</h1>

				<div className="prose prose-invert max-w-none">
					<p className="text-xl text-gray-300 mb-8">
						Gerencie sua quadra de futebol society, futsal ou campo com
						tecnologia profissional. Sistema completo de agendamento, pagamentos
						e controle de reservas.
					</p>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Por que usar um software para sua quadra de futebol?
					</h2>
					<p className="text-gray-300 mb-4">
						Gerenciar quadras de futebol manualmente gera conflitos de horários,
						pagamentos atrasados e perda de clientes. Com o ArenaSys, você
						automatiza todo o processo:
					</p>
					<ul className="text-gray-300 mb-8 space-y-2">
						<li>
							✅ <strong>Zero conflitos de horários</strong> - sistema atualiza
							em tempo real
						</li>
						<li>
							✅ <strong>Pagamentos automáticos via PIX</strong> - receba na
							hora
						</li>
						<li>
							✅ <strong>Link público para clientes</strong> - agendam sozinhos
							24/7
						</li>
						<li>
							✅ <strong>Controle de mensalistas</strong> - horários fixos
							garantidos
						</li>
						<li>
							✅ <strong>Relatórios completos</strong> - saiba quanto fatura por
							quadra
						</li>
					</ul>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Funcionalidades específicas para quadras de futebol
					</h2>
					<div className="grid md:grid-cols-2 gap-6 mb-8">
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								⚽ Múltiplas quadras
							</h3>
							<p className="text-gray-400">
								Gerencie society, futsal e campo no mesmo sistema
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								⏰ Horários flexíveis
							</h3>
							<p className="text-gray-400">
								Configure preços por horário (pico, off-peak)
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								👥 Gestão de clientes
							</h3>
							<p className="text-gray-400">
								Histórico completo, mensalistas e avulsos
							</p>
						</div>
						<div className="bg-white/5 p-6 rounded-lg">
							<h3 className="text-xl font-semibold mb-2">
								💰 Controle financeiro
							</h3>
							<p className="text-gray-400">
								Saiba exatamente quanto cada quadra fatura
							</p>
						</div>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Quanto custa?</h2>
					<p className="text-gray-300 mb-4">
						A partir de <strong className="text-emerald-400">R$ 97/mês</strong>.
						Muito mais barato que contratar alguém para atender telefone e
						anotar reservas. E você pode testar grátis por 7 dias.
					</p>

					<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 my-8">
						<h3 className="text-2xl font-bold mb-4">Teste Grátis por 7 Dias</h3>
						<p className="text-gray-300 mb-6">
							Sem cartão de crédito. Configure suas quadras em 10 minutos e
							comece a receber reservas.
						</p>
						<button
							onClick={() => navigate("/welcome")}
							className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
							Começar Teste Grátis
						</button>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Casos de uso reais</h2>
					<ul className="text-gray-300 space-y-4 mb-8">
						<li>
							<strong>Arena com 3 quadras society:</strong> Reduziu conflitos de
							100% para 0%. Clientes agendam pelo link, pagam PIX automático.
						</li>
						<li>
							<strong>Campo de futsal com mensalistas:</strong> Sistema garante
							horários fixos e abre vagas para avulsos automaticamente.
						</li>
						<li>
							<strong>Complexo esportivo:</strong> Gerencia society, futsal e
							vôlei no mesmo lugar. Dashboard mostra faturamento em tempo real.
						</li>
					</ul>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Perguntas frequentes
					</h2>
					<div className="space-y-6 mb-8">
						<div>
							<h3 className="text-xl font-semibold mb-2">
								Preciso ter conhecimento técnico?
							</h3>
							<p className="text-gray-400">
								Não. É tão simples quanto usar WhatsApp. Você configura suas
								quadras, horários e pronto. Sistema faz o resto.
							</p>
						</div>
						<div>
							<h3 className="text-xl font-semibold mb-2">
								Meus clientes precisam criar conta?
							</h3>
							<p className="text-gray-400">
								Não. Eles acessam o link, escolhem horário e pagam. Simples
								assim.
							</p>
						</div>
						<div>
							<h3 className="text-xl font-semibold mb-2">
								E se eu cancelar depois do teste?
							</h3>
							<p className="text-gray-400">
								Sem problemas. Cancele quando quiser, sem multas ou burocracias.
							</p>
						</div>
					</div>
				</div>
			</main>

			<PremiumFooter />
		</div>
	);
}

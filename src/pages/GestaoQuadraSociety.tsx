/**
 * Página SEO: Gestão de Quadra Society
 */

import { SEO } from "../components/SEO";
import { Header } from "../components/Header";
import { PremiumFooter } from "../components/PremiumFooter";
import { useNavigate } from "react-router-dom";

export function GestaoQuadraSociety() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen marketing-dark text-white">
			<SEO
				title="Sistema de Gestão para Quadra Society | Agendamento e Pagamentos"
				description="Software completo para gestão de quadra society. Controle de horários, agendamento online, pagamento no local ou via WhatsApp, mensalistas. Teste grátis 7 dias sem cartão."
				keywords="gestão quadra society, sistema quadra society, software aluguel society, agendamento society, controle horários society"
				canonical="/gestao-quadra-society"
			/>

			<Header />

			<main className="container mx-auto px-4 py-12 max-w-4xl" role="main">
				<h1 className="text-4xl md:text-5xl font-bold mb-6">
					Sistema de Gestão Completo para Quadra Society
				</h1>

				<div className="prose prose-invert max-w-none">
					<p className="text-xl text-gray-300 mb-8">
						Gerencie sua quadra society profissionalmente. Acabe com conflitos
						de horários, pagamentos atrasados e perda de reservas. Tudo
						automatizado.
					</p>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Os 3 maiores problemas de quem tem quadra society
					</h2>
					<div className="space-y-6 mb-8">
						<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								❌ Problema 1: Duas reservas no mesmo horário
							</h3>
							<p className="text-gray-300">
								Você anota no caderno. Esquece de atualizar. Cliente liga
								confirmando. Você confirma. Mas já tinha vendido aquele horário.
								Resultado: barraco e cliente perdido.
							</p>
						</div>
						<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								❌ Problema 2: Cliente não paga
							</h3>
							<p className="text-gray-300">
								"Pago depois." "Pago na próxima." E você fica correndo atrás de
								R$ 60, R$ 100. Vira inadimplência acumulada.
							</p>
						</div>
						<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								❌ Problema 3: Perda de tempo gerenciando
							</h3>
							<p className="text-gray-300">
								WhatsApp bombando. Ligações o dia todo. "Tem horário amanhã às
								20h?" Você para o que está fazendo, verifica, responde. E repete
								isso 20x por dia.
							</p>
						</div>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Como o ArenaSys resolve tudo isso
					</h2>
					<div className="grid md:grid-cols-2 gap-6 mb-8">
						<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">✅ Zero conflitos</h3>
							<p className="text-gray-300">
								Sistema atualiza em tempo real. Se alguém reservou, ninguém mais
								consegue pegar aquele horário. Impossível ter conflito.
							</p>
						</div>
						<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								✅ Pagamento flexivel
							</h3>
							<p className="text-gray-300">
								Pagamento no local ou via WhatsApp, com confirmacao manual.
							</p>
						</div>
						<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								✅ Você não faz nada
							</h3>
							<p className="text-gray-300">
								Cliente acessa o link, vê horários livres, escolhe, paga e
								pronto. Você só confirma no dashboard. 5 minutos por dia.
							</p>
						</div>
						<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6">
							<h3 className="text-xl font-semibold mb-2">
								✅ Mensalistas automáticos
							</h3>
							<p className="text-gray-300">
								Cadastra uma vez. Sistema bloqueia horário fixo toda semana. Sem
								erro, sem esquecer.
							</p>
						</div>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Funcionalidades específicas para quadra society
					</h2>
					<ul className="text-gray-300 mb-8 space-y-3">
						<li>
							⚽ <strong>Múltiplas quadras:</strong> Society 1, Society 2...
							quantas tiver
						</li>
						<li>
							💰 <strong>Preços flexíveis:</strong> Horário nobre R$ 120,
							off-peak R$ 80
						</li>
						<li>
							👥 <strong>Gestão de peladas:</strong> Cadastre grupos fixos (ex:
							sexta 20h)
						</li>
						<li>
							📊 <strong>Relatórios:</strong> Quanto cada quadra fatura por
							dia/semana/mês
						</li>
						<li>
							📱 <strong>Link público:</strong> Compartilha no Instagram,
							WhatsApp Status
						</li>
						<li>
							🔔 <strong>Lembretes:</strong> Cliente recebe lembrete 1 dia antes
						</li>
					</ul>

					<div className="bg-white/5 p-6 rounded-lg mb-8">
						<h3 className="text-2xl font-bold mb-4">
							Quanto você perde sem um sistema?
						</h3>
						<ul className="text-gray-300 space-y-2">
							<li>
								• <strong>5 horas por semana</strong> gerenciando WhatsApp e
								ligações
							</li>
							<li>
								• <strong>R$ 500/mês</strong> em inadimplência média
							</li>
							<li>
								• <strong>3 clientes por mês</strong> perdidos por conflitos
							</li>
							<li>
								• <strong>Estresse diário</strong> de tentar organizar tudo
								manualmente
							</li>
						</ul>
						<p className="text-emerald-400 font-semibold mt-4">
							Total: Mais de R$ 1.000/mês de prejuízo + seu tempo e sanidade
							mental.
						</p>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Investimento</h2>
					<p className="text-gray-300 mb-4">
						<strong className="text-emerald-400 text-2xl">R$ 97/mês</strong>
					</p>
					<p className="text-gray-300 mb-6">
						Menos que 1 aluguel de quadra por mês. E você economiza muito mais
						em tempo, inadimplência e clientes perdidos.
					</p>

					<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 my-8">
						<h3 className="text-2xl font-bold mb-4">Teste Grátis por 7 Dias</h3>
						<p className="text-gray-300 mb-6">
							Configure sua quadra society em 10 minutos. Veja funcionar. Sem
							cartão de crédito. Sem compromisso.
						</p>
						<button
							onClick={() => navigate("/login?mode=signup")}
							aria-label="Começar teste grátis de 7 dias do sistema para quadra society"
							className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
							Começar Teste Grátis Agora
						</button>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">Depoimento real</h2>
					<div className="bg-white/5 p-6 rounded-lg mb-8">
						<p className="text-gray-300 italic mb-4">
							"Tinha 2 quadras society. Gerenciava no WhatsApp. Era um caos.
							Instalei o ArenaSys num sábado. Na segunda já estava funcionando
							100%. Primeira semana zero conflitos. Hoje não vivo sem. Melhor
							decisão que tomei."
						</p>
						<p className="text-gray-300">
							— Carlos, Arena Champions - Curitiba/PR
						</p>
					</div>

					<h2 className="text-3xl font-bold mt-12 mb-4">
						Perguntas frequentes
					</h2>
					<div className="space-y-6">
						<div>
							<h3 className="text-xl font-semibold mb-2">
								Preciso de computador potente?
							</h3>
							<p className="text-gray-300">
								Não. Funciona no celular, tablet ou qualquer computador. É 100%
								online.
							</p>
						</div>
						<div>
							<h3 className="text-xl font-semibold mb-2">
								E se minha internet cair?
							</h3>
							<p className="text-gray-300">
								Sistema fica online na nuvem. Clientes continuam agendando
								normalmente. Você acessa quando voltar a internet.
							</p>
						</div>
						<div>
							<h3 className="text-xl font-semibold mb-2">
								Posso cancelar quando quiser?
							</h3>
							<p className="text-gray-300">
								Sim. Sem fidelidade, sem multa. Cancela com 1 clique.
							</p>
						</div>
					</div>
				</div>
			</main>

			<PremiumFooter />
		</div>
	);
}

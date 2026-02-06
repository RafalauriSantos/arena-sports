/**
 * Template de Artigo de Blog - SEO
 */

import { SEO } from "../components/SEO";
import { Header } from "../components/Header";
import { PremiumFooter } from "../components/PremiumFooter";
import { useParams, useNavigate } from "react-router-dom";

interface BlogArticle {
	title: string;
	description: string;
	date: string;
	category: string;
	readTime: string;
	content: string;
}

export function BlogPost() {
	const { slug } = useParams();
	const navigate = useNavigate();

	// Em produção, isso viria de um CMS ou banco de dados
	const articles: Record<string, BlogArticle> = {
		"como-aumentar-ocupacao-quadra": {
			title: "Como Aumentar a Ocupação da Sua Quadra em 300%",
			description:
				"5 estratégias comprovadas para nunca mais ter horários vazios na sua arena esportiva.",
			date: "2026-02-06",
			category: "Gestão",
			readTime: "5 min",
			content: `
				<p>Horários vazios = dinheiro perdido. Se sua quadra fica ociosa 40% do tempo, você está deixando de faturar milhares de reais por mês.</p>

				<p>Aqui estão 5 estratégias que aumentaram a ocupação de arenas reais em até 300%:</p>

				<h2>1. Link de Agendamento Público 24/7</h2>
				<p>Cliente quer reservar às 23h? No domingo? Sem problemas. Com link público (ex: arenasys.com.br/agendar/sua-arena), eles agendam quando quiserem. Você acorda com reservas feitas.</p>
				<p><strong>Resultado real:</strong> Arena em SP aumentou ocupação de 45% para 82% em 2 meses.</p>

				<h2>2. Preços Dinâmicos por Horário</h2>
				<p>Horário nobre (18h-22h): preço cheio. Off-peak (14h-17h): desconto 30%. Madrugada (22h-00h): desconto 50%.</p>
				<p>Você preenche horários vazios E mantém lucro nos horários bons.</p>

				<h2>3. Pacotes e Mensalidades</h2>
				<p>Ofereça pacotes: "4 horários por R$ 280 (ao invés de R$ 400 avulso)". Cliente garante horário fixo, você garante receita recorrente.</p>
				<p><strong>Resultado:</strong> 30% dos clientes viram mensalistas = faturamento previsível.</p>

				<h2>4. Marketing no Instagram</h2>
				<p>Poste stories mostrando a quadra. Faça enquetes. Compartilhe seu link de agendamento. Use hashtags locais (#futebolSP #beachSP).</p>
				<p>Invista R$ 5/dia em anúncios segmentados para sua região. ROI absurdo.</p>

				<h2>5. Parcerias com Influenciadores Locais</h2>
				<p>Ache jogadores populares na região. Ofereça horário grátis em troca de divulgação. 1 post do cara certo = 20 novos clientes.</p>

				<h2>Bônus: Sistema de Gestão Profissional</h2>
				<p>Impossível crescer gerenciando WhatsApp. Sistema automatiza tudo: agendamento, pagamentos, lembretes. Você foca em crescer, não em administrar.</p>

				<div class="bg-emerald-500/10 p-6 rounded-lg my-8">
					<p><strong>Quer testar?</strong> ArenaSys oferece teste grátis 7 dias. Configure em 10 minutos e veja a diferença.</p>
				</div>
			`,
		},
		"quanto-custa-manter-quadra-society": {
			title: "Quanto Custa Realmente Manter uma Quadra Society?",
			description:
				"Análise completa de custos: luz, manutenção, pessoal e quanto você precisa faturar para lucrar.",
			date: "2026-02-05",
			category: "Financeiro",
			readTime: "7 min",
			content: `
				<p>Abrir uma quadra society parece negócio da China. Aluga por R$ 100, custa nada manter, lucro puro. Será?</p>
				
				<p>Vamos à realidade. Análise de uma quadra society padrão:</p>

				<h2>Custos Fixos Mensais</h2>
				<ul>
					<li><strong>Aluguel do terreno:</strong> R$ 2.000 - R$ 5.000 (varia muito por região)</li>
					<li><strong>Energia elétrica:</strong> R$ 800 - R$ 1.500 (refletores consomem MUITO)</li>
					<li><strong>Água:</strong> R$ 150 - R$ 300</li>
					<li><strong>Seguro:</strong> R$ 200 - R$ 400</li>
					<li><strong>IPTU:</strong> R$ 300 - R$ 800/mês (proporcional)</li>
				</ul>
				<p><strong>Total fixo:</strong> R$ 3.450 - R$ 8.000/mês (média R$ 5.000)</p>

				<h2>Custos Variáveis</h2>
				<ul>
					<li><strong>Manutenção grama sintética:</strong> R$ 300 - R$ 600/mês</li>
					<li><strong>Limpeza:</strong> R$ 400 - R$ 800/mês</li>
					<li><strong>Pequenos reparos:</strong> R$ 200 - R$ 500/mês</li>
					<li><strong>Material (bolas, redes, etc):</strong> R$ 100 - R$ 300/mês</li>
				</ul>
				<p><strong>Total variável:</strong> R$ 1.000 - R$ 2.200/mês (média R$ 1.500)</p>

				<h2>Mão de Obra (Opcional)</h2>
				<ul>
					<li><strong>Funcionário/atendente:</strong> R$ 1.500 - R$ 2.500/mês</li>
					<li><strong>Segurança:</strong> R$ 1.200 - R$ 2.000/mês</li>
				</ul>
				<p>Com funcionários: +R$ 2.700 - R$ 4.500/mês</p>

				<h2>Total de Custos</h2>
				<ul>
					<li>Sem funcionários: R$ 6.500/mês</li>
					<li>Com funcionários: R$ 10.000/mês</li>
				</ul>

				<h2>Quanto Você Precisa Faturar?</h2>
				<p>Considerando margem de lucro de 30%:</p>
				<ul>
					<li>Sem funcionários: R$ 9.300/mês</li>
					<li>Com funcionários: R$ 14.300/mês</li>
				</ul>

				<h2>Exemplo Prático</h2>
				<p>Quadra alugada a R$ 100/hora:</p>
				<ul>
					<li>Precisa de 93 horas/mês (sem funcionário) ou 143 horas/mês (com funcionário)</li>
					<li>Isso dá 3-5 horas por dia todos os dias</li>
				</ul>

				<h2>Como Reduzir Custos?</h2>
				<ol>
					<li><strong>Automação:</strong> Sistema de agendamento elimina necessidade de atendente</li>
					<li><strong>Eficiência energética:</strong> LED reduz conta de luz em 40%</li>
					<li><strong>Manutenção preventiva:</strong> Evita gastos emergenciais</li>
					<li><strong>Ocupação máxima:</strong> Cada hora vazia = prejuízo</li>
				</ol>

				<p><strong>Conclusão:</strong> Quadra society é negócio lucrativo, MAS precisa de gestão profissional. Controle de custos + ocupação alta = sucesso garantido.</p>
			`,
		},
	};

	const article = slug ? articles[slug] : null;

	if (!article) {
		return (
			<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-4xl font-bold mb-4">Artigo não encontrado</h1>
					<button
						onClick={() => navigate("/blog")}
						aria-label="Voltar para o blog"
						className="text-emerald-400 hover:underline">
						← Voltar para o blog
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#02040a] text-white">
			<SEO
				title={article.title}
				description={article.description}
				canonical={`/blog/${slug}`}
				type="article"
			/>

			<Header />

			<main className="container mx-auto px-4 py-12 max-w-3xl" role="main">
				<button
					onClick={() => navigate("/blog")}
					aria-label="Voltar para o blog"
					className="text-emerald-400 hover:underline mb-6 flex items-center gap-2">
					← Voltar para o blog
				</button>

				<article>
					<div className="flex items-center gap-3 mb-6">
						<span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full">
							{article.category}
						</span>
						<span className="text-sm text-gray-500">{article.readTime}</span>
					</div>

					<h1 className="text-4xl md:text-5xl font-bold mb-4">
						{article.title}
					</h1>

					<div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
						<time>{new Date(article.date).toLocaleDateString("pt-BR")}</time>
					</div>

					<div
						className="prose prose-invert prose-lg max-w-none"
						dangerouslySetInnerHTML={{ __html: article.content }}
					/>

					<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-8 my-12">
						<h3 className="text-2xl font-bold mb-4">
							Quer gerir sua arena profissionalmente?
						</h3>
						<p className="text-gray-300 mb-6">
							Teste o ArenaSys grátis por 7 dias. Sistema completo de
							agendamento e pagamentos.
						</p>
						<button
							onClick={() => navigate("/welcome")}
							aria-label="Começar teste grátis do ArenaSys"
							className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
							Começar Teste Grátis
						</button>
					</div>
				</article>
			</main>

			<PremiumFooter />
		</div>
	);
}

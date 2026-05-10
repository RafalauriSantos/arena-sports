/**
 * Página de Blog - SEO Content
 */

import { SEO } from "../components/SEO";
import { Header } from "../components/Header";
import { PremiumFooter } from "../components/PremiumFooter";
import { useNavigate } from "react-router-dom";

export function Blog() {
	const navigate = useNavigate();

	const articles = [
		{
			slug: "como-aumentar-ocupacao-quadra",
			title: "Como Aumentar a Ocupação da Sua Quadra em 300%",
			excerpt:
				"5 estratégias comprovadas para nunca mais ter horários vazios na sua arena esportiva.",
			date: "2026-02-06",
			category: "Gestão",
			readTime: "5 min",
		},
		{
			slug: "quanto-custa-manter-quadra-society",
			title: "Quanto Custa Realmente Manter uma Quadra Society?",
			excerpt:
				"Análise completa de custos: luz, manutenção, pessoal e quanto você precisa faturar para lucrar.",
			date: "2026-02-05",
			category: "Financeiro",
			readTime: "7 min",
		},
		{
			slug: "sistema-vs-planilha-comparativo",
			title: "Sistema vs Planilha: O Que Compensa Mais?",
			excerpt:
				"Comparativo honesto entre gerenciar quadras manualmente e usar software profissional.",
			date: "2026-02-04",
			category: "Tecnologia",
			readTime: "6 min",
		},
		{
			slug: "marketing-para-quadras-esportivas",
			title: "Marketing para Quadras: 10 Ideias que Funcionam",
			excerpt:
				"Estratégias práticas de marketing digital para atrair mais clientes para sua arena.",
			date: "2026-02-03",
			category: "Marketing",
			readTime: "8 min",
		},
		{
			slug: "como-reduzir-no-show",
			title: "Como Reduzir No-Show em 95%",
			excerpt:
				"Técnicas comprovadas para acabar com clientes que reservam e não aparecem.",
			date: "2026-02-02",
			category: "Gestão",
			readTime: "4 min",
		},
	];

	return (
		<div className="min-h-screen marketing-dark text-white">
			<SEO
				title="Blog | Dicas de Gestão para Arenas Esportivas"
				description="Artigos sobre gestão de quadras esportivas, marketing, finanças e tecnologia. Aprenda a aumentar o faturamento da sua arena."
				keywords="blog gestão quadras, dicas arena esportiva, marketing quadras, aumentar ocupação quadra"
				canonical="/blog"
			/>

			<Header />

			<main className="container mx-auto px-4 py-12 max-w-6xl" role="main">
				<h1 className="text-4xl md:text-5xl font-bold mb-4">Blog ArenaSys</h1>
				<p className="text-xl text-gray-300 mb-12">
					Dicas práticas de gestão, marketing e tecnologia para arenas
					esportivas
				</p>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
					{articles.map((article) => (
						<article
							key={article.slug}
							role="article"
							aria-label={`Artigo: ${article.title}`}
							className="bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
							onClick={() => navigate(`/blog/${article.slug}`)}>
							<div className="p-6">
								<div className="flex items-center gap-3 mb-3">
									<span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
										{article.category}
									</span>
									<span className="text-xs text-gray-300">
										{article.readTime}
									</span>
								</div>
								<h2 className="text-xl font-bold mb-2 hover:text-emerald-400 transition-colors">
									{article.title}
								</h2>
								<p className="text-gray-300 text-sm mb-4">{article.excerpt}</p>
								<time className="text-xs text-gray-300">
									{new Date(article.date).toLocaleDateString("pt-BR")}
								</time>
							</div>
						</article>
					))}
				</div>

				<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-8 my-12 text-center">
					<h2 className="text-2xl font-bold mb-4">Quer conteúdo exclusivo?</h2>
					<p className="text-gray-300 mb-6">
						Receba dicas semanais de gestão de arenas direto no seu email
					</p>
					<a
						href="mailto:contato@arenasys.com.br?subject=Quero%20receber%20novidades%20do%20ArenaSys"
						aria-label="Assinar newsletter do ArenaSys"
						className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex">
						Assinar Newsletter
					</a>
				</div>
			</main>

			<PremiumFooter />
		</div>
	);
}

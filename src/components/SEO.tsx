/**
 * Componente SEO Dinâmico
 * Gerencia meta tags, Open Graph e Structured Data para cada página
 */

import { useEffect } from "react";

interface SEOProps {
	title?: string;
	description?: string;
	keywords?: string;
	ogImage?: string;
	canonical?: string;
	type?: "website" | "article" | "product";
	noindex?: boolean;
}

export function SEO({
	title = "ArenaSys - Sistema de Gestão e Agendamento de Quadras Esportivas",
	description = "Agenda online simples para quadras esportivas. Saia do WhatsApp, envie um link de reserva e organize horários em minutos. Teste grátis por 7 dias.",
	keywords = "sistema gestão quadras, agendamento quadras esportivas, software arena, gestão reservas esportivas, sistema agendamento online, software para quadras, gestão de quadra society, sistema booking esportivo, SaaS quadras, agendamento automático quadras",
	ogImage = "https://arenasys.com.br/og-image.jpg",
	canonical,
	type = "website",
	noindex = false,
}: SEOProps) {
	const baseUrl = "https://arenasys.com.br";
	const fullTitle = title.includes("ArenaSys") ? title : `${title} | ArenaSys`;
	const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;

	useEffect(() => {
		// Atualizar title
		document.title = fullTitle;

		// Atualizar ou criar meta tags
		const updateMetaTag = (name: string, content: string, attribute: string = "name") => {
			let element = document.querySelector(`meta[${attribute}="${name}"]`);
			if (!element) {
				element = document.createElement("meta");
				element.setAttribute(attribute, name);
				document.head.appendChild(element);
			}
			element.setAttribute("content", content);
		};

		// Meta tags básicas
		updateMetaTag("description", description);
		updateMetaTag("keywords", keywords);
		updateMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow");

		// Open Graph
		updateMetaTag("og:title", fullTitle, "property");
		updateMetaTag("og:description", description, "property");
		updateMetaTag("og:type", type, "property");
		updateMetaTag("og:image", ogImage, "property");
		updateMetaTag("og:url", fullCanonical, "property");

		// Twitter Card
		updateMetaTag("twitter:card", "summary_large_image");
		updateMetaTag("twitter:title", fullTitle);
		updateMetaTag("twitter:description", description);
		updateMetaTag("twitter:image", ogImage);

		// Canonical
		let canonicalLink = document.querySelector('link[rel="canonical"]');
		if (!canonicalLink) {
			canonicalLink = document.createElement("link");
			canonicalLink.setAttribute("rel", "canonical");
			document.head.appendChild(canonicalLink);
		}
		canonicalLink.setAttribute("href", fullCanonical);
	}, [fullTitle, description, keywords, ogImage, fullCanonical, type, noindex]);

	return null; // Componente não renderiza nada visualmente
}

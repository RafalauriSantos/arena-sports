#!/usr/bin/env node
/**
 * Injeta conteúdo crítico da landing no index.html para SEO, SEM Puppeteer.
 * Funciona no Vercel (não precisa de Chromium/libnss3).
 * O Google recebe H1 e texto no HTML; o React hidrata depois.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist", "index.html");

const CRITICAL_HTML = `<div id="root"><div data-seo-ready class="min-h-screen bg-[#eef4fb] text-slate-950 font-sans"><main class="relative z-10"><h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mt-8">Sistema de reservas para arenas esportivas | ArenaSys</h1><p class="text-lg md:text-xl text-slate-600 mt-4 max-w-2xl">Organize quadras, horarios, clientes e pagamentos em um link publico e um painel simples para sua equipe acompanhar a operacao.</p><p class="text-slate-500 mt-4">Comece por uma agenda piloto: link publico de reservas, painel de gestao e implantacao assistida para validar o fluxo da primeira arena antes de ampliar o uso.</p><ul class="text-slate-600 mt-4 space-y-2"><li>Link proprio para reservas sem app obrigatorio</li><li>Agenda por quadra, data, horario e valor</li><li>Painel para acompanhar reservas, receita e pendencias</li><li>Pagamento no balcao hoje, Pix e cartao pelo link em evolucao</li><li>Implantacao assistida para colocar a primeira arena no ar</li></ul></main></div></div>`;

if (!fs.existsSync(distPath)) {
	console.error("❌ dist/index.html não encontrado. Rode 'vite build' antes.");
	process.exit(1);
}

let html = fs.readFileSync(distPath, "utf8");

// Substitui <div id="root"></div> pelo HTML com conteúdo crítico (Vite gera assim)
const rootEmpty = /<div id="root"\s*>\s*<\/div>/;
if (!rootEmpty.test(html)) {
	console.error(
		'❌ Não foi encontrado <div id="root"></div> em dist/index.html',
	);
	process.exit(1);
}
html = html.replace(rootEmpty, CRITICAL_HTML);

fs.writeFileSync(distPath, html, "utf8");
console.log("✅ Conteúdo SEO injetado em dist/index.html (sem Puppeteer).");

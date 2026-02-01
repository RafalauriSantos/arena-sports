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

const CRITICAL_HTML = `<div id="root"><div data-seo-ready class="min-h-screen bg-[#02040a] text-white font-sans"><main class="relative z-10"><h1 class="text-4xl md:text-5xl font-bold tracking-tight text-white mt-8">Sistema de gestão e agendamento de quadras esportivas</h1><p class="text-lg md:text-xl text-gray-300 mt-4 max-w-2xl">Evite conflitos de horários, perca menos dinheiro e organize sua arena em um só lugar.</p><p class="text-gray-400 mt-4">Software para quadras esportivas, controle de horários de quadras e sistema para aluguel de quadras. Teste grátis 7 dias.</p></main></div></div>`;

if (!fs.existsSync(distPath)) {
	console.error("❌ dist/index.html não encontrado. Rode 'vite build' antes.");
	process.exit(1);
}

let html = fs.readFileSync(distPath, "utf8");

// Substitui <div id="root"></div> pelo HTML com conteúdo crítico (Vite gera assim)
const rootEmpty = /<div id="root"\s*>\s*<\/div>/;
if (!rootEmpty.test(html)) {
	console.error("❌ Não foi encontrado <div id=\"root\"></div> em dist/index.html");
	process.exit(1);
}
html = html.replace(rootEmpty, CRITICAL_HTML);

fs.writeFileSync(distPath, html, "utf8");
console.log("✅ Conteúdo SEO injetado em dist/index.html (sem Puppeteer).");

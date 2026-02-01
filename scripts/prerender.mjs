#!/usr/bin/env node
/**
 * Pré-renderiza a landing page no build para SEO.
 * O Google recebe o HTML completo (H1, texto, meta) sem depender de JavaScript.
 * Uso: rodar após "vite build" (ex: npm run build && node scripts/prerender.mjs)
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = 3456;

function serveFile(filePath, res) {
	const ext = path.extname(filePath);
	const types = {
		".html": "text/html; charset=utf-8",
		".js": "application/javascript",
		".css": "text/css",
		".json": "application/json",
		".ico": "image/x-icon",
		".svg": "image/svg+xml",
		".png": "image/png",
		".jpg": "image/jpeg",
		".woff2": "font/woff2",
	};
	const contentType = types[ext] || "application/octet-stream";
	res.setHeader("Content-Type", contentType);
	res.end(fs.readFileSync(filePath));
}

function staticServer(req, res) {
	let url = req.url === "/" ? "/index.html" : req.url;
	url = url.split("?")[0];
	const filePath = path.join(DIST, url);
	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
		res.writeHead(404);
		res.end("Not found");
		return;
	}
	serveFile(filePath, res);
}

const server = http.createServer(staticServer);

async function run() {
	if (!fs.existsSync(DIST)) {
		console.error("❌ Pasta dist/ não encontrada. Rode 'npm run build' antes.");
		process.exit(1);
	}

	server.listen(PORT, "127.0.0.1", async () => {
		console.log("📄 Pré-renderizando landing para SEO (porta " + PORT + ")...");
		try {
			const { default: puppeteer } = await import("puppeteer");
			const browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});
			const page = await browser.newPage();
			await page.setViewport({ width: 1280, height: 720 });
			await page.goto(`http://127.0.0.1:${PORT}/`, {
				waitUntil: "networkidle0",
				timeout: 30000,
			});
			await page.waitForSelector("[data-seo-ready]", { timeout: 15000 });
			const html = await page.content();
			await browser.close();
			const outPath = path.join(DIST, "index.html");
			fs.writeFileSync(outPath, html, "utf8");
			console.log("✅ index.html pré-renderizado em dist/ (SEO).");
		} catch (err) {
			console.error("❌ Erro no prerender:", err.message);
			process.exit(1);
		} finally {
			server.close();
		}
	});
}

run();

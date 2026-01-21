/**
 * Script para Executar Queries SQL Diretamente via psql
 * 
 * ⚠️ ATENÇÃO: APENAS SELECT - Nenhum comando destrutivo
 * 
 * Este script tenta executar queries SQL usando psql diretamente
 * Requer: psql instalado e connection string do Supabase
 * 
 * Uso:
 *   bun run scripts/run-sql-direct.ts <arquivo.sql>
 *   bun run scripts/run-sql-direct.ts --query "SELECT * FROM bookings LIMIT 5"
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

// Cores
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPsql(): boolean {
	try {
		execSync('psql --version', { stdio: 'pipe', encoding: 'utf-8' });
		return true;
	} catch {
		return false;
	}
}

function getConnectionInfo() {
	// Tenta obter informações de conexão
	const supabaseUrl = process.env.VITE_SUPABASE_URL;
	
	if (!supabaseUrl) {
		return null;
	}

	// Extrai project ref da URL
	// Exemplo: https://extkyeckajhcozjervyr.supabase.co
	const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
	if (!match) {
		return null;
	}

	const projectRef = match[1];
	
	// Para conectar via psql, precisamos:
	// - Host: [project-ref].supabase.co (ou pooler)
	// - Port: 5432 (ou 6543 para pooler)
	// - Database: postgres
	// - User: postgres.[project-ref]
	// - Password: (precisa ser fornecido ou estar no .env)
	
	const dbPassword = process.env.SUPABASE_DB_PASSWORD;
	
	return {
		projectRef,
		host: `${projectRef}.supabase.co`,
		port: 5432,
		database: 'postgres',
		user: `postgres.${projectRef}`,
		password: dbPassword,
		connectionString: dbPassword 
			? `postgresql://postgres.${projectRef}:${dbPassword}@${projectRef}.supabase.co:5432/postgres?sslmode=require`
			: null
	};
}

async function executeWithPsql(sql: string, connInfo: any): Promise<boolean> {
	if (!connInfo.connectionString) {
		return false;
	}

	try {
		log('🔄 Executando query via psql...', 'blue');
		
		// Executa psql com a query
		const result = execSync(
			`psql "${connInfo.connectionString}" -c "${sql.replace(/"/g, '\\"')}"`,
			{ 
				encoding: 'utf-8',
				stdio: 'inherit',
				env: { ...process.env, PGPASSWORD: connInfo.password }
			}
		);
		
		return true;
	} catch (error: any) {
		log(`❌ Erro ao executar: ${error.message}`, 'red');
		return false;
	}
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🔍 EXECUTAR SQL DIRETO - ARENA SPORTS', 'bright');
	log('⚠️  APENAS SELECT - NENHUM COMANDO DESTRUTIVO', 'yellow');
	console.log('='.repeat(60) + '\n');

	const args = process.argv.slice(2);
	let sql = '';

	// Lê query
	if (args.includes('--query')) {
		const queryIndex = args.indexOf('--query');
		sql = args[queryIndex + 1];
	} else if (args.length > 0) {
		const filePath = join(process.cwd(), args[0]);
		if (!existsSync(filePath)) {
			log(`❌ Arquivo não encontrado: ${filePath}`, 'red');
			process.exit(1);
		}
		sql = readFileSync(filePath, 'utf-8');
	} else {
		log('❌ Uso:', 'red');
		log('   bun run scripts/run-sql-direct.ts <arquivo.sql>', 'yellow');
		log('   bun run scripts/run-sql-direct.ts --query "SELECT * FROM bookings LIMIT 5"', 'yellow');
		log('\n💡 Para executar diretamente, configure SUPABASE_DB_PASSWORD no .env.local', 'blue');
		process.exit(1);
	}

	// Remove comentários SQL para validação
	const sqlWithoutComments = sql
		.split('\n')
		.map(line => {
			// Remove comentários de linha (--)
			const commentIndex = line.indexOf('--');
			if (commentIndex >= 0) {
				return line.substring(0, commentIndex);
			}
			return line;
		})
		.join('\n')
		.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove comentários de bloco (/* */)

	// Valida segurança
	const sqlUpper = sqlWithoutComments.trim().toUpperCase();
	if (!sqlUpper.startsWith('SELECT')) {
		log('❌ ERRO: Apenas queries SELECT são permitidas', 'red');
		process.exit(1);
	}

	const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'RESET'];
	if (dangerous.some(cmd => sqlUpper.includes(cmd) && !sqlUpper.includes('SELECT'))) {
		log('❌ ERRO: Query contém comandos perigosos', 'red');
		process.exit(1);
	}

	// Verifica psql
	const hasPsql = checkPsql();
	if (!hasPsql) {
		log('⚠️  psql não encontrado. Instale PostgreSQL para executar queries diretamente.', 'yellow');
		log('💡 Alternativa: Use o SQL Editor do Supabase Dashboard', 'blue');
		log('\n📋 Query SQL:', 'cyan');
		console.log('\n' + sql + '\n');
		process.exit(0);
	}

	// Obtém informações de conexão
	const connInfo = getConnectionInfo();
	if (!connInfo) {
		log('❌ Não foi possível obter informações de conexão', 'red');
		log('💡 Configure VITE_SUPABASE_URL no .env.local', 'yellow');
		process.exit(1);
	}

	if (!connInfo.connectionString) {
		log('⚠️  SUPABASE_DB_PASSWORD não configurado', 'yellow');
		log('💡 Para executar diretamente, adicione no .env.local:', 'blue');
		log('   SUPABASE_DB_PASSWORD=sua_senha_do_banco', 'cyan');
		log('\n📋 Query SQL (copie e cole no SQL Editor):', 'cyan');
		console.log('\n' + sql + '\n');
		process.exit(0);
	}

	// Tenta executar
	const success = await executeWithPsql(sql, connInfo);
	if (!success) {
		log('\n💡 Alternativa: Execute manualmente no SQL Editor', 'yellow');
		log('📋 Query SQL:', 'cyan');
		console.log('\n' + sql + '\n');
	}
}

main().catch(console.error);

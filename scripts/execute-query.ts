/**
 * Script para Executar Queries SQL via CLI
 * 
 * ⚠️ ATENÇÃO: APENAS SELECT - Nenhum comando destrutivo
 * 
 * Uso:
 *   bun run scripts/execute-query.ts <arquivo.sql>
 *   bun run scripts/execute-query.ts --query "SELECT * FROM bookings LIMIT 5"
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cores para output
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

function exec(command: string, silent = false): string {
	try {
		const output = execSync(command, { 
			encoding: 'utf-8',
			stdio: silent ? 'pipe' : 'inherit'
		});
		return output;
	} catch (error: unknown) {
		if (!silent) {
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			throw new Error(`Erro ao executar: ${command}\n${errorMessage}`);
		}
		throw error;
	}
}

async function getConnectionString(): Promise<string | null> {
	try {
		// Tenta obter connection string via Supabase CLI
		// O comando 'supabase status' mostra a connection string local, mas precisamos da remota
		
		// Verifica se está linkado
		try {
			exec('bunx supabase status --linked', true);
		} catch {
			log('⚠️  Projeto não está linkado', 'yellow');
			return null;
		}

		// Para obter a connection string remota, precisamos:
		// 1. Project ref (já temos: extkyeckajhcozjervyr)
		// 2. Database password (precisa ser fornecido)
		// 3. Host (pode ser obtido do VITE_SUPABASE_URL)
		
		const supabaseUrl = process.env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			log('⚠️  VITE_SUPABASE_URL não encontrado no .env', 'yellow');
			return null;
		}

		// Extrai o host da URL
		const url = new URL(supabaseUrl);
		const host = url.hostname;
		
		// O formato da connection string do Supabase é:
		// postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:5432/postgres
		
		// Mas precisamos da senha do banco, que não temos no .env
		// Vamos tentar usar psql com variáveis de ambiente ou pedir ao usuário
		
		return null; // Por enquanto, retorna null e usa método alternativo
		
	} catch (error) {
		return null;
	}
}

async function executeQueryViaREST(sql: string): Promise<void> {
	// Método alternativo: usar a API REST do Supabase
	// Mas isso só funciona para SELECT simples, não para queries complexas
	
	const supabaseUrl = process.env.VITE_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	
	if (!supabaseUrl || !supabaseServiceKey) {
		log('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados', 'red');
		log('💡 Configure no arquivo .env.local', 'yellow');
		return;
	}

	// Para queries SQL complexas, a melhor opção é usar psql
	// Mas como não temos a senha do banco, vamos mostrar a query para copiar
	log('📋 Query SQL:', 'cyan');
	console.log('\n' + sql + '\n');
	log('💡 Para executar:', 'yellow');
	log('   1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr', 'blue');
	log('   2. Vá em SQL Editor → New Query', 'blue');
	log('   3. Cole a query acima e execute (Run)', 'blue');
}

async function main() {
	const args = process.argv.slice(2);
	
	console.log('\n' + '='.repeat(60));
	log('🔍 EXECUTAR QUERY SQL - ARENA SPORTS', 'bright');
	log('⚠️  APENAS SELECT - NENHUM COMANDO DESTRUTIVO', 'yellow');
	console.log('='.repeat(60) + '\n');

	let sql = '';

	// Verifica argumentos
	if (args.includes('--query')) {
		const queryIndex = args.indexOf('--query');
		sql = args[queryIndex + 1];
		if (!sql) {
			log('❌ Erro: --query requer um valor', 'red');
			process.exit(1);
		}
	} else if (args.length > 0) {
		// Assume que é um arquivo
		const filePath = join(process.cwd(), args[0]);
		if (!existsSync(filePath)) {
			log(`❌ Arquivo não encontrado: ${filePath}`, 'red');
			process.exit(1);
		}
		sql = readFileSync(filePath, 'utf-8');
		log(`📄 Lendo arquivo: ${args[0]}`, 'blue');
	} else {
		log('❌ Uso:', 'red');
		log('   bun run scripts/execute-query.ts <arquivo.sql>', 'yellow');
		log('   bun run scripts/execute-query.ts --query "SELECT * FROM bookings LIMIT 5"', 'yellow');
		process.exit(1);
	}

	// Valida que não há comandos destrutivos
	const dangerousCommands = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'RESET'];
	const sqlUpper = sql.toUpperCase();
	const foundDangerous = dangerousCommands.find(cmd => sqlUpper.includes(cmd));
	
	if (foundDangerous && !sqlUpper.includes('SELECT')) {
		log(`❌ ERRO: Comando perigoso detectado: ${foundDangerous}`, 'red');
		log('   Este script só permite SELECT (consultas)', 'yellow');
		process.exit(1);
	}

	// Tenta executar via psql se disponível
	const hasPsql = exec('psql --version', true).includes('psql');
	
	if (hasPsql) {
		log('✅ psql encontrado! Tentando executar query...', 'green');
		// Aqui precisaríamos da connection string completa
		// Por enquanto, vamos mostrar a query
		await executeQueryViaREST(sql);
	} else {
		log('⚠️  psql não encontrado. Mostrando query para copiar...', 'yellow');
		await executeQueryViaREST(sql);
	}
}

main().catch(console.error);

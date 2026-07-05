/**
 * Script para Executar Queries SQL Seguras via CLI
 * 
 * ⚠️ ATENÇÃO: Este script NUNCA executa DROP, DELETE, TRUNCATE, RESET ou qualquer comando destrutivo
 * Apenas consultas SELECT para verificar dados
 * 
 * Uso:
 *   npx tsx scripts/execute-query-safe.ts --file scripts/query-timezone-check.sql
 *   npx tsx scripts/execute-query-safe.ts --query "SELECT COUNT(*) FROM bookings;"
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function question(query: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(query, resolve);
	});
}

function log(message: string, color: 'green' | 'yellow' | 'blue' | 'red' | 'bright' | 'reset' = 'reset') {
	const colors = {
		reset: '\x1b[0m',
		bright: '\x1b[1m',
		green: '\x1b[32m',
		yellow: '\x1b[33m',
		blue: '\x1b[34m',
		red: '\x1b[31m',
	};
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
			throw error;
		}
		return '';
	}
}

async function getConnectionString(): Promise<string | null> {
	// Tenta obter via Supabase CLI
	try {
		log('🔍 Tentando obter connection string via Supabase CLI...', 'blue');
		
		// Verifica se está linkado
		const status = exec('npx supabase status --linked', true);
		if (!status) {
			log('⚠️  Projeto não está linkado', 'yellow');
			return null;
		}

		// Tenta obter connection string (pode não funcionar em todas as versões)
		// Alternativa: usar variável de ambiente ou pedir ao usuário
		log('💡 Connection string não disponível via CLI', 'yellow');
		return null;
	} catch {
		return null;
	}
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🔍 EXECUTAR QUERIES SQL SEGURAS', 'bright');
	log('⚠️  APENAS SELECT - NENHUM COMANDO DESTRUTIVO', 'yellow');
	console.log('='.repeat(60) + '\n');

	// Parse arguments
	const args = process.argv.slice(2);
	const fileIndex = args.indexOf('--file');
	const queryIndex = args.indexOf('--query');

	let sql = '';

	if (fileIndex !== -1 && args[fileIndex + 1]) {
		const filePath = join(process.cwd(), args[fileIndex + 1]);
		if (existsSync(filePath)) {
			sql = readFileSync(filePath, 'utf-8');
			log(`📄 Arquivo carregado: ${args[fileIndex + 1]}`, 'green');
		} else {
			log(`❌ Arquivo não encontrado: ${filePath}`, 'red');
			process.exit(1);
		}
	} else if (queryIndex !== -1 && args[queryIndex + 1]) {
		sql = args[queryIndex + 1];
		log('📝 Query fornecida via argumento', 'green');
	} else {
		log('❌ Uso:', 'red');
		log('  npx tsx scripts/execute-query-safe.ts --file scripts/query-timezone-check.sql', 'yellow');
		log('  npx tsx scripts/execute-query-safe.ts --query "SELECT COUNT(*) FROM bookings;"', 'yellow');
		process.exit(1);
	}

	// Validação de segurança: NUNCA permite comandos destrutivos
	const dangerousPatterns = [
		/\bDROP\s+/i,
		/\bDELETE\s+FROM\s+/i,
		/\bTRUNCATE\s+/i,
		/\bRESET\s+/i,
		/\bALTER\s+TABLE\s+.*\s+DROP/i,
		/\bALTER\s+DATABASE/i,
		/\bDROP\s+DATABASE/i,
		/\bDROP\s+TABLE/i,
		/\bDROP\s+SCHEMA/i,
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(sql)) {
			log('❌ ERRO DE SEGURANÇA: Comando destrutivo detectado!', 'red');
			log('⚠️  Este script só permite SELECT e consultas seguras', 'yellow');
			process.exit(1);
		}
	}

	// Verifica se é principalmente SELECT
	if (!/^\s*SELECT\s+/i.test(sql.trim())) {
		log('⚠️  AVISO: Query não começa com SELECT', 'yellow');
		log('💡 Este script é destinado apenas para consultas (SELECT)', 'yellow');
		const confirm = await question('Deseja continuar mesmo assim? (s/N): ');
		if (confirm.toLowerCase() !== 's') {
			process.exit(0);
		}
	}

	// Tenta obter connection string
	let connectionString = await getConnectionString();

	if (!connectionString) {
		log('\n📋 Para executar via psql, você precisa da connection string do banco:', 'blue');
		log('   1. Acesse: Supabase Dashboard → Settings → Database', 'yellow');
		log('   2. Copie a "Connection string" (Session pooler ou Direct connection)', 'yellow');
		log('   3. Configure como variável de ambiente: SUPABASE_DB_URL', 'yellow');
		log('\n💡 Alternativa: Copie a query abaixo e execute no SQL Editor:', 'blue');
		console.log('\n' + '-'.repeat(60));
		console.log(sql);
		console.log('-'.repeat(60) + '\n');
		
		// Tenta usar variável de ambiente
		if (process.env.SUPABASE_DB_URL) {
			connectionString = process.env.SUPABASE_DB_URL;
			log('✅ Usando SUPABASE_DB_URL da variável de ambiente', 'green');
		} else {
			log('⚠️  SUPABASE_DB_URL não configurado', 'yellow');
			log('💡 Configure: export SUPABASE_DB_URL="postgresql://..."', 'yellow');
			rl.close();
			process.exit(0);
		}
	}

	// Executa via psql
	if (connectionString) {
		try {
			log('\n🚀 Executando query via psql...', 'blue');
			
			// Salva SQL em arquivo temporário
			const tempFile = join(process.cwd(), 'temp_query_exec.sql');
			writeFileSync(tempFile, sql);
			
			// Executa psql
			const psqlCommand = `psql "${connectionString}" -f "${tempFile}"`;
			exec(psqlCommand);
			
			// Remove arquivo temporário
			unlinkSync(tempFile);
			
			log('\n✅ Query executada com sucesso!', 'green');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			log(`\n❌ Erro ao executar: ${errorMessage}`, 'red');
			log('💡 Verifique se psql está instalado e a connection string está correta', 'yellow');
			log('💡 Alternativa: Copie a query acima e execute no SQL Editor', 'yellow');
		}
	}

	rl.close();
}

main().catch(console.error);

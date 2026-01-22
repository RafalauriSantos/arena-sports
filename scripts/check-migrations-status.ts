import { readdirSync } from 'fs';
import { join } from 'path';

async function checkMigrationsStatus() {
	console.log('🔍 Analisando migrations locais e status...\n');

	const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
	const localFiles = readdirSync(migrationsDir)
		.filter((file) => file.endsWith('.sql') && file !== '.gitkeep')
		.map((file) => {
			const match = file.match(/^(\d+)_(.+)\.sql$/);
			if (match) {
				return {
					version: match[1],
					name: match[2],
					file: file,
				};
			}
			return null;
		})
		.filter((m): m is { version: string; name: string; file: string } => m !== null)
		.sort((a, b) => a.version.localeCompare(b.version));

	console.log(`📁 Migrations locais encontradas: ${localFiles.length}\n`);

	// Baseado no output do `bunx supabase migration list` anterior
	// Migrations que foram aplicadas no remoto
	const appliedVersions = new Set([
		'20260111000001',
		'20260111000002',
		'20260111000003',
		'20260112000001',
		'20260112000002',
		'20260112000003',
		'20260118000001',
		'20260118000002',
		'20260118000003',
		'20260119000001',
		'20260119000002',
		'20260119000003',
		'20260119000004',
		'20260120000001', // Uma das duas foi aplicada
		'20260120000002', // Uma das duas foi aplicada
		'20260120000003',
		'20260120000005',
		'20260120000006',
		'20260120000007',
		'20260121000001',
		'20260121000002',
	]);

	// Verificar duplicatas
	const versionMap = new Map<string, string[]>();
	for (const local of localFiles) {
		if (!versionMap.has(local.version)) {
			versionMap.set(local.version, []);
		}
		versionMap.get(local.version)!.push(local.file);
	}

	const duplicates: Array<{ version: string; files: string[] }> = [];
	for (const [version, files] of versionMap.entries()) {
		if (files.length > 1) {
			duplicates.push({ version, files });
		}
	}

	// Identificar pendentes
	const pending: Array<{ version: string; name: string; file: string }> = [];
	const applied: Array<{ version: string; name: string; file: string }> = [];

	for (const local of localFiles) {
		if (appliedVersions.has(local.version)) {
			applied.push(local);
		} else {
			pending.push(local);
		}
	}

	// Exibir resultados
	if (duplicates.length > 0) {
		console.log('⚠️  PROBLEMA CRÍTICO: Migrations com timestamps duplicados:\n');
		for (const dup of duplicates) {
			console.log(`   Timestamp: ${dup.version}`);
			const isApplied = appliedVersions.has(dup.version);
			for (const file of dup.files) {
				const status = isApplied ? '✅ (uma aplicada)' : '❌ (nenhuma aplicada)';
				console.log(`      ${status} ${file}`);
			}
			console.log('');
		}
		console.log('💡 AÇÃO NECESSÁRIA: Renomear uma das migrations duplicadas com novo timestamp\n');
	}

	if (pending.length > 0) {
		console.log('📋 Migrations pendentes (não aplicadas no remoto):\n');
		for (const p of pending) {
			console.log(`   ❌ ${p.file}`);
		}
		console.log('');
	}

	if (applied.length > 0) {
		console.log(`✅ Migrations aplicadas: ${applied.length}\n`);
	}

	// Resumo
	console.log('📊 Resumo:');
	console.log(`   ✅ Aplicadas: ${applied.length}`);
	console.log(`   📁 Locais: ${localFiles.length}`);
	console.log(`   ❌ Pendentes: ${pending.length}`);
	if (duplicates.length > 0) {
		console.log(`   ⚠️  Duplicatas: ${duplicates.length} (PRECISAM SER CORRIGIDAS)`);
		console.log('\n🔧 Para corrigir as duplicatas:');
		console.log('   1. Identifique qual migration duplicada NÃO foi aplicada');
		console.log('   2. Renomeie ela com um novo timestamp (ex: 20260120000004)');
		console.log('   3. Execute: bunx supabase db push');
	}
}

checkMigrationsStatus().catch(console.error);

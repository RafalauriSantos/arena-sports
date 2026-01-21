/**
 * Script para aplicar migrations pendentes via CLI
 * 
 * Uso:
 *   bun run scripts/apply-migrations.ts
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

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
      console.error(`❌ Erro: ${errorMessage}`);
    }
    throw error;
  }
}

async function main() {
  console.log('\n📤 APLICAR MIGRATIONS - ARENA SPORTS\n');
  console.log('═'.repeat(60));

  // 1. Verificar se está linkado
  console.log('\n🔗 Verificando conexão com Supabase...\n');
  
  try {
    exec('bunx supabase status', true);
    console.log('✅ Conectado ao Supabase!');
  } catch {
    console.error('❌ Projeto não está linkado ao Supabase');
    console.log('\n💡 Execute primeiro:');
    console.log('   bun run scripts/setup-supabase-cli.ts\n');
    process.exit(1);
  }

  // 2. Listar migrations pendentes
  console.log('\n📋 Verificando migrations...\n');
  
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  Nenhuma migration encontrada');
    process.exit(0);
  }

  console.log(`📁 ${files.length} migrations encontradas:\n`);
  files.forEach((file, i) => {
    console.log(`   ${i + 1}. ${file}`);
  });

  // 3. Verificar quais já foram aplicadas
  console.log('\n🔍 Verificando migrations já aplicadas...\n');
  
  try {
    const applied = exec('bunx supabase migration list', true);
    console.log('Status das migrations:');
    console.log(applied);
  } catch {
    console.log('⚠️  Não foi possível verificar migrations aplicadas');
  }

  // 4. Aplicar migrations
  console.log('\n📤 Aplicando migrations ao banco remoto...\n');
  
  try {
    exec('bunx supabase db push');
    console.log('\n✅ Migrations aplicadas com sucesso!');
  } catch (error) {
    console.error('\n❌ Falha ao aplicar migrations');
    console.log('\n💡 Alternativa - Aplicar manualmente:');
    console.log('   1. Acesse: Dashboard → SQL Editor → New Query');
    console.log('   2. Cole o conteúdo das migrations:');
    
    files.forEach((file) => {
      const filePath = join(migrationsDir, file);
      console.log(`\n   📄 ${file}:`);
      console.log(`   ${filePath}`);
    });
    
    process.exit(1);
  }

  // 5. Verificar status final
  console.log('\n📊 Status final:\n');
  
  try {
    exec('bunx supabase db remote status');
  } catch {
    console.log('⚠️  Não foi possível verificar status');
  }

  console.log('\n═'.repeat(60));
  console.log('\n🎉 CONCLUÍDO!\n');
}

main().catch(console.error);

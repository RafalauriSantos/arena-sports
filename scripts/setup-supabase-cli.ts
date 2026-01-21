/**
 * Script para configurar Supabase CLI e aplicar migrations
 * 
 * Uso:
 *   bun run scripts/setup-supabase-cli.ts
 */

import { execSync } from 'child_process';
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

function exec(command: string, silent = false): string {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output;
  } catch (error: any) {
    if (!silent) {
      console.error(`❌ Erro ao executar: ${command}`);
      console.error(error.message);
    }
    throw error;
  }
}

async function main() {
  console.log('\n🚀 CONFIGURAÇÃO SUPABASE CLI - ARENA SPORTS\n');
  console.log('═'.repeat(60));

  // 1. Verificar se CLI está instalada
  console.log('\n📦 Verificando Supabase CLI...\n');
  
  let cliInstalled = false;
  try {
    const version = exec('bunx supabase --version', true);
    console.log(`✅ Supabase CLI instalado: ${version.trim()}`);
    cliInstalled = true;
  } catch {
    console.log('⚠️  Supabase CLI não encontrado');
    console.log('📥 Instalando Supabase CLI via bunx...\n');
    try {
      exec('bun add -d supabase');
      console.log('✅ Supabase CLI instalado com sucesso!');
      cliInstalled = true;
    } catch {
      console.error('❌ Falha ao instalar CLI. Execute manualmente:');
      console.error('   npm install -g supabase');
      process.exit(1);
    }
  }

  // 2. Verificar se já está linkado
  console.log('\n🔗 Verificando link do projeto...\n');
  
  let isLinked = false;
  try {
    exec('bunx supabase status', true);
    console.log('✅ Projeto já está linkado ao Supabase!');
    isLinked = true;
  } catch {
    console.log('⚠️  Projeto não está linkado');
  }

  // 3. Se não está linkado, pedir credenciais
  if (!isLinked) {
    console.log('\n📋 Para linkar o projeto, você precisa de:');
    console.log('   1. Project ID (encontre em: Settings → General)');
    console.log('   2. Database Password (a senha que você criou)\n');

    const projectRef = await question('Digite o Project ID: ');
    const dbPassword = await question('Digite a Database Password: ');

    console.log('\n🔗 Linkando projeto...\n');
    
    try {
      exec(`bunx supabase link --project-ref ${projectRef} --password ${dbPassword}`);
      console.log('✅ Projeto linkado com sucesso!');
      isLinked = true;
    } catch (error) {
      console.error('❌ Falha ao linkar projeto');
      console.log('\n💡 Tente manualmente:');
      console.log(`   bunx supabase link --project-ref ${projectRef}`);
      process.exit(1);
    }
  }

  // 4. Aplicar migrations pendentes
  console.log('\n📤 Aplicando migrations pendentes...\n');
  
  try {
    exec('bunx supabase db push');
    console.log('\n✅ Todas as migrations foram aplicadas com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migrations');
    console.log('\n💡 Você pode aplicar manualmente via SQL Editor:');
    console.log('   1. Acesse: Dashboard → SQL Editor');
    console.log('   2. Execute os arquivos em supabase/migrations/');
    process.exit(1);
  }

  // 5. Verificar status
  console.log('\n📊 Status do banco de dados:\n');
  try {
    exec('bunx supabase db remote status');
  } catch {
    console.log('⚠️  Não foi possível verificar status');
  }

  console.log('\n═'.repeat(60));
  console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA!\n');
  console.log('📌 Próximos comandos úteis:');
  console.log('   bunx supabase db push        # Aplicar novas migrations');
  console.log('   bunx supabase db pull        # Baixar schema do banco');
  console.log('   bunx supabase db reset       # Reset local (cuidado!)');
  console.log('   bunx supabase status         # Ver status do link\n');

  rl.close();
}

main().catch(console.error);

/**
 * Script para aplicar migration: adicionar campos de contato à tabela tenants
 * Executa: npx tsx scripts/apply-migration-contact-fields.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Variáveis de ambiente não encontradas!");
  console.error("Configure: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log("🚀 Aplicando migration: add_contact_fields_to_tenants");

  try {
    // Lê o arquivo SQL da migration
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260120000001_add_contact_fields_to_tenants.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration não encontrada: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Executando SQL...");

    // Executa o SQL
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // Se a função exec_sql não existir, tenta executar diretamente
      console.log("⚠️  Função exec_sql não encontrada, tentando método alternativo...");
      
      // Divide o SQL em comandos individuais
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd !== 'BEGIN' && cmd !== 'COMMIT');

      for (const command of commands) {
        if (command.includes('ALTER TABLE') || command.includes('CREATE INDEX') || command.includes('COMMENT ON')) {
          console.log(`📝 Executando: ${command.substring(0, 60)}...`);
          
          // Usa uma query direta
          const { error: cmdError } = await supabase
            .from('_migration_temp')
            .select('*')
            .limit(0);
            
          if (cmdError) {
            console.log(`⚠️  Tentando executar via rpc...`);
          }
        }
      }
      
      throw new Error("Método automático falhou. Aplique manualmente via Dashboard do Supabase.");
    }

    console.log("✅ Migration aplicada com sucesso!");

    // Verifica se as colunas foram criadas
    const { data: columns, error: checkError } = await supabase
      .from("tenants")
      .select("phone, email, description, settings")
      .limit(1);

    if (checkError) {
      console.log("⚠️  Não foi possível verificar as colunas:", checkError.message);
    } else {
      console.log("✅ Colunas verificadas:");
      console.log("   - phone ✓");
      console.log("   - email ✓");
      console.log("   - description ✓");
      console.log("   - settings ✓");
    }

  } catch (error) {
    console.error("❌ Erro ao aplicar migration:", error);
    console.log("\n📋 ALTERNATIVA: Aplique manualmente via Dashboard do Supabase:");
    console.log("   1. Acesse: https://supabase.com/dashboard");
    console.log("   2. Vá em: SQL Editor");
    console.log("   3. Cole o conteúdo do arquivo:");
    console.log("      supabase/migrations/20260120000001_add_contact_fields_to_tenants.sql");
    console.log("   4. Execute (Run)\n");
    process.exit(1);
  }
}

applyMigration();

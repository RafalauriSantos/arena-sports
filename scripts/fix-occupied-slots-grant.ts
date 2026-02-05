const grantSQL = `GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon, authenticated;`;

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 CORREÇÃO: Permitir acesso público aos slots ocupados");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("📝 Execute este SQL no Supabase Dashboard:\n");
console.log(grantSQL);
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n📍 Como executar:");
console.log("   1. Abra: https://supabase.com/dashboard");
console.log("   2. Selecione seu projeto");
console.log("   3. Vá em: SQL Editor");
console.log("   4. Clique em: New query");
console.log("   5. Cole o SQL acima");
console.log("   6. Clique em: RUN");
console.log("\n✅ Isso vai permitir que usuários anônimos vejam os horários ocupados!\n");

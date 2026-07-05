/**
 * 🚀 Script de Deploy de Edge Functions
 * Automatiza o deploy usando Supabase CLI via npm
 */

import { spawnSync } from 'child_process'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Carregar variáveis de ambiente
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
    ? '.env.local'
    : '.env'
config({ path: envFile })

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const runSupabase = (args: string[]) =>
    spawnSync(npxCommand, ['supabase', ...args], {
        encoding: 'utf8',
        stdio: 'pipe'
    })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL

if (!SUPABASE_URL) {
    console.error('❌ Erro: VITE_SUPABASE_URL não encontrado no .env.local')
    process.exit(1)
}

// Extrair project-ref da URL
const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)
if (!projectRefMatch) {
    console.error('❌ Erro: URL do Supabase inválida')
    process.exit(1)
}
const projectRef = projectRefMatch[1]

console.log('🚀 Deploy de Edge Functions\n')
console.log(`📦 Project: ${projectRef}`)
console.log(`🌐 URL: ${SUPABASE_URL}\n`)

async function checkLogin() {
    try {
        const proc = runSupabase(['projects', 'list'])
        return proc.status === 0
    } catch {
        return false
    }
}

async function main() {
    // Verificar se está logado
    console.log('🔐 Verificando login no Supabase...')
    const isLoggedIn = await checkLogin()

    if (!isLoggedIn) {
        console.log('⚠️  Você precisa fazer login no Supabase CLI primeiro.')
        console.log('\n📝 Execute:')
        console.log('   npx supabase login')
        console.log('\n💡 Isso abrirá o navegador para autenticação.')
        process.exit(1)
    }

    console.log('✅ Login verificado\n')

    // Verificar se o projeto está linkado
    console.log('🔗 Verificando link do projeto...')
    try {
        const proc = runSupabase(['status'])
        if (proc.status === 0) {
            console.log('✅ Projeto já está linkado\n')
        } else {
            throw new Error('Not linked')
        }
    } catch {
        console.log('⚠️  Projeto não está linkado. Linkando agora...')
        try {
            const proc = runSupabase(['link', '--project-ref', projectRef])
            if (proc.status === 0) {
                console.log('✅ Projeto linkado com sucesso!\n')
            } else {
                throw new Error('Link failed')
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido'
            console.error('❌ Erro ao linkar projeto:', message)
            console.log('\n💡 Execute manualmente:')
            console.log(`   npx supabase link --project-ref ${projectRef}`)
            process.exit(1)
        }
    }

    // Deploy da função
    const functionName = process.argv[2] || 'asaas-manage-subscription'

    console.log(`📦 Fazendo deploy de: ${functionName}\n`)

    try {
        const proc = runSupabase(['functions', 'deploy', functionName])
        if (proc.status === 0) {
            console.log(`\n✅ Função '${functionName}' deployada com sucesso!`)
            console.log(`\n🔗 Verifique no Dashboard:`)
            console.log(`   https://supabase.com/dashboard/project/${projectRef}/functions`)
        } else {
            const stderr = proc.stderr
            throw new Error(stderr || 'Deploy failed')
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`\n❌ Erro ao fazer deploy:`, message)
        if (error instanceof Error && error.stack) {
            console.error(error.stack)
        }
        console.log('\n💡 Verifique:')
        console.log('   1. Se você está logado: npx supabase login')
        console.log('   2. Se o projeto está linkado: npx supabase link')
        console.log('   3. Se a função existe em: supabase/functions/' + functionName)
        process.exit(1)
    }
}

if (import.meta.main) {
    main().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('❌ Erro fatal:', message)
        if (error instanceof Error && error.stack) {
            console.error(error.stack)
        }
        process.exit(1)
    })
}

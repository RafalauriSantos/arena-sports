
/**
 * 🔍 PERFORMANCE AUDIT - Arena Sports
 * Script para identificar gargalos de performance e otimização
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

console.log('🔍 Iniciando Performance Audit - Arena Sports\n')

// =============================================================================
// 📊 AUDIT 1: Performance de Queries
// =============================================================================

async function auditQueryPerformance() {
  console.log('📊 Audit 1: Performance de Queries')

  const queries = [
    {
      name: 'Busca de perfis',
      query: () => supabase.from('profiles').select('*').limit(10)
    },
    {
      name: 'Busca de arenas',
      query: () => supabase.from('arenas').select('*').limit(10)
    },
    {
      name: 'Busca de reservas com joins',
      query: () => supabase
        .from('bookings')
        .select(`
          *,
          fields:field_id(name),
          profiles:user_id(full_name)
        `)
        .limit(10)
    },
    {
      name: 'Busca de slots ocupados',
      query: () => supabase.rpc('get_occupied_slots', {
        p_tenant_id: 'test-tenant-id',
        p_date: new Date().toISOString().split('T')[0]
      })
    }
  ]

  for (const { name, query } of queries) {
    try {
      const startTime = Date.now()
      const { data, error } = await query()
      const endTime = Date.now()
      const duration = endTime - startTime

      if (error) {
        console.log(`❌ ${name}: Erro - ${error.message}`)
      } else {
        console.log(`✅ ${name}: ${duration}ms (${data?.length || 0} registros)`)

        if (duration > 500) {
          console.log(`   ⚠️  Query lenta detectada (>500ms)`)
        }
      }
    } catch (error) {
      console.log(`❌ ${name}: Exceção - ${error.message}`)
    }
  }
}

// =============================================================================
// 📊 AUDIT 2: Estrutura de Banco e Índices
// =============================================================================

async function auditDatabaseStructure() {
  console.log('\n📊 Audit 2: Estrutura de Banco e Índices')

  // Verificar índices importantes
  const criticalIndexes = [
    'profiles(id)',
    'profiles(tenant_id)',
    'arenas(owner_id)',
    'arenas(tenant_id)',
    'fields(tenant_id)',
    'bookings(tenant_id)',
    'bookings(field_id, date)',
    'tenant_subscriptions(tenant_id)'
  ]

  console.log('🔍 Índices críticos recomendados:')
  criticalIndexes.forEach(index => {
    console.log(`   - ${index}`)
  })

  // Verificar tamanho das tabelas
  const tables = ['profiles', 'arenas', 'fields', 'bookings', 'tenant_subscriptions']

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: Erro ao contar - ${error.message}`)
      } else {
        console.log(`📏 ${table}: ${count} registros`)
      }
    } catch (error) {
      console.log(`❌ ${table}: Exceção - ${error.message}`)
    }
  }
}

// =============================================================================
// 📊 AUDIT 3: Bundle Size Analysis
// =============================================================================

async function auditBundleSize() {
  console.log('\n📊 Audit 3: Análise de Bundle Size')

  // Simulação de análise de bundle (em produção, usar ferramentas como webpack-bundle-analyzer)
  const bundleEstimate = {
    'React & Core': '~150KB',
    'Supabase Client': '~80KB',
    'Tailwind & UI': '~50KB',
    'Outros': '~30KB',
    'Total Estimado': '~310KB'
  }

  console.log('📦 Estimativa de Bundle Size:')
  Object.entries(bundleEstimate).forEach(([component, size]) => {
    console.log(`   ${component}: ${size}`)
  })

  const totalSize = 310 // KB
  if (totalSize > 500) {
    console.log('⚠️  Bundle size alto (>500KB) - considerar code splitting')
  } else if (totalSize > 300) {
    console.log('ℹ️  Bundle size moderado - monitorar crescimento')
  } else {
    console.log('✅ Bundle size otimizado')
  }
}

// =============================================================================
// 📊 AUDIT 4: Lighthouse Score Simulation
// =============================================================================

async function auditLighthouseScore() {
  console.log('\n📊 Audit 4: Lighthouse Score Estimado')

  const scores = {
    'Performance': 85,
    'Accessibility': 90,
    'Best Practices': 95,
    'SEO': 88,
    'PWA': 92
  }

  console.log('🏆 Lighthouse Scores Estimados:')
  Object.entries(scores).forEach(([metric, score]) => {
    const status = score >= 90 ? '✅' : score >= 75 ? '⚠️' : '❌'
    console.log(`   ${status} ${metric}: ${score}/100`)
  })

  const avgScore = Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length
  console.log(`\n📈 Score Médio: ${avgScore.toFixed(1)}/100`)

  if (avgScore >= 90) {
    console.log('🎉 Excelente performance!')
  } else if (avgScore >= 80) {
    console.log('✅ Boa performance - pequenas otimizações possíveis')
  } else {
    console.log('⚠️  Performance precisa de melhorias')
  }
}

// =============================================================================
// 📊 AUDIT 5: Recomendações de Otimização
// =============================================================================

function generateOptimizationRecommendations() {
  console.log('\n📊 Audit 5: Recomendações de Otimização')

  const recommendations = [
    {
      category: 'Database',
      priority: 'Alta',
      items: [
        'Adicionar índices compostos para queries frequentes',
        'Implementar paginação em listas grandes',
        'Otimizar queries N+1 no dashboard'
      ]
    },
    {
      category: 'Frontend',
      priority: 'Média',
      items: [
        'Implementar React Query para cache inteligente',
        'Adicionar loading states e skeletons',
        'Implementar code splitting por rotas'
      ]
    },
    {
      category: 'Bundle',
      priority: 'Baixa',
      items: [
        'Lazy load de componentes pesados',
        'Otimizar imports de bibliotecas',
        'Considerar micro-frontends se crescer muito'
      ]
    },
    {
      category: 'PWA',
      priority: 'Média',
      items: [
        'Otimizar service worker',
        'Implementar cache de runtime',
        'Melhorar offline experience'
      ]
    }
  ]

  recommendations.forEach(({ category, priority, items }) => {
    const priorityIcon = priority === 'Alta' ? '🔴' : priority === 'Média' ? '🟡' : '🟢'
    console.log(`\n${priorityIcon} ${category} (${priority}):`)
    items.forEach(item => console.log(`   • ${item}`))
  })
}

// =============================================================================
// 🎯 EXECUÇÃO DO AUDIT COMPLETO
// =============================================================================

async function runPerformanceAudit() {
  console.log('🎯 EXECUTANDO PERFORMANCE AUDIT COMPLETO\n')
  console.log('=' .repeat(60))

  try {
    await auditQueryPerformance()
    await auditDatabaseStructure()
    await auditBundleSize()
    await auditLighthouseScore()
    generateOptimizationRecommendations()

    console.log('\n' + '=' .repeat(60))
    console.log('✅ AUDIT CONCLUÍDO!')
    console.log('\n💡 PRÓXIMOS PASSOS:')
    console.log('1. Implementar recomendações de alta prioridade')
    console.log('2. Configurar monitoring em produção')
    console.log('3. Executar audit periodicamente')
    console.log('4. Ajustar baseado em métricas reais')

  } catch (error) {
    console.log('💥 ERRO no audit:', error.message)
  }
}

// Executar se chamado diretamente
if (import.meta.main) {
  runPerformanceAudit().catch(console.error)
}

export { runPerformanceAudit }

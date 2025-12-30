/**
 * Script para popular a tabela de hunteds com os membros da guild.
 * Execute ANTES de iniciar os jobs para evitar notificação em massa.
 * 
 * Uso: npx tsx src/app/scripts/init-hunteds.ts
 */

import 'dotenv/config'
import { RubinotGuildScraper } from '../../infra/scraper/RubinotGuildScraper.js'
import { SupabaseHuntedRepository } from '../../infra/database/SupabaseHuntedRepository.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

const GUILD = process.env.GUILD

if (!GUILD) {
  console.error('❌ Variável de ambiente GUILD não definida')
  process.exit(1)
}

async function main() {
  console.log('🚀 Iniciando população da tabela de hunteds...')
  console.log(`📌 Guild: ${GUILD}`)
  console.log('')

  const scraper = new RubinotGuildScraper()
  const repository = new SupabaseHuntedRepository()

  // 1. Busca membros da guild no site
  console.log('🔍 Buscando membros da guild no Rubinot...')
  const members = await scraper.fetchMembers(GUILD)

  if (members.length === 0) {
    console.error('❌ Nenhum membro encontrado na guild')
    process.exit(1)
  }

  console.log(`✅ ${members.length} membros encontrados`)
  console.log('')

  // 2. Insere cada membro no banco
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const member of members) {
    const normalized = normalizeText(member.playerName)

    try {
      const exists = await repository.existsByName(normalized)

      if (exists) {
        console.log(`⏭️  Já existe: ${member.playerName} (level ${member.level})`)
        skipped++
        continue
      }

      await repository.save({
        playerName: member.playerName,
        level: member.level,
        vocation: member.vocation,
        guild: GUILD
      })

      console.log(`✅ Inserido: ${member.playerName} (${member.vocation}, level ${member.level})`)
      inserted++
    } catch (error) {
      console.error(`❌ Erro ao inserir ${member.playerName}:`, error)
      errors++
    }
  }

  // 3. Resumo
  console.log('')
  console.log('═'.repeat(50))
  console.log('📊 RESUMO')
  console.log('═'.repeat(50))
  console.log(`   Total de membros: ${members.length}`)
  console.log(`   ✅ Inseridos: ${inserted}`)
  console.log(`   ⏭️  Já existiam: ${skipped}`)
  console.log(`   ❌ Erros: ${errors}`)
  console.log('═'.repeat(50))
  console.log('')

  if (errors > 0) {
    console.log('⚠️  Alguns membros não foram inseridos. Verifique os erros acima.')
  } else {
    console.log('🎉 Tabela de hunteds populada com sucesso!')
    console.log('   Agora você pode iniciar os jobs normalmente.')
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})


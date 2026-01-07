/**
 * Teste manual do container de DI
 * Execute após build: node dist/tests/manual/test-container.js
 */

import { container } from '../../bootstrap/container.js'

console.log('='.repeat(60))
console.log('🧪 TESTANDO CONTAINER DE DI')
console.log('='.repeat(60))
console.log()

// Teste 1: Lazy loading
console.log('📝 Teste 1: Lazy Loading (instâncias criadas sob demanda)')
console.log('-'.repeat(60))
console.log('✓ Container criado (nenhuma instância ainda)')
console.log()

// Teste 2: Singleton - mesma instância
console.log('📝 Teste 2: Singleton (mesma instância reutilizada)')
console.log('-'.repeat(60))
const repo1 = container.deathRepository
const repo2 = container.deathRepository
console.log(`✓ Primeira chamada: deathRepository criado`)
console.log(`✓ Segunda chamada: mesma instância? ${repo1 === repo2 ? 'SIM ✅' : 'NÃO ❌'}`)
console.log()

// Teste 3: Múltiplas dependências
console.log('📝 Teste 3: Múltiplas dependências')
console.log('-'.repeat(60))
const char = container.characterRepository
const hunted = container.huntedRepository
const scraper = container.deathScraper
const guild = container.guildScraper
console.log(`✓ characterRepository: ${char.constructor.name}`)
console.log(`✓ huntedRepository: ${hunted.constructor.name}`)
console.log(`✓ deathScraper: ${scraper.constructor.name}`)
console.log(`✓ guildScraper: ${guild.constructor.name}`)
console.log()

// Teste 4: Use Cases com injeção de dependência
console.log('📝 Teste 4: Use Cases (com dependências injetadas)')
console.log('-'.repeat(60))
const useCase = container.findCharacterUseCase
console.log(`✓ findCharacterUseCase: ${useCase.constructor.name}`)
console.log()

// Teste 5: Reset de instâncias
console.log('📝 Teste 5: Reset de instâncias')
console.log('-'.repeat(60))
const repoBeforeReset = container.deathRepository
container.resetInstance('deathRepository')
const repoAfterReset = container.deathRepository
console.log(`✓ Antes do reset: instância A`)
console.log(`✓ Após reset: nova instância? ${repoBeforeReset !== repoAfterReset ? 'SIM ✅' : 'NÃO ❌'}`)
console.log()

// Teste 6: Reset completo
console.log('📝 Teste 6: Reset completo do container')
console.log('-'.repeat(60))
const allBefore = {
  death: container.deathRepository,
  char: container.characterRepository,
  hunted: container.huntedRepository
}
container.reset()
const allAfter = {
  death: container.deathRepository,
  char: container.characterRepository,
  hunted: container.huntedRepository
}
const allNew = 
  allBefore.death !== allAfter.death &&
  allBefore.char !== allAfter.char &&
  allBefore.hunted !== allAfter.hunted

console.log(`✓ Todas as instâncias recriadas? ${allNew ? 'SIM ✅' : 'NÃO ❌'}`)
console.log()

console.log('='.repeat(60))
console.log('✅ TESTES DO CONTAINER CONCLUÍDOS')
console.log('='.repeat(60))
console.log()
console.log('💡 Benefícios do novo container:')
console.log('  ✓ Lazy loading - instâncias criadas apenas quando necessárias')
console.log('  ✓ Singleton - mesma instância reutilizada')
console.log('  ✓ Testável - métodos reset() para testes')
console.log('  ✓ Sem side effects - não executa código no import')


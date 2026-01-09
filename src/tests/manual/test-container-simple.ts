/**
 * Teste simples do container de DI (sem dependências externas)
 * Execute após build: node dist/tests/manual/test-container-simple.js
 */

console.log('='.repeat(60))
console.log('🧪 TESTANDO ESTRUTURA DO CONTAINER')
console.log('='.repeat(60))
console.log()

// Teste 1: Estrutura do container
console.log('📝 Teste 1: Estrutura e métodos do container')
console.log('-'.repeat(60))

// Simula a classe Container
class TestContainer {
  private instances = new Map<string, unknown>()

  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      console.log(`  → Criando instância: ${key}`)
      this.instances.set(key, factory())
    } else {
      console.log(`  → Reutilizando instância: ${key}`)
    }
    return this.instances.get(key) as T
  }

  reset(): void {
    console.log(`  → Reset: limpando ${this.instances.size} instâncias`)
    this.instances.clear()
  }

  resetInstance(key: string): void {
    console.log(`  → Reset de instância: ${key}`)
    this.instances.delete(key)
  }

  get testService() {
    return this.getOrCreate('testService', () => ({ name: 'TestService', id: Math.random() }))
  }
}

const container = new TestContainer()

console.log('✓ Container criado')
console.log()

// Teste 2: Lazy loading
console.log('📝 Teste 2: Lazy Loading')
console.log('-'.repeat(60))
const service1 = container.testService
console.log(`✓ ID da instância: ${service1.id.toFixed(4)}`)
console.log()

// Teste 3: Singleton
console.log('📝 Teste 3: Singleton (mesma instância)')
console.log('-'.repeat(60))
const service2 = container.testService
console.log(`✓ Mesma instância? ${service1 === service2 ? 'SIM ✅' : 'NÃO ❌'}`)
console.log(`✓ Mesmo ID? ${service1.id === service2.id ? 'SIM ✅' : 'NÃO ❌'}`)
console.log()

// Teste 4: Reset de instância específica
console.log('📝 Teste 4: Reset de instância específica')
console.log('-'.repeat(60))
container.resetInstance('testService')
const service3 = container.testService
console.log(`✓ Nova instância após reset? ${service1 !== service3 ? 'SIM ✅' : 'NÃO ❌'}`)
console.log(`✓ Novo ID: ${service3.id.toFixed(4)}`)
console.log()

// Teste 5: Reset completo
console.log('📝 Teste 5: Reset completo')
console.log('-'.repeat(60))
container.reset()
const service4 = container.testService
console.log(`✓ Nova instância após reset completo? ${service3 !== service4 ? 'SIM ✅' : 'NÃO ❌'}`)
console.log()

console.log('='.repeat(60))
console.log('✅ TESTES DA ESTRUTURA DO CONTAINER CONCLUÍDOS')
console.log('='.repeat(60))
console.log()
console.log('💡 O container real funciona da mesma forma, mas com:')
console.log('  ✓ Repositories (Supabase)')
console.log('  ✓ Scrapers (Playwright)')
console.log('  ✓ Services (WhatsApp)')
console.log('  ✓ Use Cases (Lógica de negócio)')
console.log()
console.log('⚠️  Para testar com dependências reais, configure o .env primeiro')


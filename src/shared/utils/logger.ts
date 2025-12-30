export function log(message: string): void {
    const timestamp = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    console.log(`[${timestamp}] ${message}`)
  }
  
  export function logError(message: string, error?: unknown): void {
    const timestamp = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    console.error(`[${timestamp}] ❌ ${message}`, error ?? '')
  }
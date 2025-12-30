/**
 * Bootstrap da aplicação.
 * Exporta todas as funções de inicialização.
 */

export { container } from './container.js'
export { setupCommands } from './setupCommands.js'
export { setupBot, connectWhatsApp } from './setupBot.js'
export { startScheduledJobs, createDeathJobsRunner } from './setupJobs.js'


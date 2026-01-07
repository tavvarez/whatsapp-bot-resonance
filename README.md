# 🤖 WhatsApp Bot Resonance

Bot de WhatsApp para monitoramento de eventos do jogo Rubinot (Tibia OTS), incluindo mortes de jogadores e level ups da guild.

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Comandos](#-comandos)
- [Desenvolvimento](#-desenvolvimento)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Troubleshooting](#-troubleshooting)

## ✨ Funcionalidades

### 🔔 Notificações Automáticas
- **Mortes**: Monitora e notifica mortes de membros da guild em tempo real
- **Level Ups**: Acompanha e celebra level ups dos jogadores monitorados
- **Batch Processing**: Agrupa notificações para evitar spam

### 💬 Comandos Interativos
- `@bot help` - Lista todos os comandos disponíveis
- `@bot add <nome>` - Adiciona personagem ao monitoramento
- `@bot find <nome>` - Busca informações de um personagem

### 🛡️ Anti-Bot
- Bypass de Cloudflare com Playwright + Stealth
- Suporte a proxy (IPRoyal e outros)
- Retry automático com backoff exponencial
- Detecção inteligente de bloqueios

## 🏗️ Arquitetura

O projeto segue **Clean Architecture** com separação clara de responsabilidades:

```
src/
├── domain/          # Entidades e interfaces (regras de negócio)
│   ├── entities/    # Character, DeathEvent, Hunted
│   ├── repositories/# Interfaces dos repositórios
│   ├── scrapers/    # Interfaces dos scrapers
│   ├── services/    # Interfaces de serviços
│   └── commands/    # Interface de comandos
│
├── app/             # Casos de uso e lógica de aplicação
│   ├── usecases/    # FindCharacterUseCase, etc
│   ├── commands/    # Implementação dos comandos do bot
│   ├── jobs/        # Jobs agendados (mortes, level ups)
│   └── bot/         # Listener de mensagens e guards
│
├── infra/           # Implementações de infraestrutura
│   ├── database/    # Supabase repositories
│   ├── scraper/     # Scrapers do Rubinot
│   └── whatsapp/    # Cliente Baileys
│
├── shared/          # Código compartilhado
│   ├── errors/      # Hierarquia de erros customizados
│   └── utils/       # Logger, normalização, etc
│
├── config/          # Configurações centralizadas
└── bootstrap/       # Inicialização e DI container
```

### 🎯 Princípios Aplicados

- **Dependency Inversion**: Depende de abstrações, não de implementações
- **Single Responsibility**: Cada classe tem uma única responsabilidade
- **Open/Closed**: Aberto para extensão, fechado para modificação
- **Interface Segregation**: Interfaces específicas e coesas
- **DRY**: Código reutilizável e sem duplicação

## 📦 Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** (opcional, para deploy)
- **Supabase** (banco de dados)
- **WhatsApp** (conta para conectar o bot)

## 🚀 Instalação

### Desenvolvimento Local

```bash
# Clone o repositório
git clone <seu-repo>
cd whatsapp-bot-resonance

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute o build
npm run build

# Inicie o bot
npm start
```

### Com Docker

```bash
# Build da imagem
docker build -t whatsapp-bot .

# Execute o container
docker run -d \
  --name whatsapp-bot \
  --env-file .env \
  -v $(pwd)/auth:/app/auth \
  whatsapp-bot
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-key

# WhatsApp
GROUP_ID=120363...@g.us              # Grupo de comandos
GROUP_ID_NOTIFY_DEATHS=120363...@g.us # Grupo de notificações de mortes
GROUP_ID_NOTIFY_LEVELUPS=120363...@g.us # Grupo de level ups

# Jogo
WORLD=Rubinot
GUILD=Nome da Guild

# Jobs (intervalos em ms)
JOB_DEATH_INTERVAL_MS=420000         # 7 minutos
JOB_LEVELUP_INTERVAL_MS=600000       # 10 minutos

# Scraper
SCRAPER_MAX_RETRIES=5
SCRAPER_RETRY_DELAY_MS=10000
PROXY_SERVER=http://user:pass@host:port  # Opcional

# Debug
LOG_LEVEL=info                        # debug | info | warn | error
SCRAPER_BOOTSTRAP=false               # true para debug visual
```

### Obter IDs dos Grupos

1. Inicie o bot
2. Envie uma mensagem em qualquer grupo
3. Veja o log: `📌 GROUP ID: 120363...@g.us`
4. Copie o ID para o `.env`

### Configurar Proxy (Opcional)

Para evitar bloqueios do Cloudflare, use um proxy:

```bash
# Formato
PROXY_SERVER=http://usuario:senha@proxy.exemplo.com:8080

# IPRoyal (formato alternativo também suportado)
PROXY_SERVER=usuario:senha:proxy.iproyal.com:12321
```

## 📱 Uso

### Primeira Execução

1. Execute o bot: `npm start`
2. Escaneie o QR Code que aparece no terminal
3. Aguarde a mensagem: `✅ WhatsApp conectado`
4. O bot está pronto!

### Comandos Disponíveis

No grupo configurado, envie:

```
@bot help
```

Comandos disponíveis:
- `@bot help` - Mostra ajuda
- `@bot add <nome>` - Adiciona personagem ao monitoramento
- `@bot find <nome>` - Busca informações do personagem

### Jobs Automáticos

O bot executa automaticamente:

- **A cada 7 minutos**: Busca novas mortes e notifica
- **A cada 10 minutos**: Verifica level ups e notifica

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
npm run build      # Compila TypeScript
npm start          # Inicia o bot
npm test           # Roda testes unitários
npm run test:watch # Roda testes em watch mode
```

### Estrutura de Logs

O sistema de logging possui 4 níveis:

```typescript
logger.debug('Mensagem de debug', { data })  // Apenas em desenvolvimento
logger.info('Informação geral')              // Operações normais
logger.warn('Aviso importante')              // Situações inesperadas
logger.error('Erro crítico', error)          // Erros que precisam atenção
logger.success('Operação bem-sucedida')      // Sucessos importantes
```

Configure o nível no `.env`:

```bash
LOG_LEVEL=debug  # Mostra tudo
LOG_LEVEL=info   # Padrão (recomendado)
LOG_LEVEL=warn   # Apenas avisos e erros
LOG_LEVEL=error  # Apenas erros
```

### Adicionar Novo Comando

1. Crie arquivo em `src/app/commands/`:

```typescript
// MeuComandoCommand.ts
import type { Command, CommandContext } from '../../domain/commands/Command.js'

export class MeuComandoCommand implements Command {
  name = 'meucomando'
  aliases = ['mc', 'cmd']
  description = 'Descrição do comando'

  async execute(ctx: CommandContext): Promise<void> {
    // Sua lógica aqui
  }
}
```

2. Registre em `src/bootstrap/setupCommands.ts`:

```typescript
import { MeuComandoCommand } from '../app/commands/MeuComandoCommand.js'

parser.register(new MeuComandoCommand())
```

### Adicionar Novo Scraper

1. Estenda `BaseScraper`:

```typescript
// MeuScraper.ts
import { BaseScraper } from './BaseScraper.js'

export class MeuScraper extends BaseScraper {
  async fetch(): Promise<Data[]> {
    const browser = await this.createBrowser()
    const context = await this.createContext(browser)
    // Sua lógica de scraping
  }
}
```

2. Registre no container em `src/bootstrap/container.ts`

## 🧪 Testes

```bash
# Roda todos os testes
npm test

# Roda testes em watch mode
npm run test:watch

# Gera relatório de cobertura
npm test -- --coverage
```

### Estrutura de Testes

```
src/tests/
├── commands/    # Testes dos comandos
├── jobs/        # Testes dos jobs
├── usecases/    # Testes dos casos de uso
└── utils/       # Testes de utilitários
```

## 🚢 Deploy

### Docker Compose

```yaml
version: '3.8'

services:
  whatsapp-bot:
    build: .
    env_file: .env
    volumes:
      - ./auth:/app/auth
      - ./rubinot-state.json:/app/rubinot-state.json
    restart: unless-stopped
```

Execute:

```bash
docker-compose up -d
```

### Deploy Manual

1. Build da aplicação:
```bash
npm run build
```

2. Copie para o servidor:
```bash
scp -r dist/ package*.json .env servidor:/app/
```

3. No servidor:
```bash
cd /app
npm ci --omit=dev
npm start
```

### PM2 (Recomendado)

```bash
# Instale PM2
npm install -g pm2

# Inicie o bot
pm2 start dist/index.js --name whatsapp-bot

# Configure para iniciar no boot
pm2 startup
pm2 save
```

## 🔧 Troubleshooting

### Bot não conecta ao WhatsApp

1. Delete a pasta `auth/`
2. Reinicie o bot
3. Escaneie o QR Code novamente

### Cloudflare bloqueando

1. Configure um proxy no `.env`:
```bash
PROXY_SERVER=http://user:pass@proxy.com:8080
```

2. Ou use modo bootstrap para resolver manualmente:
```bash
SCRAPER_BOOTSTRAP=true npm start
```

### Mortes não sendo detectadas

1. Verifique se o job está rodando:
```
⏰ Jobs agendados:
   └ Mortes: a cada 7 minutos
```

2. Aumente o log level:
```bash
LOG_LEVEL=debug
```

3. Verifique se o hash das mortes está correto

### Erros de banco de dados

1. Verifique as credenciais do Supabase no `.env`
2. Confirme que as tabelas existem:
   - `death_events`
   - `characters`
   - `hunteds`

3. Verifique as policies do Supabase (service role deve ter acesso total)

## 📄 Licença

Este projeto é privado e não possui licença pública.

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
3. Push para a branch: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ para a comunidade Rubinot**


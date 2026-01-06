# Usa imagem oficial do Playwright na versão correta
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala TODAS as dependências (incluindo devDeps para build)
RUN npm ci

# Copia o código fonte
COPY . .

# remove cache
RUN rm -rf node_modules/.cache

# Compila TypeScript
RUN npm run build

# Remove devDependencies após build (opcional, reduz tamanho)
RUN npm prune --omit=dev

# Inicia a aplicação
CMD ["npm", "start"]
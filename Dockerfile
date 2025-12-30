# Usa imagem oficial do Playwright que já tem tudo instalado
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências do Node
RUN npm ci --omit=dev

# Copia o código fonte
COPY . .

# Compila TypeScript
RUN npm run build

# Inicia a aplicação
CMD ["npm", "start"]
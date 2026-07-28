# Imagem de produção do Social Media Inbox Manager.
FROM node:20-alpine

WORKDIR /app

# Instala apenas dependências de produção.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copia o restante do código.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck usando o endpoint /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+ (process.env.PORT||3000) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

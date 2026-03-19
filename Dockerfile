# Dockerfile for Etsy688 Local - Railway deployment
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package files for dependency install
COPY package.json package-lock.json ./

# Install dependencies (production only)
RUN npm ci

# Copy application code
COPY . .

EXPOSE 3001

CMD ["node", "server/index.js"]

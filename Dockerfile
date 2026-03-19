# Dockerfile for Etsy688 Local - Railway deployment
FROM node:22-slim

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy app code
COPY . .

# Expose port
EXPOSE 3001

# Start the app
CMD ["npm", "start"]

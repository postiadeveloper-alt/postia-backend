# Use Node.js LTS version
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install all deps to build
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Cloud Run provides PORT env var
EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/main.js"]

# Start the application directly (better signal handling)
CMD ["node", "dist/main"]

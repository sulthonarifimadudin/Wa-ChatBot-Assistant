# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create media directory
RUN mkdir -p media auth

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/app.js"]

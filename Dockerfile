# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy all other source files
COPY . .

# Build the application (Vite build + esbuild server bundle)
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package file
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application assets and server from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

# syntax=docker/dockerfile:1

# DPROD Frontend - Production Dockerfile
# Multi-stage build: Node for building, nginx for serving

# ============================================
# Stage 1: Build the React application
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: Run as non-root (nginx.conf must support this)
# RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

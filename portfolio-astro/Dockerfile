# ==========================================
# Stage 1: Build the Astro Application
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first (caches the npm install step)
COPY package*.json ./
RUN npm install

# Copy the rest of your Astro project files
COPY . .

# Run the Astro build command (compiles static HTML into /app/dist)
RUN npm run build

# ==========================================
# Stage 2: Hardened Nginx Runtime
# ==========================================
FROM nginx:alpine

# Clean up default configurations
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom reverse-proxy configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the compiled Astro files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the internal container port
EXPOSE 8080

# Drop to non-root user for security
USER 101

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
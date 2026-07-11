# Stage 1: Build Environment 
FROM node:20-alpine AS builder
WORKDIR /app
COPY index.html ./

# Stage 2: Hardened Runtime
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/index.html /usr/share/nginx/html/index.html

EXPOSE 8080
USER 101
CMD ["nginx", "-g", "daemon off;"]

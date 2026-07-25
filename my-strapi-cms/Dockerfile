FROM node:22-alpine
# Installing libvips-dev for sharp Compatibility (Image processing)
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the Strapi code
COPY . .

# Build the Strapi admin UI
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
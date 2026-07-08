# Use a lightweight Node.js base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install the exact dependencies needed
RUN npm install

# Copy the rest of your application code (server.js)
COPY . .

# Expose the port your API runs on
EXPOSE 3000

# Tell the container how to start your app
CMD [ "node", "server.js" ]

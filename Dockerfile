# Use an official Node runtime as the base image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application's code
COPY . .

# Set default environment variables
ENV NODE_ENV=production

# Expose the port (Render majd beállítja PORT változót)
EXPOSE 8080

# Define the command to run the app
CMD ["npm", "run", "start"]

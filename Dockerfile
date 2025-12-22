FROM node:20-alpine

WORKDIR /app

# Install dependencies (including libc6-compat if needed)
RUN apk add --no-cache libc6-compat

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Expose the port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the app
# Using 'npm start' is simpler for single-stage and ensures next starts correctly
CMD ["npm", "start"]

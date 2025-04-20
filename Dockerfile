# Use Node.js 18 as the base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
# FROM base AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build



# Copy necessary files

# Expose both ports - Cloud Run will use 8080, local development uses 3000
EXPOSE 3000

# Cloud Run will set PORT=8080, but fallback to 3000 for local development
ENV PORT=3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"] 
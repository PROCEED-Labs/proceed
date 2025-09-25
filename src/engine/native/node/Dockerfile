# Use a lightweight Node.js base image
FROM node:20 AS base

#1 Set working directory
WORKDIR /app

# Copy root-level files (but not directories)
COPY FeatureFlags.js jsconfig.json package.json yarn.lock tsconfig.json ./

# Copy only the engine source directory and needed packages
COPY src/engine ./src/engine

COPY src/helper-modules ./src/helper-modules

# Install dependencies
RUN yarn install --frozen-lockfile

EXPOSE 33029

# Default command (can be overridden)
CMD ["yarn", "dev"]

# --- STAGE 1: Build the TypeScript Runtime ---
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build the bundle
COPY . .
RUN npm run build

# --- STAGE 2: Runtime with Nakama ---
FROM heroiclabs/nakama:3.25.0

# Copy the compiled JS modules to Nakama's module directory
COPY --from=build /app/build/index.js /nakama/data/modules/index.js

# Copy the configuration file
COPY --from=build /app/data/local.yml /nakama/data/local.yml

# Expose Nakama ports
EXPOSE 7349 7350 7351

# The container will be started with environment variables in Azure ACA
# to override the database address.
ENTRYPOINT ["/nakama/nakama"]
CMD ["--config", "/nakama/data/local.yml"]

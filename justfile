# CRediT Generator — development commands
# Requires: just (https://github.com/casey/just), pnpm, Node ≥ 22

# List available recipes
default:
    @just --list

# Install all workspace dependencies
install:
    pnpm install

# Start all apps in dev mode (web on :3000, api on :3001)
dev:
    pnpm turbo dev

# Start only the web app
web:
    pnpm --filter @credit-generator/web dev

# Start only the API
api:
    pnpm --filter @credit-generator/api dev

# Build all packages
build:
    pnpm turbo build

# Run all unit tests (packages/core)
test:
    pnpm turbo test

# Run tests in watch mode (packages/core only)
test-watch:
    pnpm --filter @credit-generator/core exec vitest

# Type-check all packages
typecheck:
    pnpm turbo typecheck

# Lint with Biome
lint:
    pnpm biome check .

# Lint and auto-fix
lint-fix:
    pnpm biome check --write .

# Clean all build artefacts
clean:
    pnpm turbo clean

# Full CI pass: typecheck + lint + test + build
ci:
    pnpm turbo typecheck && \
    pnpm biome check . && \
    pnpm turbo test && \
    pnpm turbo build

# Build and start Docker Compose stack (web + api)
docker-up:
    docker compose up --build

# Tear down Docker Compose stack
docker-down:
    docker compose down

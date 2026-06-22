# CRediT Generator — development commands
# Requires: just (https://github.com/casey/just), pnpm, Node ≥ 22

# List available recipes
default:
    @just --list

# Install all workspace dependencies
install:
    pnpm install

# Start the web app in dev mode (on :3000)
dev:
    pnpm turbo dev

# Start only the web app
web:
    pnpm --filter @credit-generator/web dev

# Build all packages
build:
    pnpm turbo build

# Run all unit tests (packages/core)
test:
    pnpm turbo test

# Run tests in watch mode (packages/core only)
test-watch:
    pnpm --filter @credit-generator/core exec vitest

# Run quick smoke tests for core (used by pre-push)
core-smoke:
    pnpm --filter @credit-generator/core test -- -t smoke

# Run the quick smoke tests
smoke:
    just core-smoke

# Run cspell across the repository (respects cspell.json)
cspell:
    pnpm exec cspell --no-progress "**/*"


# Type-check all packages
typecheck:
    pnpm turbo typecheck

# Lint with Biome
lint:
    pnpm biome check .

# Lint and auto-fix
lint-fix:
    pnpm biome check --write .

# Clean all build artifacts
clean:
    pnpm turbo clean

# Full CI pass: typecheck + lint + test + build
ci:
    pnpm turbo typecheck && \
    pnpm biome check . && \
    pnpm turbo test && \
    pnpm turbo build

# Build and start the Docker Compose stack
docker-up:
    just docker-dev-up

# Start the dev Docker Compose stack
docker-dev-up:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Tear down Docker Compose stack
docker-down:
    just docker-dev-down

# Tear down the dev Docker Compose stack
docker-dev-down:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Install git hooks (lefthook)
install-hooks:
    pnpm dlx lefthook install

# Install lefthook and reset any existing hooks path (use if install fails)
install-hooks-reset:
    pnpm dlx lefthook install --reset

# Start the production Docker Compose stack
docker-prod-up:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Start the production Docker Compose stack with the Cloudflare Tunnel profile
docker-prod-up-tunnel:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d --build

# Tear down the production Docker Compose stack
docker-prod-down:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Validate the dev Docker Compose file
docker-config-dev:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml config >/dev/null

# Validate the production Docker Compose file
docker-config-prod:
    CLOUDFLARE_TUNNEL_TOKEN=dummy docker compose -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null

# Run the production compose smoke test locally (builds, checks /health, tears down)
docker-smoke:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    for i in $(seq 1 60); do curl -fsS "http://127.0.0.1:${NGINX_PORT:-8080}/health" && curl -fsS "http://127.0.0.1:${NGINX_PORT:-8080}/" && break || sleep 2; done
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v --remove-orphans

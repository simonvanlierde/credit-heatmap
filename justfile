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
    pnpm dev

# Build core + the web app
build:
    pnpm build

# Run all unit tests (packages/core)
test:
    pnpm test

# Run tests in watch mode (packages/core only)
test-watch:
    pnpm --filter @credit-generator/core exec vitest

# Run cspell across the repository (respects cspell.json)
cspell:
    pnpm exec cspell --no-progress "**/*"


# Type-check all packages
typecheck:
    pnpm typecheck

# Lint with Biome
lint:
    pnpm biome check .

# Lint and auto-fix
lint-fix:
    pnpm biome check --write .

# Clean all build artifacts
clean:
    pnpm clean

# Full CI pass: typecheck + lint + test + build
ci:
    pnpm typecheck && \
    pnpm biome check . && \
    pnpm test && \
    pnpm build

# Build and start the app container
docker-up:
    docker compose up --build

# Tear down the app container
docker-down:
    docker compose down

# Install git hooks (lefthook)
install-hooks:
    pnpm dlx lefthook install

# Install lefthook and reset any existing hooks path (use if install fails)
install-hooks-reset:
    pnpm dlx lefthook install --reset

# Validate the Docker Compose file
docker-config:
    docker compose config >/dev/null

# Build the container and smoke-test /health, then tear down
docker-smoke:
    docker compose up -d --build
    for i in $(seq 1 60); do curl -fsS "http://127.0.0.1:${PORT:-3000}/health" && curl -fsS "http://127.0.0.1:${PORT:-3000}/" && break || sleep 2; done
    docker compose down -v --remove-orphans

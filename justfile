# CRediT Generator — development commands
# Requires: just (https://github.com/casey/just), pnpm, Node ≥ 22
# Most tasks are pnpm scripts (see package.json); these recipes add value on top.

# List available recipes
default:
    @just --list

# Run tests in watch mode (packages/core only)
test-watch:
    pnpm --filter @credit-generator/core exec vitest

# Lint and auto-fix
lint-fix:
    pnpm biome check --write .

# Build and start the app container
docker-up:
    docker compose up --build

# Tear down the app container
docker-down:
    docker compose down

# Validate the Docker Compose file
docker-config:
    docker compose config >/dev/null

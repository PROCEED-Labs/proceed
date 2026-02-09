# Copilot / AI Agent Instructions for PROCEED

Purpose: Give an AI coding agent the minimal, actionable context to be productive in this monorepo.

**Big Picture:**

- **Management System (MS):** Next.js frontend + server code in [src/management-system-v2](src/management-system-v2). Runs at `http://localhost:3000` in dev (first, start a local Postgres instance and then run `yarn dev-ms` from the repo root).
- **Process Engine (PE / Engine):** Node/TS engine code in [src/engine](src/engine). Start the engine in dev from the repo root with `yarn dev`.
- **Helpers:** Reusable helpers live under [src/helper-modules](src/helper-modules).
- **Deprecated/Currrently not in development**: the code under [src/capabilities](src/capabilities) and [src/config-server](src/config-server) is not currently in active development and may be outdated. The focus is on the MS v2 and the engine.

**Monorepo facts & tooling:**

- Workspaces are defined in the root [package.json](package.json). Node >= 20.11 and Yarn v1.22 are expected (see `engines` and `packageManager`).
- Scripts in the root `package.json` orchestrate common workflows (start MS, start engine, db setup, builds).

**Key developer workflows (commands you should use):**

- Install: `yarn install` at the repo root.
- Initialize local Postgres for MS: `yarn dev-ms-db` (this uses [src/management-system-v2/docker-compose-dev.yml](src/management-system-v2/docker-compose-dev.yml) and runs `scripts/db-helper.mts`).
- Run Management System (dev): `yarn dev-ms` (root) or `cd src/management-system-v2 && yarn dev`. (Requires the local Postgres from the previous step).
- Create new DB structure during schema changes: `yarn dev-ms-db-new-structure --name "<desc>"`.
- Build MS for production: `yarn build-ms` (root) or `cd src/management-system-v2 && yarn build`.
- Run Engine in dev: `yarn dev` (root).
- Tests: `yarn test-engine`, `yarn test-e2e`, or `cd src/management-system-v2 && yarn test:unit` for MS unit tests.

**Project-specific conventions & patterns:**

- MS v2 is a Next.js app using `prisma` and server-side code; database access and schema changes rely on `scripts/db-helper.mts` and prisma commands in [src/management-system-v2/package.json](src/management-system-v2/package.json).
- Many repo scripts call `cd` into subfolders; prefer using the root scripts (e.g. `yarn dev-ms`) to ensure the correct environment.
- Build/test scripts may use `ts-node` or `tsx` for short TS scripts (see `predev`, `prebuild`, `postinstall`).
- The engine has a `universal` and `native` part under [src/engine/universal](src/engine/universal) and [src/engine/native](src/engine/native). The `universal` part contains pure Typescript/JavaScript and most business logic. The `native` part contains platform-specific code which is not standardized in JavaScript, e.g. Node.js code for Windows, Linux and Mac under [src/engine/native/node](src/engine/native/node). The universal part uses functionality in the native part via an abstraction layer.

**Integration points & external dependencies:**

- The MS talks to Postgres (local docker compose in dev) and expects environment variables from [src/management-system-v2/.env].
- The MS uses `@proceed/bpmn-helper` and `bpmn-js` for BPMN editing and rendering.
- The engine exposes runtime APIs used by the MS and E2E tests located under [src/engine/e2e_tests](src/engine/e2e_tests).

**Files to inspect for context when changing behavior:**

- Repo-level scripts and workflows: [package.json](package.json)
- MS-specific: [src/management-system-v2/package.json](src/management-system-v2/package.json), [src/management-system-v2/docker-compose-dev.yml](src/management-system-v2/docker-compose-dev.yml), [src/management-system-v2/scripts/db-helper.mts](src/management-system-v2/scripts/db-helper.mts)
- Engine: [src/engine/native](src/engine/native) and [src/engine/universal](src/engine/universal)

**When you change DB schema or Prisma models:**

- Run `yarn dev-ms-db-new-structure --name "<desc>"` to create a new DB instance and run migrations locally.
- Run `yarn dev-ms-db-generate` to regenerate Prisma client if models changed.

If anything here is ambiguous or you want more details (run commands, CI hooks, or where to find specific APIs), tell me what area to expand and I will iterate.

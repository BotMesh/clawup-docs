# Current Architecture

This page describes the current ClawUp architecture as implemented in this repository (March 2026).

## 1. System View

ClawUp is composed of five core layers:

1. `frontend` (Next.js): web console, auth entry, bot operation UI.
2. `backend` (Rust + Axum): API gateway, bot/job/audit state orchestration, billing logic.
3. `runtime-provisioner` (Go): runtime lifecycle manager for OpenClaw containers/pods.
4. `runtime` (OpenClaw): per-bot execution runtime and gateway endpoint.
5. Infrastructure: MySQL, Redis, optional OSS backup, optional ACK/Kubernetes.

High-level flow:

```text
Browser
  -> Frontend (8082)
  -> Backend API (8080)
       -> MySQL / Redis
       -> RuntimeProvisioner (8090)
            -> Docker container (local) or ACK Pod (ack backend)
                 -> OpenClaw Gateway (per bot)
```

## 2. Runtime Modes

ClawUp currently supports these isolation families:

1. `standard` — all current plans (Free, Basic, Pro):
   - Routed through `runtime-provisioner`.
   - Backed by Docker or ACK depending on `PROVISIONER_BACKEND`.
2. `confidential_container` — Enterprise plan (coming soon):
   - TEE-based hardware isolation.

Reference implementation:
- `backend/src/integrations/runtime.rs`
- `runtime-provisioner/main.go`

## 3. Core Components

## 3.1 Frontend (`frontend/`)

Responsibilities:

1. User sign-in and session bootstrap.
2. Bot CRUD/start/stop/sync UI.
3. Chat console (through backend API).
4. Tools/Marketplace, Quests, Billing pages.

Notes:

1. Frontend talks to backend API, not directly to runtime-provisioner.
2. Browser-side base URL is controlled by `NEXT_PUBLIC_API_BASE_URL`.

## 3.2 Backend (`backend/`)

Responsibilities:

1. Unified API entry (`/api/v1/...`).
2. In-memory app store plus periodic snapshot persistence.
3. Runtime orchestration through `RuntimeProvisioner`.
4. Billing, audit logs, jobs, auth, tool binding.

Key behavior:

1. Snapshot persistence loop writes store state every 5s.
2. Reconcile loops sync runtime state and cleanup.
3. For running bots, chat/channel endpoints proxy or query runtime gateway.

Entry point:
- `backend/src/main.rs`

## 3.3 Runtime Provisioner (`runtime-provisioner/`)

Responsibilities:

1. `provision/start/stop/delete/status` for runtimes.
2. Apply OpenClaw config and runtime defaults.
3. Handle pairing approval for supported backends.
4. Optional OSS backup/import lifecycle.

Backends:

1. `docker` backend: local container runtime.
2. `ack` backend: Kubernetes/ACK pods.

## 3.4 OpenClaw Runtime (per bot)

Responsibilities:

1. Executes agent logic and channel integrations.
2. Exposes gateway endpoints for chat/completions/responses.
3. Maintains runtime-local OpenClaw state (`/home/node/.openclaw` by default).

Tokens and connectivity:

1. Backend stores and reuses `gateway_url` and `gateway_token`.
2. Runtime-provisioner injects `OPENCLAW_GATEWAY_TOKEN` at runtime startup.

## 3.5 Claw Connect (`claw-connect/`)

Responsibilities:

1. Agent-to-agent communication and JWT-authenticated bridging.
2. Uses backend + MySQL + Redis.
3. Supports Nebula Telegram sync related flows.

## 4. Data and State

Primary state stores:

1. MySQL:
   - business entities (users, bots, billing, etc.)
   - `bot_local_configs`, `bot_runtime_credentials`, `app_store_snapshots`
2. Redis:
   - service-side fast state/cache (used by claw-connect and related flows)
3. OSS (optional):
   - runtime backup/import objects

## 4.1 Snapshot and Credential Encryption

Current implementation details (important):

1. `app_store_snapshots` and `bot_runtime_credentials` payloads are encrypted via ChaCha20-Poly1305 envelope.
2. Encryption key is derived from `APP_STORE_SNAPSHOT_KEY`, fallback to `MYSQL_PASSWORD`.
3. `BOT_LOCAL_CONFIG_KEY_ID` is a key label/identifier field.
4. `bot_local_configs.encrypted_config` currently stores JSON payload directly (legacy compatibility path), while key-id and nonce fields are still written.

Reference:
- `backend/src/integrations/local_config.rs`

## 5. Key Flows

## 5.1 Bot Create Flow

1. Frontend calls `POST /api/v1/bots`.
2. Backend validates plan/runtime constraints and writes bot metadata.
3. Backend asks runtime-provisioner to provision runtime.
4. Provision result returns runtime id + gateway metadata.
5. Backend updates bot state and persists local config snapshot.

## 5.2 Chat Flow

1. Frontend sends chat request to backend (`/api/v1/bots/{id}/chat`).
2. Backend resolves runtime gateway URL/token.
3. Backend forwards request to runtime gateway (`/v1/chat/completions` or `/v1/responses` path family).
4. Backend normalizes response for frontend.

## 5.3 Channel/Pairing Flow

1. Frontend queries `/api/v1/bots/{id}/channels`.
2. Backend tries runtime gateway channel state first; if unavailable, falls back to stored defaults.
3. Pairing approval is sent through backend to runtime-provisioner.
4. Some isolation backends do not support pairing approval.

## 5.4 Billing and Audit Flow

1. User actions and system events append audit logs.
2. Recurring billing loop runs periodically (`BILLING_TICK_SECONDS`).
3. Billing endpoints expose merged/derived billing views.

## 6. Local Deployment Topology (Default Docker Compose)

Services:

1. `frontend` (8082)
2. `backend` (8080)
3. `runtime-provisioner` (8090)
4. `mysql` (3306)
5. `redis` (6379)
6. `claw-connect` (8081)

File:
- `docker-compose.yml`

## 7. Configuration Surface (Most Impactful)

1. Runtime routing:
   - `PROVISIONER_BACKEND`, `PROVISIONER_DRIVER`, `ALIYUN_MOCK`
2. Runtime provisioning:
   - `RUNTIME_PROVISIONER_ENDPOINT`, `PROVISIONER_RUNTIME_IMAGE`, ACK/OSS vars
3. Snapshot/credential encryption:
   - `APP_STORE_SNAPSHOT_KEY` (recommended explicit set)
4. Auth and external integrations:
   - Google/GitHub OAuth, Stripe, Telegram coupon, Claw Connect JWT

## 8. Operational Checks

Useful checks in local/dev:

1. `GET http://localhost:8090/healthz` (provisioner health)
2. `GET http://localhost:8080/api/v1/auth/me` (backend auth state)
3. `docker compose ps` / `docker compose logs -f backend runtime-provisioner`

## 9. Known Boundaries

1. Runtime channel metadata availability depends on OpenClaw runtime image capabilities and exposed methods.
2. Pairing approval support differs by isolation backend.
3. Backup/restore behavior differs between local Docker and ACK paths.

If architecture changes significantly (new services, storage model, or security model), update this page first.

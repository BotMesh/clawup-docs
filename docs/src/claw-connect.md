# Claw Connect — Cross-Runtime Agent-to-Agent Communication

## 1. Background

Each user's claw runs in an isolated Docker/ACK container. OpenClaw natively supports multi-agent routing within a single runtime, but claws in different containers cannot communicate directly.

**Claw Connect** is an MCP App on the platform that enables cross-runtime agent-to-agent communication. Users install it from the Marketplace like any other app. Once installed, their claw gains the ability to discover and communicate with other claws through a **Naming Service**.

### 1.1 Phased Goals

| Phase | Scope | Use Cases |
|-------|-------|-----------|
| **Phase 1** | Same-user multi-claw communication | Specialized claw collaboration (translation, search, coding) |
| **Phase 1.5** | Hybrid P2P upgrade | Claw Connect handles control plane only; data plane goes direct |
| **Phase 2** | Cross-user multi-claw communication | Social experiments (dating simulation, multi-role interaction), external A2A interop |

### 1.2 Design Principles

1. **App-based opt-in** — Users add Claw Connect from the Marketplace; no forced injection
2. **Naming Service for discovery** — Agents register human-readable names; others discover by name
3. **Follow the A2A protocol** — Use [A2A v0.3.0](https://a2a-protocol.org) (JSON-RPC 2.0 over HTTP)
4. **Align with OpenClaw semantics** — `remote_send` ↔ `sessions_send`, `remote_spawn` ↔ `sessions_spawn`
5. **Progressive P2P** — Start with centralized relay, evolve to hybrid P2P seamlessly

---

## 2. Existing Solutions

### 2.1 OpenClaw Native Agent-to-Agent

OpenClaw provides intra-runtime agent communication via `tools.agentToAgent`:

| Mechanism | Description |
|-----------|-------------|
| `sessions_send` | Synchronous ping-pong conversation, capped by `maxPingPongTurns` (0–5) |
| `sessions_spawn` | Async task delegation, runs in an isolated sub-session |

Disabled by default; requires `tools.agentToAgent.enabled: true`.

**Limitations**: Same OpenClaw instance only. Cannot cross container or network boundaries.

### 2.2 A2A Protocol

[A2A (Agent-to-Agent Protocol)](https://a2a-protocol.org) is an open standard under the Linux Foundation for cross-instance agent communication (21k+ GitHub stars).

| Concept | Description |
|---------|-------------|
| **Agent Card** | `/.well-known/agent-card.json` — capabilities, endpoints, auth |
| **JSON-RPC 2.0** | Standard message format |
| **Task** | Communication unit with message parts, status, and artifacts |
| **Skill** | Capabilities declared in the Agent Card for discovery |

Key methods: `tasks/send` (sync), `tasks/sendSubscribe` (streaming), `tasks/get` (poll), `tasks/cancel`.

MCP = Agent ↔ Tool (internal). A2A = Agent ↔ Agent (external). They are complementary.

### 2.3 Community Reference: openclaw-a2a-gateway

[win4r/openclaw-a2a-gateway](https://github.com/win4r/openclaw-a2a-gateway) is a community OpenClaw A2A plugin. Each instance installs the plugin, exposes A2A JSON-RPC on port 18800, and manually configures peers.

**Limitations for platform use**: manual setup per instance, requires direct connectivity (Tailscale/LAN), no centralized discovery, peer config grows O(n²).

### 2.4 Claw Connect vs openclaw-a2a-gateway

| Aspect | openclaw-a2a-gateway | Claw Connect |
|--------|---------------------|--------------|
| Deployment | Plugin per instance | Platform MCP App, install from Marketplace |
| Discovery | Manual peer IP + Agent Card URL | **Naming Service** — register name, discover by name |
| Configuration | Manual peer + token exchange | Install app → auto-configured |
| Network | Direct instance-to-instance | Platform internal network via bridge |
| Agent Card | Each instance publishes | Bridge publishes on behalf via Naming Service |
| Authentication | Manual bearer token exchange | Platform JWT (auto-issued) |
| A2A compatibility | Full v0.3.0 | Full v0.3.0 |

---

## 3. Architecture

### 3.1 App Model

Claw Connect is registered in the **App Registry** as an MCP App:

```
App Registry Entry:
  id:          "claw-connect"
  name:        "Claw Connect"
  type:        MCP
  transport:   http
  endpoint:    http://claw-connect.internal:8080/mcp
  auth_scheme: api_key    (uses the platform JWT as api_key)
  status:      active
  visibility:  public
```

User installation flow:

```
1. User opens Marketplace
2. Finds "Claw Connect" app
3. Clicks "Add to Claw" → selects target claw
4. Optionally sets an agent name (e.g. "alice-researcher")
5. Backend calls mcporter/bind on the claw's runtime
6. Claw Connect registers the claw in the Naming Service
7. Agent gains remote_send / remote_spawn / list_peers / get_task_result tools
```

### 3.2 Naming Service

The Naming Service is a registry where claws publish discoverable names. It replaces manual peer configuration.

```
                    Naming Service (inside Claw Connect)
                   ┌────────────────────────────────────┐
                   │                                    │
  register         │   agent_name → { bot_id,           │         lookup
  "alice" ────────→│                  user_id,           │←─────── "alice"
                   │                  runtime_addr,      │
                   │                  status,             │
                   │                  skills,             │
                   │                  visibility }        │
                   │                                    │
                   └────────────────────────────────────┘
```

**Name registration** happens when a user installs Claw Connect on a claw:

```json
POST /naming/register
Authorization: Bearer <platform_jwt>

{
  "agent_name": "alice-researcher",
  "bot_id": "uuid-xxx",
  "description": "Professional search agent",
  "visibility": "user",
  "skills": [{ "id": "chat", "name": "chat" }]
}
```

**Visibility levels**:

| Level | Who can discover | Use case |
|-------|-----------------|----------|
| `user` | Same user's other claws only | Phase 1: private multi-claw collaboration |
| `public` | Any user on the platform | Phase 2: social experiments, shared agents |
| `unlisted` | Only by exact name | Phase 2: share with specific people |

**Name resolution**:

```json
GET /naming/resolve?name=alice-researcher
Authorization: Bearer <platform_jwt>

→ {
    "agent_name": "alice-researcher",
    "bot_id": "uuid-xxx",
    "user_id": "uuid-yyy",
    "address": "10.0.3.45",
    "port": 18789,
    "status": "online",
    "skills": [{ "id": "chat", "name": "chat" }]
  }
```

**Name listing** (discover available agents):

```json
GET /naming/list
Authorization: Bearer <platform_jwt>

→ [
    { "agent_name": "my-researcher", "status": "online", "visibility": "user" },
    { "agent_name": "alice", "status": "online", "visibility": "public" },
    ...
  ]
```

### 3.3 Overall Architecture

```
                         Claw Connect (MCP App)
                    ┌──────────────────────────────────┐
                    │                                  │
                    │  MCP Server (/mcp)                │
                    │    tools: remote_send, etc.       │
                    │                                  │
                    │  Naming Service (/naming)         │
                    │    register / resolve / list      │
                    │                                  │
                    │  A2A Server (/a2a/jsonrpc)        │
                    │    Agent Card + JSON-RPC          │
                    │                                  │
                    │  Auth: Platform JWT               │
                    │  Routing: name → runtime addr     │
                    └──────────┬───────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         Runtime A        Runtime B        Runtime C
         (User 1)         (User 1)         (User 2)
         name: "coord"    name: "search"   name: "alice"
         visibility: user  visibility: user  visibility: public
```

### 3.4 Data Path Evolution

| Phase | Control Plane | Data Plane | Description |
|-------|---------------|------------|-------------|
| **Phase 1** | Claw Connect | Claw Connect | Full relay, fastest to ship |
| **Phase 1.5** | Claw Connect | Runtime direct | Claw Connect only handles resolve + issues session tokens |
| **Phase 2** | Claw Connect | Runtime direct / external A2A | Cross-user + external interop |

### 3.5 Phase 1: Centralized Relay

```
Runtime A → MCP tool (remote_send "search") → Claw Connect
  → Naming Service resolves "search" → Runtime B address
  → HTTP POST to Runtime B /v1/chat/completions
  → Return reply to Runtime A
```

### 3.6 Phase 1.5: Hybrid P2P

Claw Connect downgrades to **control plane only**. Data flows directly between runtimes:

```
               Claw Connect (control plane)
              ┌───────────────────────┐
   ② Resolve  │  Verify JWT            │
  ┌──────────→│  Naming Service lookup │
  │           │  Issue session token   │
  │  ③ Return └───────────────────────┘
  │  addr+token
  │      │
  │      ▼
Runtime A ═════④ P2P direct═════→ Runtime B
             session token
             data bypasses Claw Connect
```

**Resolve endpoint**:

```
POST http://claw-connect.internal:8080/resolve
Authorization: Bearer <jwt>

{ "target": "alice-researcher" }

→ {
    "address": "10.0.3.45",
    "port": 18789,
    "session_token": "eyJ...",
    "expires_in": 300
  }
```

**Session Token** (5-minute TTL, scoped to specific target):

```json
{
  "sub": "<caller_bot_id>",
  "aud": "<target_bot_id>",
  "user_id": "<caller_user_id>",
  "exp": 1741500300,
  "scope": "a2a:send"
}
```

---

## 4. MCP Tools

- **Name**: `claw-connect`
- **Transport**: Streamable HTTP
- **Endpoint**: `http://claw-connect.internal:8080/mcp`

### 4.1 Tool Overview

| Tool | OpenClaw Equivalent | A2A Equivalent | Description |
|------|--------------------|--------------------|-------------|
| `remote_send` | `sessions_send` | `tasks/send` (blocking) | Synchronous remote agent call |
| `remote_spawn` | `sessions_spawn` | `tasks/send` (non-blocking) | Async task delegation |
| `get_task_result` | — | `tasks/get` | Query async task result |
| `list_peers` | — | Agent Card discovery | List discoverable agents |
| `register_name` | — | — | Register/update agent name in Naming Service |

### 4.2 remote_send

Send a message to a remote agent **by name** and wait for reply.

```json
{
  "name": "remote_send",
  "description": "Send a message to a named remote agent and wait for reply",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": { "type": "string", "description": "Agent name (e.g. 'alice-researcher')" },
      "message": { "type": "string" },
      "max_turns": { "type": "integer", "default": 1, "maximum": 5 }
    },
    "required": ["target", "message"]
  }
}
```

Execution flow:

1. Verify JWT → extract `caller_bot_id`, `caller_user_id`
2. Naming Service resolves `target` name → runtime address + owner
3. Authorization check (Phase 1: same `user_id`; Phase 2: check visibility + permissions)
4. Forward to target:
   - Phase 1: Relay POST to `/v1/chat/completions`
   - Phase 1.5: Resolve → caller connects directly
5. If `max_turns > 1`, execute ping-pong loop
6. Return final reply

### 4.3 remote_spawn

Spawn an async task on a named remote agent.

```json
{
  "name": "remote_spawn",
  "description": "Spawn an async task on a named remote agent",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": { "type": "string", "description": "Agent name" },
      "task": { "type": "string" }
    },
    "required": ["target", "task"]
  }
}
```

Returns `{ task_id }` immediately. Use `get_task_result` to poll.

### 4.4 get_task_result

```json
{
  "name": "get_task_result",
  "inputSchema": {
    "type": "object",
    "properties": {
      "task_id": { "type": "string" }
    },
    "required": ["task_id"]
  }
}
```

Returns: `{ "status": "pending|completed|failed", "result": "..." }`

### 4.5 list_peers

List agents discoverable by the caller.

```json
{
  "name": "list_peers",
  "inputSchema": { "type": "object", "properties": {} }
}
```

Returns all agents visible to the caller (same-user agents + public agents):

```json
[
  {
    "name": "my-researcher",
    "description": "Search agent",
    "status": "online",
    "visibility": "user",
    "skills": [{ "id": "chat", "name": "chat" }]
  },
  {
    "name": "alice",
    "description": "Extroverted persona",
    "status": "online",
    "visibility": "public",
    "skills": [{ "id": "chat", "name": "chat" }]
  }
]
```

### 4.6 register_name

Register or update the agent's name in the Naming Service. Called automatically on app install, but agents can also update their registration dynamically.

```json
{
  "name": "register_name",
  "description": "Register or update this agent's name in the Naming Service",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agent_name": { "type": "string", "description": "Human-readable agent name" },
      "description": { "type": "string" },
      "visibility": { "type": "string", "enum": ["user", "public", "unlisted"] },
      "skills": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" }
          }
        }
      }
    },
    "required": ["agent_name"]
  }
}
```

---

## 5. A2A Protocol Alignment

### 5.1 Agent Card

Claw Connect publishes Agent Cards for registered agents via the Naming Service:

```
GET http://claw-connect.internal:8080/.well-known/agent-card.json?name=alice-researcher
```

```json
{
  "name": "alice-researcher",
  "description": "Professional search and information gathering agent",
  "url": "http://claw-connect.internal:8080/a2a/jsonrpc",
  "provider": { "organization": "platform" },
  "version": "1.0.0",
  "capabilities": { "streaming": false, "pushNotifications": false },
  "authentication": { "schemes": ["bearer"] },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "skills": [
    { "id": "chat", "name": "chat", "description": "General conversation" }
  ]
}
```

### 5.2 JSON-RPC Endpoint

Standard A2A JSON-RPC endpoint for external agents:

```json
POST /a2a/jsonrpc
Authorization: Bearer <token>

{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tasks/send",
  "params": {
    "id": "task-uuid",
    "message": {
      "role": "user",
      "parts": [{ "kind": "text", "text": "Hello" }]
    },
    "metadata": { "agentId": "alice-researcher" }
  }
}
```

The `agentId` in metadata uses the **agent name** from the Naming Service, not a UUID.

---

## 6. Authentication & Authorization

### 6.1 Identity: Platform JWT

When a user installs Claw Connect on a claw, the backend passes the platform JWT as the app's `api_key` during mcporter bind. The JWT contains:

```json
{
  "sub": "<bot_id>",
  "user_id": "<user_id>",
  "iat": 1741500000,
  "exp": 1741586400
}
```

- Issued by: backend (platform private key)
- Verified by: Claw Connect service
- Lifecycle: aligned with runtime; re-issued on restart

### 6.2 Authorization Policy

**Phase 1 (same user)**:

```
caller.user_id == target.user_id → ALLOW
else → check visibility
```

**Phase 2 (cross-user)**:

Visibility-based authorization:

| Target visibility | Rule |
|-------------------|------|
| `user` | Same user only |
| `public` | Any platform user |
| `unlisted` | Any user who knows the exact name |

Optional fine-grained permissions:

```sql
CREATE TABLE agent_link_permissions (
    id UUID PRIMARY KEY,
    agent_name TEXT NOT NULL,
    owner_user_id UUID NOT NULL,
    allow_user_id UUID,           -- NULL = public
    allow_bot_id UUID,            -- NULL = all bots of user
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.3 Session Token (Phase 1.5 P2P)

Short-lived credential for direct runtime-to-runtime communication:

```json
{
  "sub": "<caller_bot_id>",
  "aud": "<target_bot_id>",
  "user_id": "<caller_user_id>",
  "exp": 1741500300,
  "scope": "a2a:send"
}
```

- 5-minute TTL
- Target runtime verifies locally (public key injected at startup)

### 6.4 External A2A Authentication

External `/a2a/jsonrpc` uses bearer token auth (consistent with openclaw-a2a-gateway):

```json
{
  "external_peers": [
    {
      "name": "external-agent",
      "agent_card_url": "https://example.com/.well-known/agent-card.json",
      "auth": { "type": "bearer", "token": "<token>" }
    }
  ]
}
```

---

## 7. Naming Service

### 7.1 Design

The Naming Service is a lightweight registry inside Claw Connect. It maps human-readable names to runtime addresses.

```
┌─────────────────────────────────────────────────┐
│  Naming Service                                 │
│                                                 │
│  "coordinator"  → { bot: A, user: 1, online  } │
│  "researcher"   → { bot: B, user: 1, online  } │
│  "alice"        → { bot: C, user: 2, public  } │
│  "bob"          → { bot: D, user: 2, public  } │
│                                                 │
│  Storage: Redis (production) / in-memory (MVP)  │
└─────────────────────────────────────────────────┘
```

### 7.2 Registration Record

```json
{
  "agent_name": "alice-researcher",
  "bot_id": "uuid-xxx",
  "user_id": "uuid-yyy",
  "address": "10.0.3.45",
  "port": 18789,
  "description": "Professional search agent",
  "visibility": "public",
  "skills": [{ "id": "chat", "name": "chat" }],
  "status": "online",
  "registered_at": "2026-03-09T12:00:00Z",
  "last_heartbeat": "2026-03-09T12:05:00Z"
}
```

### 7.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/naming/register` | POST | Register or update an agent name |
| `/naming/unregister` | POST | Remove an agent name |
| `/naming/resolve?name=<name>` | GET | Resolve name to runtime address |
| `/naming/list` | GET | List visible agents for the caller |
| `/naming/heartbeat` | POST | Update online status |

### 7.4 Name Rules

- Names are globally unique across the platform
- Alphanumeric + hyphens, 3–32 characters
- Case-insensitive
- Reserved names: `system`, `platform`, `admin`, `external`
- Users can own multiple names (one per claw with Claw Connect installed)

### 7.5 Lifecycle

```
User installs Claw Connect on Claw A
  → Backend calls mcporter/bind (passes JWT as api_key)
  → Claw Connect registers agent_name in Naming Service
  → Status: "online"

Claw A heartbeats periodically (every 60s)
  → Status stays "online"

Claw A stops or heartbeat times out (5 min)
  → Status: "offline"
  → Name reservation kept (not deleted)

User removes Claw Connect from Claw A
  → Backend calls mcporter/unbind
  → Claw Connect unregisters name
  → Name becomes available
```

---

## 8. Networking

| Deployment | Approach |
|------------|----------|
| Docker | Create `claw-connect-net` bridge network; all runtimes + Claw Connect join |
| ACK | Claw Connect deployed as ClusterIP Service; runtime pods connect directly |

For Phase 1.5 P2P, runtimes must be on the same network (same bridge network or cluster).

---

## 9. Usage Examples

### 9.1 Same-User Multi-Claw Collaboration (Phase 1)

A user has 3 claws with Claw Connect installed:
- `coordinator` — task dispatcher
- `researcher` — search specialist
- `writer` — content writer

Coordinator's system prompt:

```
You are a task coordinator. When you receive a user request:
1. Use list_peers to see available agents
2. Use remote_send with target "researcher" to send search tasks
3. Use remote_send with target "writer" to send writing tasks with the search results
4. Aggregate results and reply to the user
```

### 9.2 Social Experiment — Dating Simulation (Phase 2)

Experimenter (User A) creates persona claws with `visibility: public`:
- Claw "alice" (personality: extroverted, public)
- Claw "bob" (personality: introverted, public)

Participants install Claw Connect and create their own claws:
- User B: Claw "observer" — talks to alice and bob, observes interaction patterns
- User C: Claw "matchmaker" — tries to set up a date between alice and bob

All cross-user calls go through Claw Connect. The Naming Service handles discovery:

```
observer → list_peers → sees "alice" (public), "bob" (public)
observer → remote_send(target="alice", message="Hi Alice, what do you think about Bob?")
observer → remote_send(target="bob", message="Hi Bob, what do you think about Alice?")
```

### 9.3 External A2A Agent Interop (Phase 2)

```
User Claw → remote_send(target="external:research-agent", message="...")
          → Claw Connect looks up external peer Agent Card
          → POST https://research.example.com/a2a/jsonrpc (A2A tasks/send)
          → Return result
```

---

## 10. Implementation Plan

### Phase 1: Same-User Communication (MVP)

| Component | Work | Complexity |
|-----------|------|------------|
| **claw-connect** | Rust crate: MCP server + Naming Service + HTTP relay + in-memory store | Medium |
| **backend** | Register Claw Connect in App Registry; pass JWT as api_key on bind; heartbeat relay | Low |
| **frontend** | Agent name input field on "Add to Claw" dialog for Claw Connect | Low |
| **networking** | Docker: shared network; ACK: ClusterIP Service | Low |

### Phase 1.5: Hybrid P2P Upgrade

| Component | Work | Complexity |
|-----------|------|------------|
| **claw-connect** | Add `POST /resolve` endpoint; issue session tokens | Low |
| **MCP tool** | Switch `remote_send` internals to resolve + direct connect | Low |
| **provisioner** | Inject `AGENT_LINK_VERIFY_KEY` (platform public key) | Low |
| **runtime** | Add session token verification middleware to `/v1/chat/completions` | Low |

### Phase 2: Cross-User + A2A

| Component | Work | Complexity |
|-----------|------|------------|
| **claw-connect** | Public/unlisted visibility; A2A JSON-RPC endpoint; Agent Card proxy; external peers | Medium |
| **backend** | `agent_link_permissions` table + API; external peer registration | Medium |
| **frontend** | Visibility selector on install; public agent directory page; Agent Card editor | Low |

---

## 11. References

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A GitHub](https://github.com/a2aproject/A2A) — Official SDKs (Go, Python, JS, Java, .NET)
- [openclaw-a2a-gateway](https://github.com/win4r/openclaw-a2a-gateway) — Community OpenClaw A2A plugin
- [OpenClaw Issue #6842](https://github.com/openclaw/openclaw/issues/6842) — Native A2A support request
- [OpenClaw Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent) — Internal agent-to-agent mechanism

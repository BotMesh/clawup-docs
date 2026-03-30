# Free Token Plan — Multi-Provider Managed Keys

## Overview

New users get a free LLM credit via an auto-provisioned managed API key. No API key input required — users can create a Claw and start chatting immediately.

The system supports multiple API proxy providers through a **ProviderRegistry** abstraction:

| Provider | Key Model | Billing Model | Status |
|----------|-----------|---------------|--------|
| **SkyAPI** | Per-user sub-key with quota limit | Pay-per-token (1 USD = 1M quota) | **Default** |
| **OpenRouter** | Per-user key with USD spending limit | Pay-per-token | Supported |

---

## Flow

```
User signs up / logs in
  → spawn_provision_free_key (async background task)
  → MySQL advisory lock: GET_LOCK('provision_key_{user_id}', 5)
  → Double-check: MySQL has key? → yes → return
  → Provider-side check: search_key(name)? → yes → recover to MySQL, return
  → Selected provider creates per-user sub-key
    SkyAPI: POST /api/token/ { name, remain_quota }
    OpenRouter: POST /api/v1/keys { name, limit }
  → Backend stores ProvisionedKey in MySQL (provider_id + key_ref + key_encrypted)
  → User creates Claw → api_key empty → backend uses provisioned key
  → Provisioner injects API key into bot runtime via openclaw.json
  → Provider enforces spending limit natively
  → Key exhausted → Provider rejects (402/429) → frontend shows "top up"
  → 7-day trial expired → billing tick auto-stops bot or upgrades to Basic
```

---

## Duplicate Provision Prevention

### Problem

`maybe_provision_free_key` can be called concurrently:
1. **Login** — `spawn_provision_free_key` fires async in background
2. **Create bot** — if no key found, waits for async provision (polls MySQL)

Without protection, two concurrent calls both see "no key" and both call the provider API, resulting in double-charged quota.

### Solution: Three-Layer Protection

| Layer | SkyAPI | OpenRouter | Purpose |
|-------|--------|-----------|---------|
| **1. MySQL advisory lock** | `GET_LOCK('provision_key_{uid}', 5)` | Same | Serialize concurrent calls per user |
| **2. MySQL double-check** | `get_provisioned_key()` after lock | Same | Catch completed async writes |
| **3. Provider-side search** | `search_token(name)` — O(1) native API | **Not available** — see below | Catch MySQL/provider inconsistency |

### Why OpenRouter lacks provider-side search

OpenRouter's Management API offers only `GET /api/v1/keys` (list all keys) with no name filter or pagination. At 10M users this is an O(N) full scan — not viable.

**Decision**: OpenRouter relies solely on layers 1+2 (advisory lock + MySQL check). The advisory lock serializes calls, so the race window is eliminated before any provider API call. If MySQL and OpenRouter somehow diverge (e.g. MySQL write fails after provider create), the next `maybe_provision_free_key` call will create a second key on OpenRouter (allowed — OpenRouter permits duplicate names). This is acceptable because:
- OpenRouter is not the default provider
- Advisory lock makes this scenario extremely unlikely
- The extra key has a spending limit and expires unused

**SkyAPI** has native `GET /api/token/search?keyword={name}` (O(1)), so we always verify provider-side consistency before creating.

### Create Bot Flow

When a user creates a free-plan bot with empty `api_key`:
1. Check MySQL for provisioned key → found → use it
2. Not found → **poll MySQL** (500ms × 6 = 3s max) waiting for async login provision
3. Still not found → bot creation fails with `BOT_400`

`create_bot` does NOT call `maybe_provision_free_key` directly — this avoids the double-provision race entirely. The login-time async spawn is the single source of provision.

---

## SkyAPI Model Routing

SkyAPI is not a built-in OpenClaw provider. It is registered as a **custom provider** under the `openai` namespace in `openclaw.json`, so model IDs display as `openai/gpt-5.4` (not `skyapi/gpt-5.4`):

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "openai": {
        "baseUrl": "https://api.skyapi.org/v1",
        "apiKey": "<provisioned-key>",
        "api": "openai-completions",
        "models": [
          { "id": "gpt-5.4", "name": "gpt-5.4", "api": "openai-completions" },
          { "id": "claude-opus-4-6", "name": "claude-opus-4-6", "api": "anthropic-messages" }
        ]
      }
    }
  }
}
```

This means:
- `agents.defaults.model.primary` = `"openai/gpt-5.4"`
- Bot reports "openai/gpt-5.4" when asked what model it uses
- Actual requests route to `https://api.skyapi.org/v1`
- `normalize_provider("skyapi")` in `openclaw_config.rs` returns `"skyapi"` (not `"openrouter"`)
- `build_provider_model_id` maps `skyapi` → `openai` for the display model ID

---

## Multi-Provider Architecture

### ProvisionedKey (stored per-user in MySQL)

```rust
pub struct ProvisionedKey {
    pub user_id: Uuid,
    pub provider_id: String,     // "skyapi" | "openrouter"
    pub key_encrypted: String,   // API key value
    pub key_ref: String,         // provider-side reference (SkyAPI=token id, OpenRouter=key hash)
    pub limit_usd: f64,          // spending limit in USD
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### ProviderRegistry

```rust
pub enum ManagedProvider {
    OpenRouter(OpenRouterProvider),  // Per-user key via Management API
    SkyApi(SkyApiProvider),          // Per-user sub-key via Token API
}

pub enum ProviderStrategy {
    Fixed { provider_id: String },                // All users → same provider
    Weighted { weights: Vec<(String, u32)> },     // A/B test / load balance
}
```

### Provider API Comparison

| Operation | SkyAPI | OpenRouter |
|-----------|--------|-----------|
| Create key | `POST /api/token/` | `POST /api/v1/keys` |
| Search by name | `GET /api/token/search?keyword=` ✅ | `GET /api/v1/keys` (list all, no filter) ❌ |
| Query balance | `GET /api/usage/token/` (Bearer) | `GET /api/v1/keys/{hash}` |
| Top up | `PUT /api/token/` (**full replace**) | `PATCH /api/v1/keys/{hash}` (incremental) |
| Revoke | `DELETE /api/token/{id}` | `DELETE /api/v1/keys/{hash}` |
| Key format | 48 char, use as `sk-{key}` | `sk-or-v1-xxx` |
| Reference | Integer `id` | String `hash` |

---

## SkyAPI Key Lifecycle

| Event | Action |
|-------|--------|
| User signs up | `POST /api/token/` with `remain_quota = FREE_CREDIT_USD * 1,000,000` |
| User creates Claw | Inject key + configure `models.providers.openai` pointing to SkyAPI |
| User checks balance | `GET /api/usage/token/` → show `total_available` |
| Credits exhausted | Provider rejects (402/429). Frontend shows "top up" prompt |
| 7 days expired | Billing tick: upgrade to Basic (if balance) or auto-stop |
| User tops up | `PUT /api/token/` to increase `remain_quota` (**must send all fields**) |
| User deletes account | `DELETE /api/token/{id}` to revoke |

---

## Configuration

```env
# Provider selection strategy
MANAGED_PROVIDER_STRATEGY=fixed          # fixed | weighted
MANAGED_PROVIDER_DEFAULT=skyapi          # default provider for new users
# MANAGED_PROVIDER_WEIGHTS=skyapi:70,openrouter:30

# SkyAPI (default — per-user sub-key management)
SKYAPI_ACCESS_TOKEN=                     # Management access token from dashboard
SKYAPI_BASE_URL=https://api.skyapi.org

# OpenRouter (alternative — per-user key management)
# OPENROUTER_MANAGEMENT_API_KEY=sk-or-mgmt-...

# Common
FREE_CREDIT_USD=1.0                      # Free credit in USD (SkyAPI quota = USD * 1M)
FREE_TIER_DEFAULT_MODEL=gemini-2.5-flash  # Default model for free-tier
FREE_TRIAL_MINUTES=10080                 # 7 days
```

No per-model whitelist — spending is controlled solely by the quota/limit on the key. Users can access any model the provider supports, within their credit balance.

---

## SkyAPI vs OpenRouter Price Comparison

| Model | SkyAPI | OpenRouter | Discount |
|-------|--------|-----------|------|
| Claude Opus 4.6 | $0.50/$2.50 | $15/$75 | **3%** |
| Claude Sonnet 4.6 | $0.30/$1.50 | $3/$15 | **10%** |
| GPT-5 | $0.10/$0.80 | $2/$8 | **5%** |
| Gemini 2.5 Flash | $0.07/$0.29 | $0.15/$0.60 | 47% |
| Gemini 3 Pro | $0.50/$1.50 | N/A | — |

> Prices: Input/Output per 1M tokens.
> SkyAPI quota: 1 USD = 1,000,000 units.

### $1 Free Credit Comparison

| Model | SkyAPI $1 rounds | OpenRouter $1 rounds | Ratio |
|-------|:---:|:---:|:---:|
| Claude Opus 4.6 | 1,333 | 44 | **30x** |
| GPT-5 | 4,761 | 384 | **12x** |
| Gemini 2.5 Flash | 10,660 | ~10,000 | 1x |

---

## Cost Analysis

| Scenario | Platform Cost |
|----------|--------------|
| 1000 new users × $1 free credit (SkyAPI) | $1,000 max |
| Average user uses ~50% of credit | ~$500 actual cost |
| User converts to paid | $0 ongoing cost |

---

## Database Schema

```sql
-- Migration 007: Add multi-provider support
ALTER TABLE provisioned_keys
  ADD COLUMN provider_id VARCHAR(64) NOT NULL DEFAULT 'openrouter',
  ADD COLUMN key_ref VARCHAR(255) NOT NULL DEFAULT '';

UPDATE provisioned_keys SET key_ref = key_hash WHERE key_ref = '';
```

**Important**: `upsert_provisioned_key` must explicitly write `provider_id` and `key_ref` columns. The MySQL default `'openrouter'` is a migration artifact — do not rely on it.

---

## Adding a New Provider

1. Create `integrations/new_provider_keys.rs` — API client with create/search/query/update/delete
2. Add variant to `ManagedProvider` enum in `managed_provider.rs`
3. Implement `provision_key`, `search_key`, `get_balance`, `is_exhausted`, `top_up`, `revoke_key`
4. Add `normalize_provider` mapping in both `openclaw_config.rs` and `runtime-provisioner/scripts.go`
5. Add `build_custom_provider_models_config` entry if not a built-in OpenClaw provider
6. Add env var initialization in `ProviderRegistry::from_env()`
7. Add env vars to `.env.example` and `docker-compose.yml`

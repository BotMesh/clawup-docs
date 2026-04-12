---
title: Billing
description: Plans, pricing model, and credit management
---

ClawUp billing is designed for transparent, usage-based pricing with full traceability.

## Pricing

All users share the same pricing. New users get a **7-day free trial** with a platform-managed API key and one free-trial Claw. After the trial, top up your balance to continue.

## Pricing Model

ClawUp uses **hourly usage-based billing** for both compute and storage:

### Compute (Running Claws)

- **Rate**: $1.39/hour (~$10 for 30 days continuous)
- Billed only while your Claw is **Running**
- Stop your Claw → compute billing stops immediately
- Restart → compute billing resumes
- **Monthly cap**: $10/Claw (compute + storage combined)

### Storage (All Non-Deleted Claws)

- **Rate**: $0.003 per GB per hour (~$2.16/GB/month)
- Billed for **all Claws that have data on disk** — both Running and Stopped
- Based on actual backup size (workspace, config, conversation data)
- Delete your Claw → storage billing stops, data is removed
- **Monthly cap**: shared with compute ($10 total cap per Claw)

### Tokens (LLM API Usage)

- **Bring your own key**: use your own API key (OpenAI, Anthropic, SkyAPI, etc.) — no token fee from ClawUp
- **Managed tokens**: available for free-tier users via a platform-provisioned API key
- Token costs are passed through from the LLM provider

### Balance Requirements

| Action | Minimum Balance |
|--------|----------------|
| Create a Claw | $10 |
| Start a stopped Claw | $10 |
| Create a Team (SubAgent) | $10 (1 Claw) |
| Create a Team (MultiAgent) | $10 × N members |
| Free trial | $0 (no balance needed) |

## Billing Lifecycle

### Daily Billing Tick

The billing system runs every 24 hours and performs:

```
┌─────────────────────────────────────────────────────┐
│  Phase 0a: Free-Tier Expiry                         │
│  For each Free plan bot past 7-day trial:           │
│    Balance ≥ $10 → Upgrade to Basic (keep running)  │
│    Balance < $10 → Stop bot                         │
├─────────────────────────────────────────────────────┤
│  Phase 0b: Grace Period Cleanup                     │
│  For each Stopped bot with $0 balance:              │
│    Stopped > 14 days → Delete runtime + data        │
├─────────────────────────────────────────────────────┤
│  Phase 1: Calculate Charges                         │
│  Running bots → compute + storage                   │
│    compute: hours × $1.39/hr                        │
│    storage: hours × GB × $0.003/hr                  │
│  Stopped bots → storage only                        │
│    storage: hours × GB × $0.003/hr                  │
│  All charges capped at $10/month per Claw           │
├─────────────────────────────────────────────────────┤
│  Phase 2: Apply Charges                             │
│  Deduct from user balance                           │
│  Update monthly meter state                         │
└─────────────────────────────────────────────────────┘
```

### Balance Warning Emails

The system estimates your daily burn rate (compute + storage across all Claws) and sends emails based on remaining days:

| Remaining Days | Action |
|----------------|--------|
| **> 7 days** | Healthy — no action |
| **3–7 days** | Low-balance reminder email (once per day) |
| **1–3 days** | Critical warning email (once per day) |
| **≤ 0 days** | Auto-stop all running Claws |

Daily burn includes:
- **Running Claws**: `compute_hourly_rate × 24h` + `storage_gb_hourly_rate × GB × 24h` per Claw
- **Stopped Claws with data**: `storage_gb_hourly_rate × GB × 24h` per Claw

### Auto-Stop on Zero Balance

When your balance reaches zero:

1. All running Claws are **stopped automatically**
2. If the runtime provisioner is unreachable, bots are **force-marked Stopped** in the database to prevent runaway billing
3. Storage billing begins based on backup size

### Grace Period (14 Days)

After auto-stop with zero balance:

| Day | Status |
|-----|--------|
| Day 0 | Auto-stop: Claws stopped, storage billing active |
| Day 1–14 | Grace period: data preserved, top up to recover |
| Day 14+ | **Storage deleted permanently** — runtime removed, Claw marked Deleted |

During the grace period:
- Your workspace, backups, and configuration are preserved
- You can top up and restart at any time
- Storage fees continue to accrue (deducted when you top up)

### Auto-Recovery on Top-Up

When you recharge (via any method):

1. Balance increases immediately
2. Free plan Claws with expired trials are **automatically upgraded to Basic**
3. You can restart stopped Claws manually
4. No data is lost during the 14-day grace period

## Free Trial

New users get a 7-day free trial:
- Platform provisions a managed API key
- No balance required, no compute or storage charges during trial
- One Claw per user, platform-selected model

When the trial expires:
- **Balance ≥ $10** → Claw keeps running, starts hourly billing
- **Balance < $10** → Claw is stopped. Top up and restart anytime.

## Team Billing

| Team Mode | Billed Claws | Example (4 roles) |
|-----------|--------------|-------------------|
| **SubAgent** | 1 (leader only) | $10/month |
| **MultiAgent** | N (one per member) | $40/month |

SubAgent mode is recommended — all team roles run inside one Claw as virtual sub-agents.

## Recharge Methods

| Method | Description |
|--------|-------------|
| **Stripe** | Credit card via Stripe checkout |
| **Recharge Card** | Pre-paid code + password |
| **Telegram Coupon** | Claim through the ClawUp Telegram bot |
| **x402 Crypto** | On-chain USDC/USDT (multi-chain) |

All recharge methods trigger automatic Free → Basic upgrade if applicable.

## Billing Events

| Event | Description |
|-------|-------------|
| `usage_charge` | Aggregated usage charge for a billing tick (compute + storage breakdown stored in the note) |
| `subscription_due_soon` | Low-balance reminder email sent |
| `balance_exhausted` | Balance reached zero, auto-stop triggered |
| `bot_auto_stopped_overdue` | Claw force-stopped due to insufficient balance |

## Configuration

All billing parameters are configurable via `plans.json` (no recompile needed):

```json
{
  "billing": {
    "tick_seconds": 86400,
    "cycle_days": 30,
    "warn_days": 7,
    "critical_days": 3,
    "grace_days": 14
  },
  "plans": {
    "basic": {
      "limits": {
        "compute_hourly_cents": 1.39,
        "storage_gb_hourly_cents": 0.003,
        "monthly_cap_cents": 1000,
        "min_balance_cents": 1000
      }
    }
  }
}
```

Override via environment variables: `BILLING_TICK_SECONDS`, `BILLING_CYCLE_DAYS`, `BILLING_WARN_DAYS`, `BILLING_CRITICAL_DAYS`.

## Related Guides

- For team pricing, see [Teams](./teams)

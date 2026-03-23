---
title: Billing
description: Plans, pricing model, and credit management
---

ClawUp billing is designed for transparent, usage-based pricing with full traceability.

## Plans

| Plan | Isolation | Price | Description |
|------|-----------|-------|-------------|
| **Basic** | Standard | $20/month | Managed containers with standard runtime. Per-hour compute billing — pay only when your Claw is running. Bring your own API key or purchase a token package. |
| **Pro** | Standard | Coming Soon | Priority support, advanced features, higher concurrency limits. |
| **Enterprise** | Confidential (TEE) | Coming Soon | Confidential containers with hardware-level memory encryption. No third party can access user data during execution. For organizations with strict compliance requirements. |

## Pricing Model

ClawUp uses a **two-component billing model**:

### 1) Infrastructure Fee (Compute + Storage)

**Compute**: billed per-hour when your Claw is **running**.

- $20/month = ~$0.028/hour (30 days)
- When you stop your Claw, compute billing stops immediately
- When you restart, compute billing resumes

**Storage**: a baseline fee of **$5–10/month** for persistent data (workspace, backups, configuration).

- Charged regardless of whether the Claw is running or stopped
- Storage billing stops only when the Claw is **deleted**

### 2) Token Fee

Token usage is billed separately from infrastructure:

- **Bring your own key**: use your own API key (OpenAI, Anthropic, etc.) — no token fee from ClawUp
- **Purchase token packages**: buy tokens through ClawUp at cost + 20% markup
- You select the model and decide how much to spend on tokens

### What happens at creation

When you click **Create Claw**, the following is deducted from your balance:

- Minimum balance required: **$20**
- This reserves the first billing cycle (infrastructure + storage)

No token fee is deducted at creation — tokens are billed as you use them (if using ClawUp-provided tokens).

## Billing Cycle

| Event | Timing |
|-------|--------|
| **Daily usage tick** | Every 24 hours: compute hours × hourly rate + storage usage |
| **Low balance warning** | Email sent when balance covers **< 7 days** of estimated usage |
| **Critical warning** | Email sent when balance covers **< 3 days** |
| **Auto-stop** | When balance reaches **$0**: all running Claws are stopped automatically |
| **Storage cleanup** | **14 days** after auto-stop with no top-up: storage is deleted |

### Billing Tick Details

The billing system runs periodically (configurable via `BILLING_TICK_SECONDS`, default: `86400` = daily) and performs:

1. **Estimate daily burn rate** per user: sum of compute costs for all running Claws + storage costs for all stopped Claws
2. **Calculate days remaining**: `balance / daily_burn`
3. **Take action** based on remaining days:
   - `> 7 days`: healthy, no action
   - `3–7 days`: send low-balance reminder email
   - `1–3 days`: send critical warning email
   - `≤ 0 days`: auto-stop all running Claws, mark user as overdue

### Auto-Recovery

If a user tops up while in overdue status:
- Overdue status is cleared automatically on the next billing tick
- Claws can be restarted manually
- No data is lost during the 14-day grace period

## Team Billing

| Team Mode | Cost |
|-----------|------|
| **SubAgent** | **1 Claw** — only the leader container is billed. All sub-agent sessions run in-process. |
| **MultiAgent** | **N Claws** — each team member is a separate container, billed individually. |

Example: a 4-role team on Basic plan:
- SubAgent mode: $20/month (1 container)
- MultiAgent mode: $80/month (4 containers)

Make sure your account balance can cover all team members before creating a team.

## Recharge Methods

| Method | Description |
|--------|-------------|
| **Stripe** | Credit card payment via Stripe checkout. Live and sandbox modes supported. |
| **Recharge Card** | Pre-paid code + password. Enter in **Billing & Funds**. |
| **Telegram Coupon** | Claim a coupon through the ClawUp Telegram bot for promotional credit. |
| **x402 Crypto** | On-chain payment with USDC/USDT across multiple chains (ERC20 direct transfer). |

## Billing Events

All billing actions are recorded in the audit log:

| Event | Description |
|-------|-------------|
| `usage_compute` | Hourly compute charge for a running Claw |
| `usage_storage` | Storage charge for a stopped Claw with backup data |
| `subscription_due_soon` | Low-balance reminder sent |
| `balance_exhausted` | Balance reached zero, auto-stop triggered |
| `bot_auto_stopped_overdue` | Claw stopped due to insufficient balance |
| `billing_overdue_cleared` | User topped up, overdue status removed |

## Traceability and Audit

- All recharge events are recorded with timestamps and payment channel details
- Balance changes are traceable through billing logs
- Claw operations can be correlated through audit entries
- Open **Billing & Funds** to view current balance, recharge history, and usage

## Related Guides

- For team pricing details, see [Teams](./teams.md)
- For x402 crypto payment testing, see `docs/x402-e2e-testing.md` in the repository

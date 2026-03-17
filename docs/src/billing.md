# Billing

ClawUp billing is designed for traceable payment operations and auditability.

## Plans

| Plan | Isolation | Price | Description |
|------|-----------|-------|-------------|
| **Free** | Standard | $0 | 7-day free trial via OpenRouter. No API key needed — the platform provisions one automatically. Model is pre-selected and locked. One Claw per user. Designed for new users to explore the platform. |
| **Basic** | Standard | $10/month | Managed containers with standard runtime. Bring your own API key. For individual users and lightweight workloads. |
| **Pro** | Standard | Coming Soon | Higher token quota, richer Persona library, priority support. Advanced mode enabled. For power users needing more capabilities. |
| **Enterprise** | Confidential (TEE) | Coming Soon | Confidential containers with hardware-level memory encryption. Data is protected during execution — no third party, including the platform operator and cloud provider, can access user data. For organizations with strict compliance and data sovereignty requirements. |

## Current Billing Strategy

ClawUp uses a **dual-track billing model**:

1. **Subscription cycle charge** (plan fee)
2. **Usage charge** (compute + storage)

### 1) Subscription Cycle Charge

- Charged per active Claw at cycle boundary.
- Unit price is `monthly_price` from `backend/plans.json`.
- Active Claw statuses: `Creating`, `Reconciling`, `Running`.
- Event type in billing logs: `subscription_cycle_charge`.

Cycle controls:

- `BILLING_CYCLE_DAYS` (default: `1`)
- `BILLING_REMINDER_DAYS` (default: `7`, clamped to `< cycle_days`)

### 2) Usage Charge (Compute + Storage)

Charged on each billing tick:

- `usage_compute`: running-time cost from `compute_hourly_cents`
- `usage_storage`: stopped backup-size cost from `storage_gb_hourly_cents`

Tick control:

- `BILLING_TICK_SECONDS` (default: `3600`)

Storage metering note:

- Storage charging applies when a Claw is `Stopped` and backup size is known.
- On stop, backend reads latest OpenClaw backup size (or falls back to last known size) to update storage meter baseline.

### Monthly Usage Cap

- `monthly_cap_cents` is enforced **per Claw** on **usage charges** (`usage_compute + usage_storage`).
- Subscription cycle fee is separate from this cap.

## Billing Events You Should Expect

- `bot_create_requested` (create request logged; no immediate monetary charge)
- `usage_compute`
- `usage_storage`
- `subscription_due_soon`
- `subscription_cycle_charge`
- `subscription_overdue`
- `bot_auto_stopped_overdue`

### Free Plan Details

- Available to all new accounts immediately — no payment required.
- The platform provisions an OpenRouter API key for you automatically.
- Model is fixed (not user-selectable) and the model picker is disabled.
- The provisioned key and associated resources are cleaned up when the Claw is deleted.
- After the trial period, upgrade to Basic or higher to continue.

## Recharge Methods

- Telegram channel coupon
- Stripe recharge
- Recharge card
- x402-based crypto payment

## Traceability and Audit

All billing-related actions are traceable through billing records and audit logs.

- Recharge creation and completion events are recorded.
- Balance changes are recorded with timestamps.
- Related Claw operations can be correlated through audit entries.

## Recommended Check Path

1. Open **Billing** to confirm recharge and balance status.
2. Open audit views to trace the related operation timeline.
3. If there is a mismatch, verify payment channel details and request IDs.

For x402 crypto payment integration and end-to-end validation, see `docs/x402-e2e-testing.md` in the repository.

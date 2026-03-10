# Billing

ClawUp billing is designed for traceable payment operations and auditability.

## Plans

| Plan | Isolation | Price | Description |
|------|-----------|-------|-------------|
| **Free** | Shared | $0 | 7-day free trial via OpenRouter. No API key needed — the platform provisions one automatically. Model is pre-selected and locked. One Claw per user. Designed for new users to explore the platform. |
| **Basic** | Shared | $10/month | Managed containers with shared runtime. Bring your own API key. For individual users and lightweight workloads. |
| **Pro** | Dedicated (ECS) | $30/month | Dedicated compute instance (ECS 2c4g) per Claw. Compute-level isolation and advanced mode enabled. For growing teams. |
| **Enterprise** | Confidential (TEE) | Coming Soon | Confidential containers with hardware-level memory encryption. Data is protected during execution — no third party, including the platform operator and cloud provider, can access user data. For organizations with strict compliance and data sovereignty requirements. |

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

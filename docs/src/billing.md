# Billing

ClawUp billing is designed for traceable payment operations and auditability.

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

# x402 Crypto Payment — End-to-End Testing

This document describes the end-to-end test for the x402 on-chain payment integration,
covering chain discovery, merchant info, order creation, payment submission, status polling,
on-chain proof retrieval, and order cancellation.

## Quick Start

```bash
# Smoke test — no real wallet or funds needed
make test-x402-e2e

# Full integration test — verifies on-chain confirmation and balance credit
X402_TEST_WALLET=0xYourWalletAddress \
X402_TEST_TX_HASH=0xYourRealTxHash \
make test-x402-e2e
```

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Running backend | `make up` or `cargo run` in `backend/` |
| `AUTH_MOCK_ENABLED=true` | Required for mock login in the test |
| x402 env vars configured | `X402_API_URL`, `X402_API_KEY`, `X402_API_SECRET`, `X402_MERCHANT_ID` |
| `curl` and `node` | Both must be in `$PATH` |

The test calls the **real x402 API** using the credentials configured in the backend. No on-chain
transaction is required for the smoke-test path — only the optional confirmation poll (step 8)
requires a real funded wallet.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8080` | ClawUp backend base URL |
| `LOGIN_CODE` | `x402-e2e-<timestamp>` | Mock login code (creates a fresh test user each run) |
| `X402_TEST_CHAIN_ID` | *(first chain with matching token)* | Chain ID to use for the test order |
| `X402_TEST_TOKEN` | `USDC` | Token symbol (`USDC` or `USDT`) |
| `X402_TEST_AMOUNT_USD` | `1.00` | Order amount in USD |
| `X402_TEST_WALLET` | `0x000...001` | Payer wallet address sent to x402 API |
| `X402_TEST_TX_HASH` | *(unset)* | Real on-chain tx hash; triggers confirmation poll and balance check |
| `X402_POLL_TIMEOUT` | `60` | Seconds to wait for on-chain confirmation (step 8) |
| `X402_POLL_INTERVAL` | `5` | Seconds between status polls |

## Test Steps

### Step 0 — Preflight
Verifies the backend is reachable (`GET /healthz`). Fails fast if the backend is down.

### Step 1 — Mock Login
Calls `POST /api/v1/auth/google/callback` with a unique `LOGIN_CODE` to obtain a bearer token.
Requires `AUTH_MOCK_ENABLED=true` in the backend environment.

### Step 2 — GET /api/v1/billing/x402/chains
Retrieves the list of supported chain/token pairs for the configured `X402_NETWORK_MODE`
(testnet or mainnet). Validates:
- Response is HTTP 200
- `network_mode` field is present
- `chains` array is non-empty

Automatically selects a `chain_id` matching `X402_TEST_TOKEN`. Fails if no matching chain is found.

**Example response:**
```json
{
  "network_mode": "testnet",
  "chains": [
    { "chain_id": 48816, "chain_name": "GOAT Testnet3", "token_symbol": "USDC",
      "token_contract": "0x29d1ee...", "decimals": 6 },
    { "chain_id": 97,    "chain_name": "BSC Testnet",   "token_symbol": "USDC",
      "token_contract": "0xA4B955...", "decimals": 18 }
  ]
}
```

### Step 3 — GET /api/v1/billing/x402/merchant
Fetches merchant information for the `X402_MERCHANT_ID` configured in the backend.
This endpoint proxies to the x402 API's public `/merchants/{id}` endpoint (no auth required
on the x402 side).

- HTTP 503 → x402 not configured; step is skipped with a warning
- HTTP 502 → x402 API unreachable; step is skipped with a warning
- HTTP 200 → validates `merchant_id` and logs `receive_type` (DIRECT / DELEGATE)

**Example response:**
```json
{
  "merchant_id": "m_abc123",
  "name": "ClawUp",
  "receive_type": "DELEGATE",
  "wallets": [...]
}
```

### Step 4 — POST /api/v1/billing/x402/create-order
Creates a real order with the x402 API. Validates:
- `order_id` — GoatX402 order identifier
- `dapp_order_id` — ClawUp-generated ID (`clawup_<uuid>`)
- `flow` — payment flow type (`ERC20_DIRECT`, `ERC20_3009`, or `ERC20_APPROVE_XFER`)
- `status` — initial status (usually `created`)
- `pay_to_address` — ERC-20 recipient address (for `ERC20_DIRECT`)
- `amount_wei` — amount in token atomic units
- `from_chain_id` — source chain parsed from CAIP-2 (`eip155:<id>`)
- `calldata_sign_request` — present only for DELEGATE flow (EIP-712 signing data)

**Request body:**
```json
{
  "chain_id": 48816,
  "token_symbol": "USDC",
  "amount_usd": "1.00",
  "wallet_address": "0xYourWallet"
}
```

### Step 5 — GET /api/v1/billing/x402/order-status (initial)
Queries the x402 API for the current order status immediately after creation.
Expected x402 status: `CHECKOUT_VERIFIED`. Internal status: `processing`.

**Example response:**
```json
{
  "order_id": "ord_abc123",
  "status": "CHECKOUT_VERIFIED",
  "internal_status": "processing",
  "credited": false
}
```

### Step 6 — POST /api/v1/billing/x402/submit-payment
Submits a transaction hash to the backend, recording that the user has executed the
on-chain payment. For ERC20_DIRECT flow, this is the tx hash of the ERC-20 `transfer()`
call to `pay_to_address`.

- **Smoke test path** (`X402_TEST_TX_HASH` unset): a dummy `0x000...000` hash is submitted.
  The x402 facilitator will not confirm this, but all backend endpoints are exercised.
- **Integration test path** (`X402_TEST_TX_HASH` set): the real tx hash is submitted and
  the test proceeds to poll for confirmation.

**Request body:**
```json
{ "order_id": "ord_abc123", "payment_header": "0xYourTxHash" }
```

### Step 7 — GET /api/v1/billing/x402/order-status (post-submit)
Re-queries order status after payment submission. Status typically remains
`CHECKOUT_VERIFIED` until the x402 facilitator confirms the on-chain transaction.

### Step 8 — Confirmation Poll *(optional, requires `X402_TEST_TX_HASH`)*
Polls `GET /api/v1/billing/x402/order-status` every `X402_POLL_INTERVAL` seconds until:
- `internal_status` is `completed` (x402 status `INVOICED`) — **success**
- `internal_status` is `failed` (x402 status `FAILED`, `EXPIRED`, or `CANCELLED`) — **failure**
- `X402_POLL_TIMEOUT` seconds elapse — **timeout** (test continues with a warning)

On success, the backend credits the user's `credit_balance_cents` by the order amount
(idempotency-guarded via `x402_processed_orders`). The test then reads `GET /api/v1/auth/me`
and verifies `credit_balance_cents` increased by the correct amount.

### Step 9 — GET /api/v1/billing/x402/order-proof *(optional, after confirmation)*
Fetches the on-chain proof for a confirmed order. Only available after x402 status
reaches `INVOICED`. Returns a signed payload for independent verification:

```json
{
  "order_id": "ord_abc123",
  "payload": {
    "order_id": "ord_abc123",
    "tx_hash": "0x...",
    "log_index": 0,
    "from_addr": "0x...",
    "to_addr": "0x...",
    "amount_wei": "1000000",
    "chain_id": 48816,
    "flow": "ERC20_DIRECT"
  },
  "signature": "0x..."
}
```

### Step 10 — POST /api/v1/billing/x402/cancel-order *(cleanup)*
Cancels the test order on the x402 API if it was not confirmed. This cleans up
`CHECKOUT_VERIFIED` orders. If the order is already in a terminal state or was
submitted with a tx hash, the x402 API may reject the cancel (HTTP 502) — this is
expected and the test does not fail.

## Payment Flows Covered

### ERC20_DIRECT (current frontend flow)
```
create-order → [user sends ERC-20 transfer on-chain] → submit-payment → poll order-status
```
The test exercises all backend endpoints for this flow. The on-chain transfer step
requires a real funded wallet and is only triggered when `X402_TEST_TX_HASH` is provided.

### ERC20_3009 / DELEGATE (backend ready, frontend UI not yet wired)
```
create-order → [server returns calldata_sign_request] → user signs EIP-712 →
POST /calldata-signature → poll order-status
```
The test validates that `calldata_sign_request` is present in the response when
the merchant is configured for DELEGATE mode. The EIP-712 signing step is not
automated in the test script (requires a wallet private key).

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `[preflight] backend health check failed` | Backend not running; run `make up` |
| `[mock login] FAILED` | `AUTH_MOCK_ENABLED` not set to `true` in backend env |
| `[get chains] FAILED — chains array is empty` | `X402_API_URL` not set or wrong `X402_NETWORK_MODE` |
| `[create order] FAILED — HTTP 502` | x402 API unreachable or credentials invalid |
| `[create order] FAILED — HTTP 400 X402_INVALID_WALLET` | `X402_TEST_WALLET` is not a valid 0x address |
| `[create order] FAILED — HTTP 400 X402_UNSUPPORTED_CHAIN_TOKEN` | `X402_TEST_CHAIN_ID` + `X402_TEST_TOKEN` combo not in supported list |
| Confirmation poll times out | Normal for smoke test with dummy tx hash; set `X402_POLL_TIMEOUT` higher for slow chains |
| Cancel returns HTTP 502 | x402 rejects cancel for orders in `submitted` state — expected, not a test failure |

## CI Integration

To run this test in CI with real x402 credentials:

```yaml
- name: x402 E2E
  env:
    X402_API_URL: ${{ secrets.X402_API_URL }}
    X402_API_KEY: ${{ secrets.X402_API_KEY }}
    X402_API_SECRET: ${{ secrets.X402_API_SECRET }}
    X402_MERCHANT_ID: ${{ secrets.X402_MERCHANT_ID }}
    AUTH_MOCK_ENABLED: "true"
  run: make test-x402-e2e
```

For full payment confirmation testing in CI, fund a test wallet, pre-sign a transaction,
and pass its hash via `X402_TEST_TX_HASH` and the sender address via `X402_TEST_WALLET`.

# Features

This chapter introduces ClawUp's core product capabilities and where to use them in the console.

## 1. One-Click OpenClaw Runtime

ClawUp provisions and manages OpenClaw runtimes for users without requiring manual infrastructure setup.

- Value: faster first-run experience, lower setup complexity.
- Entry: create a new Claw in **Create Claw**.

## 2. Memory Inheritance with `Fork From`

You can create a new Claw from an existing backup/version to reuse prior state and memory.

- Value: rapid cloning for experimentation, staged rollout, or recovery.
- Entry: set **Restore Source = Fork From Existing Claw** in the create flow.

## 3. Unified Tool Model (MCP + OpenClaw Hooks)

ClawUp uses one Tool model to manage two kinds of OpenClaw extensions: MCP tools (agent-invoked capabilities) and OpenClaw Hooks (event-driven automation scripts). Both are registered, validated, and installed through the same workflow.

- Value: consistent install and management experience across integration types.
- Entry:
  - Admin: **Settings -> Tool Registry**
  - User: **Tools -> Marketplace / Installed**

## 4. Multi-Channel Support (Telegram, Feishu)

ClawUp supports multiple messaging channels out of the box. Select channels during Claw creation and the platform writes default config automatically.

- Supported: Telegram (Bot Token), Feishu (App ID + App Secret).
- Value: connect your Claw to users on their preferred platform with minimal setup.
- Entry: channel selection in **Create Claw**; for Telegram, webhook resync in **Tools -> Installed**.

## 5. Traceable Billing and Audits

Billing actions and operational events are designed to be traceable through logs and audits.

- Value: clearer financial and operational accountability.
- Entry: **Billing** and audit views in the console.

## 6. Privacy-First Defaults

ClawUp is designed around privacy-first operations.

- Value: safer baseline behavior for sensitive data and runtime workloads.
- Core trust and privacy capabilities:
  - Zero data retention by default
  - **Encryption at rest**: all user information written to disk is encrypted — including channel credentials, conversation data, and runtime state
  - Full audit coverage for all Claw operations
  - **Confidential computing (Enterprise)**: the Enterprise plan runs Claws inside confidential containers (TEE — Trusted Execution Environment). Data in memory is hardware-encrypted during execution, ensuring that no third party — including the platform operator, cloud provider, or infrastructure administrator — can access user data. See [Plans & Isolation](#plans--isolation) below.
- Entry: platform default behavior and runtime/tool configuration.

## 7. Plans & Isolation

ClawUp offers four plans with increasing levels of runtime isolation:

| Plan | Isolation | Price | Description |
|------|-----------|-------|-------------|
| **Free** | Standard | $0 | 7-day free trial via OpenRouter. No API key needed — the platform provisions one automatically. Model is pre-selected and locked. One Claw per user. |
| **Basic** | Standard | $10/month | Managed containers with standard runtime. Bring your own API key. Suitable for individual users and lightweight workloads. |
| **Pro** | Dedicated (ECS 2c4g) | $30/month | Dedicated compute instance per Claw. Compute-level isolation and advanced mode enabled. For growing teams needing stronger separation. |
| **Enterprise** | Confidential (TEE) | Coming Soon | **Confidential container** with hardware-level memory encryption. Data is protected during execution — no third party, including the platform operator and cloud provider, can access user data, conversation content, or credentials. For organizations with strict compliance and data sovereignty requirements. |

All plans share the same storage security guarantee: any user information written to disk is encrypted.

## Related Guides

- For a fast onboarding path, see [Quick Start](./quick-start.md).
- For integration details, see [Tools & Channels](./apps-and-webhooks.md).
- For restore workflows, see [Restore & Migration](./restore-and-migration.md).

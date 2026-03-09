# Core Features

This chapter introduces ClawUp's core product capabilities and where to use them in the console.

## 1. One-Click OpenClaw Runtime

ClawUp provisions and manages OpenClaw runtimes for users without requiring manual infrastructure setup.

- Value: faster first-run experience, lower setup complexity.
- Entry: create a new Claw in **Create Claw**.

## 2. Memory Inheritance with `Fork From`

You can create a new Claw from an existing backup/version to reuse prior state and memory.

- Value: rapid cloning for experimentation, staged rollout, or recovery.
- Entry: set **Restore Source = Fork From Existing Claw** in the create flow.

## 3. Unified App Model (MCP + OpenClaw Hooks)

ClawUp uses one App model to manage two kinds of OpenClaw extensions: MCP tools (agent-invoked capabilities) and OpenClaw Hooks (event-driven automation scripts). Both are registered, validated, and installed through the same workflow.

- Value: consistent install and management experience across integration types.
- Entry:
  - Admin: **Settings -> App Registry**
  - User: **Apps -> Marketplace / Installed**

## 4. Multi-Channel Support (Telegram, Feishu)

ClawUp supports multiple messaging channels out of the box. Select channels during Claw creation and the platform writes default config automatically.

- Supported: Telegram (Bot Token), Feishu (App ID + App Secret).
- Value: connect your Claw to users on their preferred platform with minimal setup.
- Entry: channel selection in **Create Claw**; for Telegram, webhook resync in **Apps -> Installed**.

## 5. Traceable Billing and Audits

Billing actions and operational events are designed to be traceable through logs and audits.

- Value: clearer financial and operational accountability.
- Entry: **Billing** and audit views in the console.

## 6. Privacy-First Defaults

ClawUp is designed around privacy-first operations.

- Value: safer baseline behavior for sensitive data and runtime workloads.
- Core trust and privacy capabilities:
  - Zero data retention by default
  - Encryption at rest
  - Runtime compute encryption support
  - Full audit coverage for all Claw operations
- Entry: platform default behavior and runtime/app configuration.

## Related Guides

- For a fast onboarding path, see [Quick Start](./quick-start.md).
- For integration details, see [Apps & Channels](./apps-and-webhooks.md).
- For restore workflows, see [Restore & Migration](./restore-and-migration.md).

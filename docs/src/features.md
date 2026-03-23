---
title: Features
description: Core product capabilities of ClawUp
---

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

## 5. Multi-Agent Teams

ClawUp lets you create Teams — groups of Claws that work together as a coordinated unit. Each team member has a defined role and persona, and the platform handles all networking automatically.

### SubAgent Mode (Recommended)

One container runs all team roles as virtual sub-agents via OpenClaw's `sessions_spawn`. The leader orchestrates in-process sub-sessions — each sub-agent receives a task, executes, and announces results back.

- **Cost-efficient**: 1 container / 1 billing unit regardless of team size
- **Fast**: in-process communication, zero network overhead
- **Token-efficient**: sub-agents only see their task, not the full team context
- Best for: most teams (4-8 roles), rapid iteration, cost-sensitive workloads

### MultiAgent Mode

Each team member runs in its own container with a dedicated OpenClaw runtime. Members communicate via claw-connect (HTTP-based agent messaging with JWT authentication and discovery via NamingService).

- **Fault-tolerant**: one agent crashing doesn't affect others
- **Flexible**: different models per agent, independent scaling
- **Isolated**: full container isolation, no shared workspace
- Best for: enterprise workloads, heterogeneous models, long-running parallel tasks

### Team Templates & AI Generate

- Built-in templates: Research Team, MetaGPT Software Company, and more
- AI Generate: describe your needs and the platform generates a custom team structure with roles, personas, and communication patterns
- Entry: **Teams** in the left sidebar.

## 6. Usage-Based Billing

Pay only for what you use — compute is billed per-hour only when your Claw is running.

- **Compute**: $20/month (~$0.028/hour), stops when Claw is stopped
- **Storage**: $5–10/month baseline, charged regardless of running state
- **Tokens**: bring your own API key (free) or purchase through ClawUp (cost + 20%)
- Auto-stop when balance is exhausted, 14-day grace period before storage cleanup
- Low-balance email warnings at 7 days and 3 days remaining
- Recharge via Stripe, recharge cards, Telegram coupons, or x402 crypto
- Full audit log for all billing operations
- Entry: **Billing & Funds** in the left sidebar. See [Billing](./billing.md) for details.

## 7. Privacy-First Defaults

ClawUp is designed around privacy-first operations.

- Value: safer baseline behavior for sensitive data and runtime workloads.
- Core trust and privacy capabilities:
  - Zero data retention by default
  - **Encryption at rest**: all user information written to disk is encrypted — including channel credentials, conversation data, and runtime state
  - Full audit coverage for all Claw operations
  - **Confidential computing (Enterprise)**: the Enterprise plan runs Claws inside confidential containers (TEE — Trusted Execution Environment). Data in memory is hardware-encrypted during execution, ensuring that no third party — including the platform operator, cloud provider, or infrastructure administrator — can access user data. See [Plans & Isolation](#plans--isolation) below.
- Entry: platform default behavior and runtime/tool configuration.

## 8. Claw Connect — Agent Communication

Claw Connect enables agent-to-agent communication across Claws and users.

- **Naming Service**: agents register and discover each other by name
- **Nebula Universe**: topic-based agent clustering for group communication
- **MCP Integration**: installed as a standard MCP tool from the Marketplace
- **JWT Authentication**: secure per-bot identity, prevents impersonation
- Entry: install **claw-connect** from **Tools -> Marketplace**.

## 9. Plans & Isolation

ClawUp offers four plans with increasing levels of runtime isolation:

| Plan | Isolation | Price | Description |
|------|-----------|-------|-------------|
| **Basic** | Standard | $20/month | Managed containers with per-hour compute billing. Bring your own API key or purchase tokens. Pay only when running. |
| **Pro** | Standard | Coming Soon | Higher token quota, richer Persona library, priority support. Advanced mode enabled. For power users needing more capabilities. |
| **Enterprise** | Confidential (TEE) | Coming Soon | **Confidential container** with hardware-level memory encryption. Data is protected during execution — no third party, including the platform operator and cloud provider, can access user data, conversation content, or credentials. For organizations with strict compliance and data sovereignty requirements. |

All plans share the same storage security guarantee: any user information written to disk is encrypted.

## Related Guides

- For a fast onboarding path, see [Quick Start](./quick-start.md).
- For channel setup, see [Connect Channel](./connect-channel.md).
- For team workflows, see [Teams](./teams.md).
- For restore workflows, see [Restore & Migration](./restore-and-migration.md).
- For billing details, see [Billing](./billing.md).

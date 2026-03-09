# Overview

ClawUp is a managed OpenClaw platform focused on:

- One-click OpenClaw deployment
- Claw memory inheritance (`Fork From`)
- App-based extensibility (MCP + OpenClaw Hooks)
- Multi-channel support (Telegram, Feishu)
- Privacy-first and trust operations (zero data retention, all user data encrypted at rest, full audit coverage; Enterprise plan adds confidential containers with hardware-level memory encryption — no third party can access user data)

Core management surfaces:

- **Settings -> App Registry** (admin): register MCP / OpenClaw Hooks apps
- **Apps -> Marketplace / Installed** (user): bind apps to Claws and manage lifecycle
- **Billing / Audits**: recharge and operational traceability

Terminology:

- **MCP app**: external MCP server exposing tools that the agent can invoke during conversations.
- **OpenClaw Hook app**: event-driven TypeScript script running inside the Gateway, triggered automatically by system events (messages, commands, sessions, etc.).
- **Channel**: messaging platform connection (Telegram, Feishu) configured during Claw creation.

Use this docs site as the single entry for product usage and operations.

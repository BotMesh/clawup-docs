# Apps & Channels

ClawUp has two integration systems: **Apps** for extending Claw capabilities, and **Channels** for connecting Claws to messaging platforms.

## Apps

Apps extend what a Claw can do. ClawUp uses a unified App model covering two kinds of OpenClaw extensions: **MCP** and **Hooks**. Both are managed through the same App Registry and Marketplace workflow.

### MCP

[MCP (Model Context Protocol)](https://docs.openclaw.ai/automation/mcp) apps expose external tools and capabilities to your Claw.

- What it is: an external MCP server providing tools that the agent can call during conversations.
- Typical endpoint: MCP HTTP/SSE endpoint.
- Runtime behavior: bound into the Claw runtime as an MCP tool provider; tools appear in the agent's context and can be invoked by the agent.

### OpenClaw Hooks

[OpenClaw Hooks](https://docs.openclaw.ai/automation/hooks) are event-driven automation scripts running inside the Gateway.

- What it is: lightweight TypeScript scripts triggered automatically by system events — not called by the agent, but fired by the Gateway on predefined events.
- Supported events:
  - **Message events** — `message:received`, `message:transcribed`, `message:preprocessed`, `message:sent`
  - **Command events** — `command:new`, `command:reset`, `command:stop`
  - **Session events** — `session:compact:before`, `session:compact:after`
  - **Agent events** — `agent:bootstrap`
  - **Gateway events** — `gateway:startup`
- Typical use cases: session memory persistence, audit logging, bootstrap file injection, message pre/post-processing.
- Key difference from MCP: MCP tools are invoked by the agent during reasoning; hooks execute automatically in response to system events and operate outside the agent decision loop.

In App Registry, the `Type` field (MCP or Hook) controls which validation path and binding behavior are used.

### App Architecture

The flow is split into two layers:

1. **Platform registration (admin):**
   - Register app metadata in **Settings -> App Registry**
   - Set type (MCP or Hook), endpoint, auth scheme, and status (`active` / `disabled`)

2. **Per-claw binding (user):**
   - Go to **Apps -> Marketplace**
   - Select target Claw
   - Click **Add to Claw**
   - Fill app-specific credentials/config
   - Click **Validate & Install**

After binding, manage in **Apps -> Installed**.

### Validate Behavior

`Validate` in App Registry is not just a ping:

1. **For MCP apps**
   - ClawUp sends a JSON-RPC `initialize` probe.
   - Headers include:
     - `Content-Type: application/json`
     - `Accept: application/json, text/event-stream`
   - Success criteria: endpoint returns `2xx`.
   - Reason: many MCP servers reject plain GET checks and require MCP handshake semantics.

2. **For Hook apps**
   - ClawUp runs a basic HTTP reachability check (`GET`).
   - Success criteria: `2xx/3xx`.

If validation fails, backend returns detailed failure text (status/body/request failure), and UI shows validation status in the App Registry table.

### Where To Register Apps

Open **Settings** and switch to **App Registry** tab.

Available actions:

- **Add App**: create a new MCP/Hook registry item
- **Edit**: update endpoint/auth/status/etc.
- **Enable / Disable**: toggle app availability for users
- **Validate**: run backend validation against the configured endpoint
- **Type Filter**: `All`, `MCP`, `Hook`

Only node admins can access App Registry.

### Where Users Install Apps

Open left nav **Apps**.

Tabs:

- **Marketplace**: discover registered apps and add to selected Claw
- **Installed**: view installed app bindings for current Claw and reconfigure/remove

Claw cards also include an **Apps** button that jumps directly to this page and preselects the Claw.

## Channels

Channels connect Claws to messaging platforms. They are configured during Claw creation and written into the OpenClaw runtime config. OpenClaw handles the actual connection to the messaging platform.

**Credential isolation**: channel credentials (Telegram Bot Token, Feishu App ID / App Secret, etc.) are never stored in the platform database. At provision time, they are Base64-encoded into the `OPENCLAW_CONFIG_B64` environment variable, injected into the container, decoded by the bootstrap script, and written to the runtime config file inside the container. The platform does not persist or have ongoing access to these secrets — they only exist within the container environment.

### Telegram

Select **Telegram** during Claw creation and provide:

- **Bot Token** — issued by @BotFather.

After the Claw starts, complete pairing in the Telegram chat: `openclaw pairing approve <CODE>`.

#### Telegram Webhook Sync

ClawUp provides a platform-level webhook sync feature for Telegram. This is separate from the App system — it registers and maintains the webhook URL with Telegram's API.

In **Apps -> Installed**, Telegram channels have a **Resync Webhook** action that calls:

- `POST /api/v1/bots/{id}/telegram/webhook/sync`

Use this when:

- webhook target URL changed
- Telegram side webhook config drifted
- token/secret rotated and you need re-apply

### Feishu

Select **Feishu** during Claw creation and provide:

- **App ID** — format `cli_xxx`, from Feishu Open Platform credentials page.
- **App Secret** — keep private; reset immediately if leaked.

Feishu uses **WebSocket (long connection)** mode by default — OpenClaw connects outbound to Feishu automatically, no webhook URL registration needed.

#### Setup Steps

1. Create an enterprise app on [Feishu Open Platform](https://open.feishu.cn/).
2. Copy **App ID** and **App Secret** from the credentials page.
3. Configure required permissions (messaging, file access, contact data).
4. Enable **Bot Capability** in the app settings.
5. Configure **Event Subscription** — select "Use long connection to receive events" (WebSocket mode) and add `im.message.receive_v1`.
6. Publish the app and submit for approval.
7. In ClawUp, create a Claw with Feishu channel selected, fill in App ID and App Secret.
8. After the Claw starts, send a test message to your Feishu bot and complete pairing: `openclaw pairing approve feishu <CODE>`.

For full Feishu configuration reference, see [OpenClaw Feishu docs](https://docs.openclaw.ai/channels/feishu).

## Operational Recommendation

### Apps

1. Admin registers app in **App Registry**
2. Admin validates endpoint and enables app
3. User installs app in **Marketplace**
4. User verifies status in **Installed**

### Channels

1. Select channels during Claw creation and fill in credentials
2. After Claw starts, complete pairing in chat
3. For Telegram, run **Resync Webhook** after token/URL changes

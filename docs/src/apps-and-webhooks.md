# Apps & Webhooks

ClawUp now uses a unified **App** model for both MCP servers and Webhook integrations.

## Architecture

The flow is split into two layers:

1. **Platform registration (admin):**
   - Register app metadata once in **Settings -> App Registry**
   - App type can be MCP or Hook
   - Control status (`active` / `disabled`), endpoint, auth scheme, and visibility

2. **Per-claw binding (user):**
   - Go to **Apps -> Marketplace**
   - Select target Claw
   - Click **Add to Claw**
   - Fill app-specific credentials/config
   - Click **Validate & Install**

After binding, manage in **Apps -> Installed**.

## MCP vs Hook

ClawUp uses one App model, but there are two integration styles:

1. **MCP App**
   - Purpose: expose tools/capabilities through MCP protocol.
   - Typical endpoint: MCP HTTP/SSE endpoint.
   - Runtime behavior: bound into your claw runtime as an MCP app.

2. **Hook App**
   - Purpose: webhook/event style integration (for example Telegram webhook workflows).
   - Typical endpoint: HTTP webhook target.
   - Runtime behavior: stores webhook config and executes hook-specific apply/sync flow.

In App Registry, `Type` controls which validation path and binding behavior are used.

## Validate Behavior

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

If validation fails, backend returns detailed failure text (status/body/request failure), and UI now shows validation status in the App Registry table.

## Where To Register Apps

Open **Settings** and switch to **App Registry** tab.

Available actions:

- **Add App**: create a new MCP/Hook registry item
- **Edit**: update endpoint/auth/status/etc.
- **Enable / Disable**: toggle app availability for users
- **Validate**: run backend validation against the configured endpoint
- **Type Filter**: `All`, `MCP`, `Hook`

Only node admins can access App Registry.

## Where Users Install Apps

Open left nav **Apps**.

Tabs:

- **Marketplace**: discover registered apps and add to selected Claw
- **Installed**: view installed app bindings for current Claw and reconfigure/remove

Claw cards also include an **Apps** button that jumps directly to this page and preselects the Claw.

## Telegram Webhook App

For Telegram webhook style apps, `Add to Claw` shows extra fields:

- `Bot Token / API Key`
- `Webhook Secret`
- `Allowed Updates` (comma-separated)
- `Drop pending updates`

Then use **Validate & Install**.

### Resync Webhook

In **Apps -> Installed**, Telegram webhook apps have a **Resync Webhook** action.

This calls:

- `POST /api/v1/bots/{id}/telegram/webhook/sync`

Use this when:

- webhook target URL changed
- Telegram side webhook config drifted
- token/secret rotated and you need re-apply

## Operational Recommendation

Use this order for production:

1. Admin registers app in `App Registry`
2. Admin validates endpoint and enables app
3. User installs app in `Marketplace`
4. User verifies status in `Installed`
5. For Telegram webhook apps, run `Resync Webhook` after token/URL changes

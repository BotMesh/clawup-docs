---
title: FAQ
description: Frequently asked questions
---

## Why does chat return `GATEWAY_NOT_READY`?

Runtime may still be starting or gateway token/url is missing.

## Why does chat return upstream 404?

Check ACK gateway URL template and runtime-router ingress routing.

## How do I switch model safely?

Add model credentials first, then switch in chat or channel.

## Where do I add MCP or OpenClaw Hooks?

Two steps:

1. Open **Tools -> Marketplace**
2. Install/bind tool to your Claw

Then manage binding in **Tools -> Installed**.

If a tool is missing in Marketplace, contact your node admin to publish/enable it in **Settings -> Tool Registry**.

## Telegram channel is not receiving updates. What should I do?

1. Open **Tools -> Installed**
2. Click **Resync Webhook** on your Telegram channel
3. Verify backend env has:
   - `TELEGRAM_COUPON_BOT_TOKEN`
   - `TELEGRAM_COUPON_WEBHOOK_TOKEN`
   - `TELEGRAM_COUPON_WEBHOOK_URL` (or `BACKEND_PUBLIC_BASE_URL`)
4. Recheck Telegram `getWebhookInfo`

## Feishu channel is not connecting. What should I do?

1. Verify **App ID** and **App Secret** are correct (App ID format: `cli_xxx`).
2. Check that the Feishu app has **Bot Capability** enabled.
3. Confirm **Event Subscription** is set to long connection (WebSocket) mode with `im.message.receive_v1` added.
4. Make sure the Feishu app has been **published and approved**.
5. Check Claw runtime logs for connection errors.
6. If pairing is needed, send a message to the Feishu bot and approve with: `openclaw pairing approve feishu <CODE>`.

## Feishu bot receives messages but does not reply (error 99991672)

This means the Feishu app is missing required API permissions. The bot can receive messages via WebSocket but cannot call Feishu APIs to send replies.

**Required permissions** — go to **Feishu Open Platform → App Console → Permissions & Scopes** and enable:

| Permission | Purpose | Notes |
|------------|---------|-------|
| `im:message:send_as_bot` | Send messages as bot | **Required.** Usually auto-approved, no admin review needed. |
| `contact:contact.base:readonly` | Read basic contact info | Needed for resolving sender identity. |

**Common mistakes:**

- **Opened `im:message` instead of `im:message:send_as_bot`** — `im:message` is a legacy scope that may require admin approval and takes longer to activate. Use `im:message:send_as_bot` instead.
- **Permissions added but app not re-published** — Some permission changes require creating a new app version and publishing it. Check if the permission status shows "已开通" (Activated) vs "未开通" (Not activated).
- **Permissions activated but pod not restarted** — The Feishu SDK caches its access token. After permission changes, restart the Claw (or wait for token refresh) for the new scopes to take effect.

**Troubleshooting steps:**

1. Check Claw runtime logs for `99991672` errors. The error message lists which scopes are missing.
2. Open the permission link in the error message — it goes directly to the correct permissions page.
3. Enable the missing permissions.
4. Verify status shows "已开通".
5. Restart the Claw.
6. Send a test message to the Feishu bot.

## What is a Team?

A Team is a group of Claws that work together as a coordinated unit. Each member has a specific role and persona, and they communicate automatically through Claw Connect. You can create teams from built-in templates (Research Team, Software Company, Data Analysis, Investment Analysis) or describe your needs and let AI generate the team structure. See [Teams](./teams.md) for the full guide.

## How many Claws can a Team have?

There is no fixed limit on team size. The built-in templates range from 3 to 5 members. When using AI Generate, you can request any number of roles. Keep in mind that each member is a separate Claw, so larger teams cost more — see [Billing](./billing.md#team-billing) for details.

## Can I use different models for different team members?

Currently, all members of a team share the same model and API key, which you select during team creation. If you need different models for different roles, you can create individual Claws manually and connect them using Claw Connect.

## Feishu bot shows `TypeError: Invalid URL`

The Feishu SDK requires a fully-qualified domain with `https://` scheme. If logs show:

```
TypeError: Invalid URL
input: 'open.feishu.cn/open-apis/...'
```

This means the `domain` field in the OpenClaw channel config is missing the protocol prefix. The correct value is `https://open.feishu.cn`, not `open.feishu.cn`.

ClawUp automatically sets the correct domain for new Claws. If you encounter this on an existing Claw, recreate it or manually fix the config inside the container:

```json
{
  "channels": {
    "feishu": {
      "domain": "https://open.feishu.cn"
    }
  }
}
```

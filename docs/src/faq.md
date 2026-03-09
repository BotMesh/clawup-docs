# FAQ

## Why does chat return `GATEWAY_NOT_READY`?

Runtime may still be starting or gateway token/url is missing.

## Why does chat return upstream 404?

Check ACK gateway URL template and runtime-router ingress routing.

## How do I switch model safely?

Add model credentials first, then switch in chat or channel.

## Where do I add MCP or OpenClaw Hooks?

Two steps:

1. Open **Apps -> Marketplace**
2. Install/bind app to your Claw

Then manage binding in **Apps -> Installed**.

If an app is missing in Marketplace, contact your node admin to publish/enable it in **Settings -> App Registry**.

## Telegram channel is not receiving updates. What should I do?

1. Open **Apps -> Installed**
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

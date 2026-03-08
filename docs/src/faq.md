# FAQ

## Why does chat return `GATEWAY_NOT_READY`?

Runtime may still be starting or gateway token/url is missing.

## Why does chat return upstream 404?

Check ACK gateway URL template and runtime-router ingress routing.

## How do I switch model safely?

Add model credentials first, then switch in chat or channel.

## Where do I add MCP or Webhook integrations?

Two steps:

1. Open **Apps -> Marketplace**
2. Install/bind app to your Claw

Then manage binding in **Apps -> Installed**.

If an app is missing in Marketplace, contact your node admin to publish/enable it in **Settings -> App Registry**.

## Telegram webhook app is not receiving updates. What should I do?

1. Open **Apps -> Installed**
2. Click **Resync Webhook** on your Telegram webhook app
3. Verify backend env has:
   - `TELEGRAM_COUPON_BOT_TOKEN`
   - `TELEGRAM_COUPON_WEBHOOK_TOKEN`
   - `TELEGRAM_COUPON_WEBHOOK_URL` (or `BACKEND_PUBLIC_BASE_URL`)
4. Recheck Telegram `getWebhookInfo`

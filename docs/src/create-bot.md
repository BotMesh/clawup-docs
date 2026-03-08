# Create Claw

When creating a Claw, configure:

- Provider/model
- API key
- Runtime type and image
- Deploy account (optional, only shown for allowlisted users)
- Restore source (optional)

The platform validates OpenClaw config before applying it.

Deploy account behavior:

- Default: `node`
- If node admin sets a deploy-account allowlist entry in **Settings -> Users**, Create Claw shows `node` + assigned account.

After Claw creation:

1. Go to **Apps -> Marketplace**
2. Select your Claw
3. Add required apps (MCP or Hook)
4. Verify in **Apps -> Installed**

For Telegram webhook apps:

- fill token/secret/allowed updates during install
- use **Resync Webhook** after webhook URL/token changes

# Create Claw

Use this page as a parameter checklist when creating a new Claw.

## Form Layout

The create form is organized into two sections:

- **Main section** — fields most users need: Name, Model, API Key, Channels.
- **Advanced section** — collapsed by default, click **Advanced** to expand: Claw Type, Docker Image Tag, Deploy Account, Restore Source.

Most users only need the main section. The platform auto-selects sensible defaults for all advanced options.

## Main Parameters

### 1. Name

- What it is: display name for this Claw.
- When to set: always required.

### 2. Model

- What it is: the provider + model combination used by this Claw.
- When to set: always required.
- How to choose: use the searchable model picker — type to filter by model name or provider. Models are grouped by provider (OpenAI, Anthropic, Google, etc.) with OpenRouter models sub-grouped by upstream provider.
- **Free plan**: model is pre-selected and the picker is disabled. The platform chooses a default model via OpenRouter.
- Common issue: unsupported or misspelled model name; provider and API key mismatch.

### 3. API Key

- What it is: credential used by the runtime to call the selected provider.
- When to set: required for Basic, Pro, and Enterprise plans.
- **Free plan**: no API key needed — the platform provisions an OpenRouter key automatically.
- Security note: treat it as secret material and rotate it if exposed.
- Common issue: invalid or expired key leading to upstream auth errors.

Click the **?** icon next to API Key for help. Get your key from the provider's dashboard:

| Provider | API Key Page |
|----------|-------------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google AI | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Mistral | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys/) |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| xAI | [console.x.ai](https://console.x.ai/) |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) |
| Cohere | [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys) |
| OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |

### 4. Channels

Select which messaging channels to enable for this Claw. Currently supported:

| Channel | Required Fields | Description |
|---------|----------------|-------------|
| **Telegram** | Bot Token | Token from @BotFather. After creation, complete pairing code approval in chat. |
| **Feishu** | App ID, App Secret | Credentials from Feishu Open Platform. Create an enterprise app, enable bot capability, configure event subscription (WebSocket mode), publish the app, then complete pairing in chat. |

Selected channels are written as default config during creation. Channels requiring external credentials still need manual setup per the provider's documentation.

## Advanced Parameters

Click **Advanced** to expand these options. Defaults are auto-selected.

### Claw Type

- What it is: runtime isolation mode for this Claw.
- Default: `standard` (recommended).
- Other modes (dedicated) depend on infrastructure configuration.

### Docker Image Tag

- What it is: container image version used to run the Claw runtime.
- Default: latest platform image.
- Only change this if you need a specific version or custom image.

### Deploy Account

- What it is: account used for deployment identity.
- Only shown for allowlisted users; default is `node`.
- Configuration path (admin): **Settings -> Users**

### Restore Source

- What it is: initial state source for the new Claw.
- Default: none (fresh Claw).
- Available paths:
  - **Fork From Existing Claw**: clone from an existing backup/version.
  - **Restore From Uploaded Backup**: use uploaded local OpenClaw backup artifacts.
- Common issue: selecting an upload/version that is incomplete or not compatible.

## After Creation

1. Open **Apps -> Marketplace**
2. Select the newly created Claw
3. Install required apps (MCP or OpenClaw Hooks)
4. Verify status in **Apps -> Installed**

For Telegram channels, use **Resync Webhook** in **Apps -> Installed** after webhook URL/token updates.

# Create Claw

Use this page as a parameter checklist when creating a new Claw.

## Required vs Optional

- Required: Provider, Model, API Key, Runtime Type
- Conditional: Runtime Image (if custom image is needed)
- Optional: Deploy Account, Restore Source

The platform validates the OpenClaw config before applying it.

## Parameter Reference

### 1. Provider

- What it is: the model provider for this Claw.
- When to set: always required.
- How to choose: select the provider that matches your API key and target model family.
- Common issue: provider and API key do not match, causing model initialization failures.

### 2. Model

- What it is: the model ID used by this Claw.
- When to set: always required.
- How to choose: pick a model that is available under your provider account.
- Common issue: unsupported or misspelled model name.

### 3. API Key

- What it is: credential used by the runtime to call the selected provider.
- When to set: always required.
- Security note: treat it as secret material and rotate it if exposed.
- Common issue: invalid or expired key leading to upstream auth errors.

Get your API key from the provider's dashboard:

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

### 4. Runtime Type

- What it is: runtime isolation mode for this Claw.
- When to set: always required.
- Typical behavior:
  - `shared`: managed through runtime-provisioner for standard usage.
  - dedicated modes: depend on dedicated infrastructure configuration.
- Common issue: selecting a runtime mode that is not available in the current environment.

### 5. Runtime Image

- What it is: container image used to run the Claw runtime.
- When to set: optional for default flow, required only when custom image is needed.
- Recommendation: use the platform default unless you have a tested custom runtime image.
- Common issue: custom image missing required runtime dependencies.

### 6. Deploy Account

- What it is: account used for deployment identity in supported environments.
- When to set: optional; shown only for allowlisted users.
- Behavior:
  - Default: `node`
  - Allowlisted user: can choose `node` plus the assigned deploy account
- Configuration path (admin): **Settings -> Users**

### 7. Restore Source

- What it is: initial state source for the new Claw.
- When to set: optional.
- Available paths:
  - `Fork From Existing Claw`: clone from an existing backup/version
  - `Restore From Uploaded Backup`: use uploaded local OpenClaw backup artifacts
- Common issue: selecting an upload/version that is incomplete or not compatible.

## Example Configuration

- Provider: configured provider for your workspace
- Model: an available production model under that provider
- API Key: active key with valid quota
- Runtime Type: `shared` (recommended default)
- Runtime Image: platform default
- Deploy Account: `node` (or assigned allowlisted account)
- Restore Source: none for new builds, or `Fork From Existing Claw` for cloning

## After Creation

1. Open **Apps -> Marketplace**
2. Select the newly created Claw
3. Install required apps (MCP or Hook)
4. Verify status in **Apps -> Installed**

For Telegram webhook apps, use **Resync Webhook** after webhook URL/token updates.

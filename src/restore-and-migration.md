---
title: Restore & Migration
description: Fork, restore, and migrate Claw data
---

## Fork From Existing Claw

Choose **Restore Source = Fork From Existing Claw** and pick a backup version.

## Upload Local OpenClaw Backup

Get `CLAWUP_BEARER_TOKEN` first:

Recommended (production):

1. Log in on ClawUp web.
2. Open browser DevTools -> Application/Storage -> Cookies.
3. Copy cookie `clawup_token`. Its value is `CLAWUP_BEARER_TOKEN`.

Verify token:

```bash
curl -sS https://api.clawup.org/api/v1/auth/me \
  -H "Authorization: Bearer <CLAWUP_BEARER_TOKEN>"
```

Download and use script:

```bash
curl -fsSL https://clawup.org/upload_openclaw_import.sh -o /tmp/upload_openclaw_import.sh
chmod +x /tmp/upload_openclaw_import.sh
/tmp/upload_openclaw_import.sh \
  --token <CLAWUP_BEARER_TOKEN> \
  --api-base https://api.clawup.org \
  --upload-id my-local-openclaw \
  --dir ~/.openclaw
```

### Detailed Examples

Example A: upload local directory `/tmp/.openclaw` (recommended).

```bash
curl -fsSL https://clawup.org/upload_openclaw_import.sh -o /tmp/upload_openclaw_import.sh
chmod +x /tmp/upload_openclaw_import.sh

/tmp/upload_openclaw_import.sh \
  --token <CLAWUP_BEARER_TOKEN> \
  --api-base https://api.clawup.org \
  --upload-id restore-from-tmp-openclaw \
  --dir /tmp/.openclaw
```

Example B: upload existing tar.

```bash
/tmp/upload_openclaw_import.sh \
  --token <CLAWUP_BEARER_TOKEN> \
  --api-base https://api.clawup.org \
  --upload-id restore-from-root-openclaw \
  --tar /tmp/openclaw.tar
```

Flow:

1. Request upload ticket from backend.
2. Upload tar directly to OSS via signed URL.
3. Complete upload confirmation.
4. In **Create Claw**:
   - expand the **Advanced** section
   - choose **Restore Source = Restore From Uploaded Backup**
   - select uploaded `upload_id`
   - select uploaded `version_id`
   - if your account has deploy-account whitelist, select `Deploy Account` (`node` or assigned account)
5. Create claw and wait for status `running`.

### Deploy Account Whitelist

Node admin can manage per-user deploy account under **Settings -> Users**:

- default user: only `node` is available
- allowlisted user: can choose `node` plus assigned account during Create Claw

# DEPUKO environment and provider setup

This guide lists the environment variables declared by the repository, what currently consumes them, and where to configure them. It deliberately separates active production settings from reserved integration placeholders.

## Current hosted services

- API and PostgreSQL: Railway project **DEPUKO**, production environment.
- Customer web: Vercel project **depuko-platform-mainnn**.
- Admin web: Vercel project **depuko-admin**.
- Production API base URL: `https://depuko-api-production.up.railway.app/api/v1`.
- Customer production origin: `https://depuko-platform-mainnn.vercel.app`.
- Admin production origin: `https://depuko-admin.vercel.app`.

## Environment variables

| Variable | Where | Required? | Purpose / current status |
|---|---|---:|---|
| `DATABASE_URL` | Railway API; local .env | Yes | PostgreSQL connection. Railway service reference should point to the Postgres service's `DATABASE_URL`. |
| `NODE_ENV` | Railway API / local | Yes | Runtime mode; production should be `production`. |
| `PORT` / `API_PORT` | Railway API / local | Platform supplies `PORT`; optional local API port | API listens on `API_PORT`, then `PORT`, then 4000. |
| `CORS_ORIGINS` | Railway API | Yes for hosted web clients | Comma-separated exact browser origins. Current known origins are Customer and Admin Vercel production domains. |
| `OPENAI_API_KEY` | Railway API only | Required for live AI | Server-side OpenAI key. In hosted Railway it is mapped from the already stored shared variable `OPEN_AI_KEY`; do not expose to browser or commit it. |
| `OPENAI_MODEL` | Railway API | Recommended | Responses API model ID; production default set to `gpt-6.2-astra`. |
| `AI_PROVIDER_API_KEY` | Railway API / local | Optional legacy alias | Adapter fallback name retained for compatibility. Prefer `OPENAI_API_KEY`. |
| `NEXT_PUBLIC_API_BASE_URL` | Each Vercel web project | Yes | Public API base URL. Set to `https://depuko-api-production.up.railway.app/api/v1` for Customer and Admin. |
| `EXPO_PUBLIC_API_BASE_URL` | Expo build environment | When building Worker mobile | Public API base URL for the mobile app; same API URL, no secret. |
| `FRONTEND_URL` | Railway API | Optional legacy fallback | Used only when `CORS_ORIGINS` is absent. Prefer `CORS_ORIGINS`. |
| `DEPUKO_DB_PASSWORD` | Local/staging DB provisioning | Local/staging only | Password placeholder for provisioning a dedicated database; not a substitute for Railway's generated Postgres credentials. |
| `PAYMENT_PROVIDER_SECRET` | Railway API | Reserved / keep empty | Payment-provider secret. Do not configure or enable real payments until webhook settlement, idempotency, refunds and sandbox verification are repaired and signed off. |
| `PAYOUT_PROVIDER_SECRET` | Railway API | Reserved / keep empty | Payout-provider credential. Payout execution is not production-approved. |
| `EMAIL_PROVIDER_API_KEY` | Railway API | Optional / not yet integrated | Reserved for a transactional email provider. |
| `SMS_PROVIDER_API_KEY` | Railway API | Optional / not yet integrated | Reserved for an SMS provider. |
| `STORAGE_ENDPOINT` | Railway API | Reserved / not yet integrated | Private S3-compatible object-storage endpoint. |
| `STORAGE_BUCKET` | Railway API | Reserved / not yet integrated | Private bucket name; template default is `depuko-private`. |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Railway API | Reserved / not yet integrated | Private object-storage credentials. |
| `FILE_SCANNER_ENDPOINT` / `FILE_SCANNER_API_KEY` | Railway API | Reserved / not yet integrated | Malware/content scanner. Uploaded files must remain quarantined until the scanner is implemented and tested. |

## Dashboard links

- Railway project: https://railway.com/project/1e0347d0-77c1-400a-abce-72360cb24135
- Railway API service: https://railway.com/project/1e0347d0-77c1-400a-abce-72360cb24135/service/9072b2f2-b9e6-4b4b-b0b1-b6f53101c1cb
- Railway Postgres service: https://railway.com/project/1e0347d0-77c1-400a-abce-72360cb24135/service/815029a1-5f57-4714-ac97-fc341d3235c5
- Vercel Customer project: https://vercel.com/olivier10/depuko-platform-mainnn
- Vercel Admin project: https://vercel.com/olivier10/depuko-admin
- OpenAI API keys: https://platform.openai.com/api-keys
- OpenAI API billing: https://platform.openai.com/settings/organization/billing/overview
- OpenAI model catalog: https://developers.openai.com/api/docs/models
- Resend (email provider option): https://resend.com/
- Twilio (SMS provider option): https://www.twilio.com/
- Cloudflare R2 (private object-storage option): https://developers.cloudflare.com/r2/
- Cloudflare account: https://dash.cloudflare.com/

Provider accounts and credentials are owner-managed. Do not paste secrets into GitHub, public chat, source files, or any `NEXT_PUBLIC_*` variable.

## How to configure hosted values

### Railway API
1. Open the Railway API service link above.
2. Open **Variables** for the **production** environment.
3. Confirm `OPENAI_API_KEY` exists as a reference to the environment shared variable `OPEN_AI_KEY`; the secret value must remain hidden.
4. Confirm `OPENAI_MODEL=gpt-6.2-astra`.
5. Set `CORS_ORIGINS` to the comma-separated Customer and Admin production origins listed above.
6. Confirm `DATABASE_URL` references the Railway Postgres service; do not replace it with a local URL.
7. Save/apply and wait until the API deployment is **SUCCESS**. Then check `https://depuko-api-production.up.railway.app/api/v1/health` and run an authenticated test chat request.

### Vercel Customer and Admin
1. Open each Vercel project link.
2. Go to **Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_API_BASE_URL` to `https://depuko-api-production.up.railway.app/api/v1` for Production and Preview (Development too if desired).
4. Redeploy after changing a Vercel variable.

### Local development
1. Copy `.env.example` to `.env` at repository root.
2. Put local-only PostgreSQL credentials in `DATABASE_URL`.
3. Add your OpenAI key to `OPENAI_API_KEY` only if you want live local AI.
4. Install Node.js 20+, Corepack/pnpm 9, then run `pnpm install --no-frozen-lockfile`.
5. Never commit `.env`.

## Important release blockers

The current source audit records that full API/web typechecks, Jest, PostgreSQL migrations, HTTP E2E, Playwright, Expo and Docker staging were not completed. The payment webhook has a known settlement/idempotency gap. Business portal currently asks for an organization ID rather than routing from a verified authenticated membership; Admin UI still asks for a session token manually; Worker web covers only a limited assignment loop. Do not treat the project as fully launch-ready or enable real-money payments until those flows are implemented and tested.

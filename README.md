# Freshdesk Admin Express

Freshdesk custom app (ticket sidebar) that reads requester email and fetches matching Freshsales records with full account details.

## Current scope

- Ticket sidebar placement
- Reads requester email from ticket context via `client.data.get("requester")`
- Queries Freshsales via a Vercel serverless API (replaces FDK serverless)
- Filters results to specific record types only (Recipient, Admin User, Login Admin)
- Deduplicates matches by mailbox ID
- Agent selects from dropdown; app displays full contact details
- Match/No Match badge in header

## Architecture

The Freshdesk app (FDK) calls a **Vercel API** (`api/lookup.js`) which handles the Freshsales lookup server-side. Freshsales credentials live in Vercel environment variables — never exposed to the frontend.

```
Freshdesk sidebar (app.js)
  → fetch → Vercel API (api/lookup.js)
    → Freshsales CRM API (/crm/sales/api/lookup)
```

## Project structure

```
app/               Freshdesk sidebar app (HTML/CSS/JS)
api/lookup.js      Vercel serverless function
config/            FDK iparams and request templates
server/server.js   FDK serverless stub (unused, kept for FDK validation)
manifest.json      FDK app manifest
vercel.json        Vercel config
```

## Vercel environment variables

| Variable | Description |
|---|---|
| `FRESHSALES_DOMAIN` | Freshsales domain e.g. `ipostal1-org.myfreshworks.com` |
| `FRESHSALES_API_KEY` | Freshsales API token |

## Freshsales API

- **Endpoint:** `GET /crm/sales/api/lookup?q={email}&f=email&entities=contact&include=sales_accounts`
- **Response structure:** `body.contacts.contacts[]` (double-nested)
- **Record type filtering:** Results are filtered to allowed `record_type_id` values (stored as strings)

### Allowed record type IDs

| Type | ID |
|---|---|
| Recipient | `18011960006` |
| Admin User | `18011960334` |
| Login Admin | `18011270036` |

## Freshsales custom fields expected on contacts

| Field | Description |
|---|---|
| `cf_mailbox_id` | Unique mailbox identifier |
| `cf_mailbox_number` | Mailbox number |
| `cf_mailbox_plan` | Plan name |
| `cf_plan_start_date` | Plan start date |
| `cf_plan_expiry_date` | Plan expiry date |
| `cf_mailbox_account_status` | Mailbox account status |

Linked sales accounts should have:
- `cf_mc_features` — Mail center features (semicolon-delimited)
- `address`, `city`, `state`, `zipcode` — Mail center address
- `phone` — Mail center phone

## Run locally

Requires Node 18. Use fnm to switch:
```
fnm use 18
fdk run
```
Then open a Freshdesk ticket and append `?dev=true` to the URL.

## Known issues / notes

- `client.interface.trigger("resize")` to expand sidebar height does not work in the `dev=true` test environment — expected to work once properly installed
- FDK `client.request.invoke` (SMI) does not work reliably on platform 2.x; Vercel API is the workaround
- The `vercelLookup` request template in `requests.json` shows a "not associated with product" warning — harmless, not used at runtime
- Multiple contact records can share the same email across different record types; filtering by `record_type_id` handles this

---

## Session log

### 2026-05-15
- Scaffolded initial FDK app
- Fixed `iparams.json` format (object format with `display_name`)
- Fixed requester email source: `client.data.get("requester")` not `ticket`
- Fixed `exports = {}` format for FDK serverless (platform 2.x requirement)
- Disabled global apps in FDK config

### 2026-05-19
- Diagnosed FDK SMI (server method invocation) as unreliable on platform 2.x
- Switched to Vercel serverless API architecture
- Discovered correct Freshsales lookup endpoint: `/crm/sales/api/lookup?q=&f=email&entities=contact`
- Fixed nested response parsing: `body.contacts.contacts[]`
- Added record type filtering (Recipient / Admin User / Login Admin only)
- Added Match/No Match badge to header
- Compacted UI for better fit in narrow sidebar
- Attempted sidebar height resize via `client.interface.trigger` — not functional in dev mode

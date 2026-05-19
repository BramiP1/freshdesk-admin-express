# Freshdesk Freshsales Matcher

Freshdesk custom app (ticket sidebar) that reads requester email and fetches matching Freshsales mailbox records with full account details.

## Current scope

- Serverless architecture
- Ticket sidebar placement
- Read-only results, multi-match selector for agent choice
- Displays plan, mailbox status, MC features, store address/phone, and more
- No raw email in server logs

## How it works

1. App reads requester email from Freshdesk ticket context
2. Queries Freshsales `/crm/sales/api/lookup` endpoint by email
3. Displays all matching contact records (multiple mailboxes per customer)
4. Agent selects one; app displays full mailbox details including:
   - Plan (cf_mailbox_plan)
   - Plan dates (cf_plan_start_date, cf_plan_expiry_date)
   - Mailbox status (cf_mailbox_account_status)
   - Mail center details (from linked sales_accounts)
   - MC features (cf_mc_features)

## Project structure

- manifest.json
- config/iparams.json
- config/requests.json
- app/index.html
- app/styles/style.css
- app/scripts/app.js
- server/server.js
- app/assets/icon.svg

## Required iparams

- `freshsales_domain` — Your Freshsales domain (e.g., ipostal1-org.myfreshworks.com)
- `freshsales_api_key` — Freshsales API token (used only in serverless functions)

## Freshsales custom fields

The app expects these fields on Freshsales contacts:

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

1. Install Freshworks CLI (FDK) globally: `npm install -g fdk`
2. In this folder, run `fdk validate`
3. Run `fdk run`
4. Install app into your Freshdesk test account and configure iparams during installation

## Notes

- Multiple contact records can share the same email; the app shows all unique mailbox IDs
- Deduplication is done by `cf_mailbox_id`
- Server-side logging redacts the requester email for privacy


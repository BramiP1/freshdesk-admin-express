# Freshdesk Admin Express

Freshdesk custom app (ticket sidebar) that reads the requester's email, looks them up in Freshsales, and displays their mailbox and mail center details.

## What it does

- Shows a compact **Match / No Match** badge in the ticket sidebar
- If matched, shows a mailbox selector dropdown (by name + POB #) and a quick summary (Mailbox ID + 1583 Status)
- **"View Full Details"** button opens a full-size modal with all customer and mail center info
- Modal has a **Close** button to dismiss it

## Architecture

The Freshdesk FDK app makes a direct `fetch` call to a **Vercel serverless API** which handles all Freshsales communication. Credentials never touch the frontend.

```
Freshdesk sidebar (app.js / modal.js)
  → fetch → Vercel API (api/lookup.js)
    → Freshsales: /crm/sales/api/lookup        (find contact by email)
    → Freshsales: /crm/sales/api/contacts/{id} (get full contact + custom fields)
    → Freshsales: /crm/sales/api/sales_accounts/{id} (get full account data)
```

> **Why Vercel?** FDK's built-in server method invocation (SMI) is unreliable on platform 2.x/3.x. Vercel gives a stable, independently deployable backend.

## Project structure

```
app/
  index.html          Sidebar UI (compact summary + "View Full Details" button)
  modal.html          Full details modal
  scripts/app.js      Sidebar logic
  scripts/modal.js    Modal logic (does its own Freshsales lookup)
  styles/style.css    Shared styles
api/
  lookup.js           Vercel serverless function — queries Freshsales
config/
  requests.json       FDK request template (declared but not used at runtime)
manifest.json         FDK app manifest (platform 3.0)
vercel.json           Vercel routing config
```

## Fields displayed

### Customer Info
| Label | Freshsales field | Source |
|---|---|---|
| Mailbox ID | `cf_mailbox_id` | `contact.custom_field` |
| POB # | `cf_mailbox_number` | `contact.custom_field` |
| Plan | `cf_mailbox_plan` | `contact.custom_field` |
| Plan Start | `cf_plan_start_date` | `contact.custom_field` |
| 1583 Status | `cf_1583_doc_status` | `contact.custom_field` (color coded) |

### Mail Center (from linked sales account)
| Label | Freshsales field |
|---|---|
| Name | `sales_account.name` |
| Phone | `sales_account.phone` |
| Address | `address + city + state + zipcode` |

**1583 Status color coding:** green = Approved, yellow = Pending, red = No Docs

### Record type filtering
Only these `record_type_id` values are shown:

| Type | ID |
|---|---|
| Recipient | `18011960006` |
| Admin User | `18011960334` |
| Login Admin | `18011270036` |

## Vercel environment variables

Set these in the Vercel dashboard under Project → Settings → Environment Variables:

| Variable | Example value |
|---|---|
| `FRESHSALES_DOMAIN` | `ipostal1-org.myfreshworks.com` |
| `FRESHSALES_API_KEY` | your Freshsales API token |

## Run locally

```
fdk run
```

Then open a Freshdesk ticket and append `?dev=true` to the URL to load the local app.

> **Note:** Node version check in FDK has been bypassed (patched in `node_modules/fdk/lib/cli/index.js`) to allow Node 24. If you reinstall FDK you'll need to re-apply the patch or use Node 18.

## Deploy to Vercel

```
vercel --prod --scope bram-corregans-projects
```

## Pack for Freshdesk upload

```
fdk pack --skip-coverage --skip-lint
```

Upload `dist/Freshdesk Admin Express.zip` via Freshdesk Admin → Apps → Custom Apps.

## Known gotchas

- **`custom_field` not `custom_fields`** — Freshsales returns contact custom fields under `custom_field` (singular). Using the wrong key returns an empty object.
- **`/lookup` returns partial data** — The Freshsales lookup endpoint doesn't return full contact or account data. The API makes follow-up calls to `/contacts/{id}` and `/sales_accounts/{id}` to get complete records.
- **Modal close** — Use `client.instance.close()` inside the modal to close it. `client.interface.trigger("closeModal")` does NOT work.
- **Modal data passing** — The `data` attribute in `showModal` is not supported. The modal does its own independent lookup.
- **Sidebar height cap** — Freshdesk enforces a ~300px max height on ticket sidebar apps. The modal is the workaround for displaying full details.
- **`vercelLookup` template warning** — FDK warns the request template isn't associated with a module. This is harmless — it's not used at runtime.
- **`fdk config set global_apps.enabled true`** — Required once for platform 3.0 support.

---

## Session log

### 2026-05-15
- Scaffolded initial FDK app
- Fixed iparams.json format and requester email source

### 2026-05-19
- Diagnosed FDK SMI as unreliable, switched to Vercel serverless architecture
- Discovered correct Freshsales lookup endpoint and nested response structure
- Added record type filtering and Match/No Match badge
- Compacted UI for sidebar

### 2026-05-21
- Wired up correct Freshsales custom field names
- Fixed Status field name (`cf_1583_doc_status`)
- Added Mail Center Name from linked sales account
- Cleaned up displayed fields

### 2026-05-27
- Fixed `custom_field` (singular) key — was reading `custom_fields` (plural), causing all custom fields to return empty
- Fixed account data (phone/address/name) — `/lookup` returns partial accounts; now fetches full account via `/sales_accounts/{id}`
- Fixed contact data — now fetches full contact via `/contacts/{id}?include=sales_accounts`
- Fixed Freshsales contact URL (was `uszoom.myfreshworks.com`, now `ipostal1-org.myfreshworks.com`)
- Added POB # field (`cf_mailbox_number`) to mailbox selector and modal
- Stripped timestamp from Plan Start Date display
- Renamed "Status" to "1583 Status", added color-coded badge
- Upgraded manifest to platform 3.0 (`modules.support_ticket` replaces `product.freshdesk`)
- Added modal flow: sidebar shows compact summary, "View Full Details" opens full modal
- Modal close works via `client.instance.close()`

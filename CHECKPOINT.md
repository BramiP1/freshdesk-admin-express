# Checkpoint - 2026-06-02

## What we did today

### UI Changes
- Removed "Freshsales Account" header text from sidebar
- Changed "View Full Details" and "Recipient Lookup" buttons to #005EB8
- Renamed "Open in Freshsales" link to "Recipient Lookup", powered by `cf_link_to_customer_in_admin`
- Replaced green "Match" badge with `cf_mailbox_account_status` value (color coded: Active=green, Inactive=red, blank if empty)
- "No Match" red badge still shows when no Freshsales record found

### New Features
- **Modal** (`modal.html` / `modal.js`) — full customer details view with all fields, close button using `client.instance.close()`
- **Ticket counts** — Open and Lifetime ticket counts shown in both sidebar and modal, fetched via new `api/tickets.js` Vercel endpoint using `GET /api/v2/tickets?email=`
- **Auto-refresh on ticket navigation** — sidebar polls every 800ms for ticket ID change and re-runs lookup when agent navigates to a new ticket

### Architecture Notes
- `client.request.get()` and `client.request.invokeTemplate()` are both broken in FDK platform 3.0 — use plain `fetch()` instead
- `client.events.subscribe()` also not available — polling workaround used for ticket navigation detection
- Freshdesk ticket counts routed through Vercel (`api/tickets.js`) — requires `FRESHDESK_DOMAIN` and `FRESHDESK_API_KEY` env vars in Vercel

### Current Field Mapping (api/lookup.js)
| Display | Freshsales Field | Source |
|---|---|---|
| Mailbox ID | `cf_mailbox_id` | contact.custom_field |
| POB # | `cf_mailbox_number` | contact.custom_field |
| Plan | `cf_mailbox_plan` | contact.custom_field |
| Plan Start | `cf_plan_start_date` | contact.custom_field |
| 1583 Status | `cf_1583_doc_status` | contact.custom_field |
| Account Status | `cf_mailbox_account_status` | contact.custom_field |
| Recipient Lookup URL | `cf_link_to_customer_in_admin` | contact.custom_field |
| MC Name | `name` | sales_accounts[0] |
| Phone | `phone` | sales_accounts[0] |
| Address | `address + city + state + zipcode` | sales_accounts[0] |

## Next Step
Investigate pulling email history from Freshsales into the app.
- Freshsales API endpoint to research: `GET /crm/sales/api/contacts/{id}/emails` or similar
- Goal: display recent email correspondence with the contact inside the modal

---

# Checkpoint - 2026-07-02

## What we did today

### UI Changes
- Added Mail Center email (`cf_pms_email`, account custom field) to the modal's MAIL CENTER block
- Added Mail Center Status (`cf_21_store_status`, account custom field) to the modal's MAIL CENTER block, color coded like 1583 Status (Online=green, Transfer=yellow, Offline=red)
- Removed Mailbox ID from the front-facing sidebar view (still shown in the modal)
- Removed 1583 Status row from the sidebar's info table; moved it into the header as a color-coded badge on the right side, opposite the account status badge on the left
- Added `.ticket-alert` styling (red, bold) to the Open Tickets value whenever the count is greater than 1 — applied in both the sidebar and the modal
- Added Company Name (`cf_business_name`) to the modal's Customer Info section — row is hidden when the contact has no business name
- Added Expiry Date (`cf_plan_expiry_date`) to the modal's Customer Info section

### New Features
- Esc key now closes the modal (in addition to the existing Close button), via a `keydown` listener calling `client.instance.close()`

### Security Hardening (added concurrently, not part of the above feature work)
- `api/lookup.js` and `api/tickets.js`: added optional origin allow-listing — if `ALLOWED_ORIGIN` env var is set, requests from any other `Origin` header are rejected with 403; otherwise CORS falls back to `*` as before
- `api/lookup.js` and `api/tickets.js`: added email format validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) before querying Freshsales/Freshdesk, rejecting malformed input with 400
- `app/index.html` and `app/modal.html`: added a Content-Security-Policy meta tag — `default-src 'none'; script-src 'self' 'unsafe-eval' https://static.freshdev.io; style-src 'self'; connect-src https://freshdesk-admin-express.vercel.app; img-src 'self' data:; frame-ancestors https://*.freshdesk.com;`
- `app/scripts/modal.js`: added `safeHref()` to sanitize the "Recipient Lookup" link — only allows `https:` URLs through, otherwise falls back to `#`

### Bug Fix — CSP broke the app entirely
- The initial CSP (above, before `'unsafe-eval'` was added) blocked the Freshworks FDK client library (`fresh_client.js`), which relies on `eval()`/`new Function()` internally — this crashed the app on load with `Uncaught EvalError` and nothing rendered. Fixed by adding `'unsafe-eval'` to `script-src` (required by the FDK SDK itself, not optional).
- `app/modal.html` had an inline `style="..."` attribute on the match-select dropdown, which `style-src 'self'` (no `'unsafe-inline'`) would have silently blocked. Moved it to a `.modal-match-select` class in `style.css` instead of loosening the CSP further.
- Found via local FDK testing (`fdk run` + `?dev=true` on a live ticket) — verify CSP changes this way before every deploy, since CSP violations don't show up as build errors.

### Current Field Mapping (api/lookup.js)
| Display | Freshsales Field | Source |
|---|---|---|
| Company Name | `cf_business_name` | contact.custom_field |
| Mailbox ID | `cf_mailbox_id` | contact.custom_field |
| POB # | `cf_mailbox_number` | contact.custom_field |
| Plan | `cf_mailbox_plan` | contact.custom_field |
| Plan Start | `cf_plan_start_date` | contact.custom_field |
| Expiry Date | `cf_plan_expiry_date` | contact.custom_field |
| 1583 Status | `cf_1583_doc_status` | contact.custom_field |
| Account Status | `cf_mailbox_account_status` | contact.custom_field |
| Recipient Lookup URL | `cf_link_to_customer_in_admin` | contact.custom_field |
| MC Name | `name` | sales_accounts[0] |
| MC Status | `cf_21_store_status` | sales_accounts[0].custom_field |
| MC Email | `cf_pms_email` | sales_accounts[0].custom_field |
| Phone | `phone` | sales_accounts[0] |
| Address | `address + city + state + zipcode` | sales_accounts[0] |

## Next Step
Investigate pulling email history from Freshsales into the app.
- Freshsales API endpoint to research: `GET /crm/sales/api/contacts/{id}/emails` or similar
- Goal: display recent email correspondence with the contact inside the modal

---

# Checkpoint - 2026-07-08

## What we did today

### UI Changes
- Added **Account Status** row to the modal's Customer Info section (`cf_mailbox_account_status`), color coded: Active=green, Inactive=red, Expired=yellow
- Added **Store Type** row to the modal's Mail Center section, below Name (`cf_store_type_new`, sales_accounts[0].custom_field)
- Sidebar's mailbox dropdown label now shows the customer's name instead of static "Select a mailbox" text; dropdown options simplified to just `POB: <number>` (name removed since it's now shown as the label)
- Removed **Lifetime Tickets** row from the sidebar view — still shown in the modal, still fetched under the hood (used for the modal), just not rendered in the sidebar
- **Pending Tickets** now counts multiple Freshdesk statuses instead of just status `3` — added custom statuses `6, 7, 8, 9, 10, 11, 12` (client's Freshdesk instance uses several custom "waiting on X" statuses beyond the default four)

### Investigated, not resolved
- **Business Name** (`cf_business_name`) still shows blank/hidden in testing — the code path is confirmed correct (reads `contact.custom_field.cf_business_name`, hides the row cleanly when empty). Likely cause: the test contact doesn't actually have a value in that field in Freshsales, not a code bug. Needs a contact with real data to confirm, or verification of the exact internal field key via Freshsales admin.

### Process Notes
- Local FDK server (`fdk run` via `?dev=true`) stays running across sessions on port 10001 — reused instead of restarting for each round of changes
- Repacked and reuploaded the app after front-end changes: `fdk pack --skip-coverage` outputs `dist/Freshdesk Admin Express.zip`. Remember — **API changes** (`api/lookup.js`, `api/tickets.js`) deploy via `git push` to Vercel; **front-end changes** (`app/*`) require a fresh `fdk pack` + manual reupload to Freshdesk. They are separate deploy paths and both are needed when a change touches both sides.
- `fdk pack`/`fdk run` prompt interactively about CLI version updates on every invocation — pipe `echo n |` in front of the command to avoid it hanging non-interactive sessions

### Current Field Mapping (api/lookup.js)
| Display | Freshsales Field | Source |
|---|---|---|
| Company Name | `cf_business_name` | contact.custom_field |
| Mailbox ID | `cf_mailbox_id` | contact.custom_field |
| POB # | `cf_mailbox_number` | contact.custom_field |
| Plan | `cf_mailbox_plan` | contact.custom_field |
| Plan Start | `cf_plan_start_date` | contact.custom_field |
| Expiry Date | `cf_plan_expiry_date` | contact.custom_field |
| 1583 Status | `cf_1583_doc_status` | contact.custom_field |
| Account Status | `cf_mailbox_account_status` | contact.custom_field |
| Recipient Lookup URL | `cf_link_to_customer_in_admin` | contact.custom_field |
| MC Name | `name` | sales_accounts[0] |
| MC Store Type | `cf_store_type_new` | sales_accounts[0].custom_field |
| MC Status | `cf_21_store_status` | sales_accounts[0].custom_field |
| MC Email | `cf_pms_email` | sales_accounts[0].custom_field |
| Phone | `phone` | sales_accounts[0] |
| Address | `address + city + state + zipcode` | sales_accounts[0] |

### Pending Ticket Status IDs (api/tickets.js)
| ID | Meaning |
|---|---|
| 2 | Open (counted separately) |
| 3 | Pending (default) |
| 6-12 | Custom "waiting on X" statuses, all counted as Pending |

## Next Step
- Confirm the correct internal field key / test data for Business Name (`cf_business_name`)
- Investigate pulling email history from Freshsales into the app.
  - Freshsales API endpoint to research: `GET /crm/sales/api/contacts/{id}/emails` or similar
  - Goal: display recent email correspondence with the contact inside the modal

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

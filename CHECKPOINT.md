# Checkpoint - 2026-05-15

## What we did
- Fixed `iparams.json` — converted from old array format to object format with `display_name`
- Fixed `app.js` — changed from `client.data.get("ticket")` to `client.data.get("requester")` to correctly pull the requester email
- Disabled global apps in fdk config (`fdk config set global_apps.enabled false`)
- Confirmed `fdk run` starts cleanly on Node 18 via fnm

## Where we stopped
The app loads and gets the requester email correctly, but the Freshsales lookup fails because the **iparams have not been configured** in the local test environment.

## Next step (first thing tomorrow)
1. Start the server: `fnm use 18 && fdk run`
2. Go to **http://localhost:10001/custom_configs**
3. Fill in:
   - **Freshsales domain** — e.g. `yourcompany.myfreshworks.com`
   - **Freshsales API key** — your Freshsales API key
4. Open a ticket in Freshdesk with `?dev=true` appended to the URL and test the sidebar

## Known warnings (non-blocking)
- Request templates `freshsalesLookup` / `freshsalesContactById` show "not associated with product" — this is a cosmetic warning for platform 2.x, doesn't affect runtime
- Several lint warnings in `app.js` and `server.js` (complexity, const usage) — fine to ignore for now

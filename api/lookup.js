module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const email = (req.query.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ status: "error", message: "Email is required" });
  }

  const domain = process.env.FRESHSALES_DOMAIN;
  const apiKey = process.env.FRESHSALES_API_KEY;

  if (!domain || !apiKey) {
    return res.status(500).json({ status: "error", message: "Server misconfigured" });
  }

  const headers = {
    Authorization: `Token token=${apiKey}`,
    "Content-Type": "application/json"
  };

  try {
    const lookupUrl = `https://${domain}/crm/sales/api/lookup?q=${encodeURIComponent(email)}&f=email&entities=contact&include=sales_accounts`;
    const response = await fetch(lookupUrl, { headers });

    let body = {};
    try { body = await response.json(); } catch (e) { body = {}; }

    const allowedRecordTypes = new Set(["18011960006", "18011960334", "18011270036"]);
    const allContacts = Array.isArray(body.contacts && body.contacts.contacts) ? body.contacts.contacts : [];
    const contacts = allContacts.filter(c => allowedRecordTypes.has(String(c.record_type_id)));

    if (contacts.length === 0) {
      return res.json({ status: "ok", matches: [] });
    }

    const uniqueByMailbox = new Map();
    contacts.forEach((contact) => {
      const mbId = (contact.custom_fields && contact.custom_fields.cf_mailbox_id) || String(contact.id);
      if (!uniqueByMailbox.has(mbId)) {
        uniqueByMailbox.set(mbId, contact);
      }
    });

    // Fetch full contact details (custom_fields) and full account details (phone/address) in parallel
    const contactIds = Array.from(uniqueByMailbox.values()).map(c => c.id);
    const accountIds = new Set();
    uniqueByMailbox.forEach((contact) => {
      const accounts = Array.isArray(contact.sales_accounts) ? contact.sales_accounts : [];
      if (accounts.length > 0 && accounts[0].id) accountIds.add(accounts[0].id);
    });

    const [contactMap, accountMap] = await Promise.all([
      Promise.all(contactIds.map(async (contactId) => {
        try {
          const r = await fetch(`https://${domain}/crm/sales/api/contacts/${contactId}?include=sales_accounts`, { headers });
          const b = await r.json();
          return b && b.contact ? [contactId, b.contact] : null;
        } catch (e) { return null; }
      })).then(results => Object.fromEntries(results.filter(Boolean))),

      Promise.all(Array.from(accountIds).map(async (accountId) => {
        try {
          const r = await fetch(`https://${domain}/crm/sales/api/sales_accounts/${accountId}`, { headers });
          const b = await r.json();
          return b && b.sales_account ? [accountId, b.sales_account] : null;
        } catch (e) { return null; }
      })).then(results => Object.fromEntries(results.filter(Boolean)))
    ]);

    const matches = Array.from(uniqueByMailbox.values()).map(contact => {
      const fullContact = contactMap[contact.id] || contact;
      return normalizeContact(fullContact, accountMap);
    });
    return res.json({ status: "ok", matches });
  } catch (error) {
    console.error("Freshsales lookup failed:", error.message);
    return res.status(500).json({ status: "error", message: "Freshsales lookup failed" });
  }
};

function normalizeContact(contact, accountMap) {
  const id = contact.id || "";
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  const cf = contact.custom_field || {};

  const partialAccount = Array.isArray(contact.sales_accounts) ? contact.sales_accounts[0] : null;
  const account = (partialAccount && accountMap[partialAccount.id]) || partialAccount || null;

  const storeAddress = account
    ? [account.address, account.city, account.state, account.zipcode]
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    id,

    name: fullName || contact.display_name || "Unnamed contact",
    email: contact.email || "",
    mailboxId: cf.cf_mailbox_id || "",
    mailboxNumber: cf.cf_mailbox_number || "",
    plan: cf.cf_mailbox_plan || "",
    planStartDate: (cf.cf_plan_start_date || "").split("T")[0],
    status: cf.cf_1583_doc_status || "",
    accountStatus: cf.cf_mailbox_account_status || "",
    mcName: (account && account.name) || "",
    storeAddress,
    storePhone: (account && account.phone) || "",
    url: id ? `https://ipostal1-org.myfreshworks.com/crm/sales/contacts/${id}` : "",
    adminLink: cf.cf_link_to_customer_in_admin || ""
  };
}

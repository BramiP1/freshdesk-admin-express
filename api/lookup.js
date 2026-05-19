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

  try {
    const url = `https://${domain}/crm/sales/api/lookup?q=${encodeURIComponent(email)}&f=email&entities=contact&include=sales_accounts`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Token token=${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    const rawText = await response.text();
    console.log("Freshsales status:", response.status);
    console.log("Freshsales raw:", rawText.slice(0, 500));

    let body = {};
    try { body = JSON.parse(rawText); } catch (e) { body = {}; }

    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    if (contacts.length === 0) {
      return res.json({ status: "ok", matches: [], _debug: { httpStatus: response.status, raw: rawText.slice(0, 300), emailReceived: email } });
    }

    const uniqueByMailbox = new Map();
    contacts.forEach((contact) => {
      const mbId = (contact.custom_fields && contact.custom_fields.cf_mailbox_id) || String(contact.id);
      if (!uniqueByMailbox.has(mbId)) {
        uniqueByMailbox.set(mbId, contact);
      }
    });

    const matches = Array.from(uniqueByMailbox.values()).map(normalizeContact);
    return res.json({ status: "ok", matches });
  } catch (error) {
    console.error("Freshsales lookup failed:", error.message);
    return res.status(500).json({ status: "error", message: "Freshsales lookup failed" });
  }
};

function normalizeContact(contact) {
  const id = contact.id || "";
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  const cf = contact.custom_fields || {};
  const linkedAccount = Array.isArray(contact.sales_accounts) ? contact.sales_accounts[0] : null;

  const storeAddress = linkedAccount
    ? [linkedAccount.address, linkedAccount.city, linkedAccount.state, linkedAccount.zipcode]
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
    planStartDate: cf.cf_plan_start_date || "",
    planExpiryDate: cf.cf_plan_expiry_date || "",
    status: cf.cf_mailbox_account_status || "",
    mcFeatures: (linkedAccount && linkedAccount.custom_fields && linkedAccount.custom_fields.cf_mc_features) || "",
    storeAddress,
    storePhone: (linkedAccount && linkedAccount.phone) || "",
    url: id ? `https://uszoom.myfreshworks.com/crm/sales/contacts/${id}` : ""
  };
}

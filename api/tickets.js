module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ status: "error", message: "Method not allowed" });

  const email = (req.query.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ status: "error", message: "Email is required" });

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) return res.status(500).json({ status: "error", message: "Server misconfigured" });

  const auth = "Basic " + Buffer.from(apiKey + ":X").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  try {
    const contactRes = await fetch(`https://${domain}/api/v2/contacts?email=${encodeURIComponent(email)}`, { headers });
    const contacts = await contactRes.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.json({ status: "ok", open: 0, lifetime: 0, _debug: { contactsRaw: contacts } });
    }

    const contact = contacts[0];
    const openRes = await fetch(
      `https://${domain}/api/v2/tickets?requester_id=${contact.id}&status=2&per_page=100`,
      { headers }
    );
    const openTickets = await openRes.json();

    return res.json({
      status: "ok",
      open: Array.isArray(openTickets) ? openTickets.length : 0,
      lifetime: contact.tickets_count || 0
    });
  } catch (error) {
    console.error("Freshdesk tickets lookup failed:", error.message);
    return res.status(500).json({ status: "error", message: "Freshdesk lookup failed" });
  }
};

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin || "";

  if (allowedOrigin) {
    if (requestOrigin !== allowedOrigin) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ status: "error", message: "Method not allowed" });

  const email = (req.query.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ status: "error", message: "Email is required" });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ status: "error", message: "Invalid email format" });
  }

  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) return res.status(500).json({ status: "error", message: "Server misconfigured" });

  const auth = "Basic " + Buffer.from(apiKey + ":X").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  try {
    const ticketsRes = await fetch(
      `https://${domain}/api/v2/tickets?email=${encodeURIComponent(email)}&per_page=100`,
      { headers }
    );
    const tickets = await ticketsRes.json();

    if (!Array.isArray(tickets)) {
      return res.json({ status: "ok", open: 0, pending: 0, lifetime: 0 });
    }

    const open = tickets.filter(t => t.status === 2).length;
    const pending = tickets.filter(t => t.status === 3).length;

    return res.json({ status: "ok", open, pending, lifetime: tickets.length });
  } catch (error) {
    console.error("Freshdesk tickets lookup failed:", error.message);
    return res.status(500).json({ status: "error", message: "Freshdesk lookup failed" });
  }
};

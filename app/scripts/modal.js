const el = {
  closeBtn: document.getElementById("modalCloseBtn"),
loading: document.getElementById("modalLoading"),
  error: document.getElementById("modalError"),
  content: document.getElementById("modalContent"),
  matchSelect: document.getElementById("modalMatchSelect"),
  name: document.getElementById("modalName"),
  email: document.getElementById("modalEmail"),
  mailboxId: document.getElementById("modalMailboxId"),
  mailboxNumber: document.getElementById("modalMailboxNumber"),
  plan: document.getElementById("modalPlan"),
  planStartDate: document.getElementById("modalPlanStartDate"),
  status: document.getElementById("modalStatus"),
  mcName: document.getElementById("modalMcName"),
  mcPhone: document.getElementById("modalMcPhone"),
  mcAddress: document.getElementById("modalMcAddress"),
  openTickets: document.getElementById("modalOpenTickets"),
  lifetimeTickets: document.getElementById("modalLifetimeTickets"),
  link: document.getElementById("modalLink")
};

let matches = [];

async function fetchTicketCounts(email) {
  try {
    const res = await fetch(`https://freshdesk-admin-express.vercel.app/api/tickets?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.status !== "ok") return { open: "N/A", lifetime: "N/A" };
    return { open: String(data.open), lifetime: String(data.lifetime) };
  } catch (e) {
    return { open: "N/A", lifetime: "N/A" };
  }
}

function getStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("approved")) return "status-approved";
  if (s.includes("pending")) return "status-pending";
  if (s.includes("no doc")) return "status-nodocs";
  return "";
}

function renderMatch(match) {
  el.name.textContent = match.name || "Unnamed contact";
  el.email.textContent = match.email || "";
  el.mailboxId.textContent = match.mailboxId || "N/A";
  el.mailboxNumber.textContent = match.mailboxNumber || "N/A";
  el.plan.textContent = match.plan || "N/A";
  el.planStartDate.textContent = match.planStartDate || "N/A";

  const statusText = match.status || "N/A";
  el.status.textContent = statusText;
  const sc = getStatusClass(statusText);
  el.status.className = "info-value" + (sc ? " " + sc : "");

  el.mcName.textContent = match.mcName || "N/A";
  el.mcPhone.textContent = match.storePhone || "N/A";
  el.mcAddress.textContent = match.storeAddress || "N/A";
  el.link.href = match.adminLink || match.url || "#";
}

function renderMatches() {
  if (matches.length > 1) {
    el.matchSelect.innerHTML = "";
    matches.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${m.name || "Unnamed"} - POB: ${m.mailboxNumber || "N/A"}`;
      el.matchSelect.appendChild(opt);
    });
    el.matchSelect.classList.remove("hidden");
    el.matchSelect.addEventListener("change", (e) => renderMatch(matches[Number(e.target.value)]));
  }
  renderMatch(matches[0]);
  el.loading.classList.add("hidden");
  el.content.classList.remove("hidden");
}

async function boot() {
  try {
    const client = await app.initialized();
    el.closeBtn.addEventListener("click", () => client.instance.close());

    const requesterData = await client.data.get("requester");
    const email = (requesterData?.requester?.email || "").trim().toLowerCase();

    if (!email) throw new Error("Requester email is missing.");

    const [freshRes, ticketCounts] = await Promise.all([
      fetch(`https://freshdesk-admin-express.vercel.app/api/lookup?email=${encodeURIComponent(email)}`).then(r => r.json()),
      fetchTicketCounts(email)
    ]);

    if (!freshRes || freshRes.status !== "ok" || !freshRes.matches?.length) {
      throw new Error("No Freshsales matches found.");
    }

    matches = freshRes.matches;
    el.openTickets.textContent = ticketCounts.open;
    el.lifetimeTickets.textContent = ticketCounts.lifetime;
    renderMatches();
  } catch (err) {
    el.loading.classList.add("hidden");
    el.error.textContent = err.message || "Failed to load details.";
    el.error.classList.remove("hidden");
  }
}

boot();

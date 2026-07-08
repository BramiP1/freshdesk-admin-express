const el = {
  closeBtn: document.getElementById("modalCloseBtn"),
loading: document.getElementById("modalLoading"),
  error: document.getElementById("modalError"),
  content: document.getElementById("modalContent"),
  matchSelect: document.getElementById("modalMatchSelect"),
  matchSelectLabel: document.getElementById("modalMatchSelectLabel"),
  name: document.getElementById("modalName"),
  email: document.getElementById("modalEmail"),
  businessNameRow: document.getElementById("modalBusinessNameRow"),
  businessName: document.getElementById("modalBusinessName"),
  mailboxId: document.getElementById("modalMailboxId"),
  mailboxNumber: document.getElementById("modalMailboxNumber"),
  plan: document.getElementById("modalPlan"),
  planStartDate: document.getElementById("modalPlanStartDate"),
  planExpiryDate: document.getElementById("modalPlanExpiryDate"),
  status: document.getElementById("modalStatus"),
  accountStatus: document.getElementById("modalAccountStatus"),
  mcName: document.getElementById("modalMcName"),
  mcStoreType: document.getElementById("modalMcStoreType"),
  mcStatus: document.getElementById("modalMcStatus"),
  mcPhone: document.getElementById("modalMcPhone"),
  mcEmail: document.getElementById("modalMcEmail"),
  mcAddress: document.getElementById("modalMcAddress"),
  openTicketsLabel: document.getElementById("modalOpenTicketsLabel"),
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

function getAccountStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("inactive")) return "status-nodocs";
  if (s.includes("expired")) return "status-pending";
  if (s.includes("active")) return "status-approved";
  return "";
}

function getMcStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("online")) return "status-approved";
  if (s.includes("transfer")) return "status-pending";
  if (s.includes("offline")) return "status-nodocs";
  return "";
}

function isOverZero(value) {
  const n = parseInt(value, 10);
  return !isNaN(n) && n > 0;
}

function safeHref(url) {
  try {
    const u = new URL(url || "");
    return u.protocol === "https:" ? url : "#";
  } catch (e) { return "#"; }
}

function renderMatch(match) {
  el.name.textContent = match.name || "Unnamed contact";
  el.email.textContent = match.email || "";

  if (match.businessName) {
    el.businessName.textContent = match.businessName;
    el.businessNameRow.classList.remove("hidden");
  } else {
    el.businessNameRow.classList.add("hidden");
  }

  el.mailboxId.textContent = match.mailboxId || "N/A";
  el.mailboxNumber.textContent = match.mailboxNumber || "N/A";
  el.plan.textContent = match.plan || "N/A";
  el.planStartDate.textContent = match.planStartDate || "N/A";
  el.planExpiryDate.textContent = match.planExpiryDate || "N/A";

  const statusText = match.status || "N/A";
  el.status.textContent = statusText;
  const sc = getStatusClass(statusText);
  el.status.className = "info-value" + (sc ? " " + sc : "");

  const acctStatusText = match.accountStatus || "N/A";
  el.accountStatus.textContent = acctStatusText;
  const asc = getAccountStatusClass(acctStatusText);
  el.accountStatus.className = "info-value" + (asc ? " " + asc : "");

  el.mcName.textContent = match.mcName || "N/A";
  el.mcStoreType.textContent = match.storeType || "N/A";
  const mcStatusText = match.mcStatus || "N/A";
  el.mcStatus.textContent = mcStatusText;
  const mcsc = getMcStatusClass(mcStatusText);
  el.mcStatus.className = "info-value" + (mcsc ? " " + mcsc : "");

  el.mcPhone.textContent = match.storePhone || "N/A";
  el.mcEmail.textContent = match.storeEmail || "N/A";
  el.mcAddress.textContent = match.storeAddress || "N/A";
  el.link.href = safeHref(match.adminLink || match.url);
}

function renderMatches() {
  if (matches.length > 1) {
    el.matchSelectLabel.textContent = matches[0]?.name || "Unnamed contact";
    el.matchSelectLabel.classList.remove("hidden");
    el.matchSelect.innerHTML = "";
    matches.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `POB: ${m.mailboxNumber || "N/A"}`;
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") client.instance.close();
    });

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
    const openAlert = isOverZero(ticketCounts.open);
    el.openTickets.className = "info-value" + (openAlert ? " ticket-alert" : "");
    el.openTicketsLabel.className = "info-label" + (openAlert ? " ticket-alert" : "");
    el.lifetimeTickets.textContent = ticketCounts.lifetime;
    renderMatches();
  } catch (err) {
    el.loading.classList.add("hidden");
    el.error.textContent = err.message || "Failed to load details.";
    el.error.classList.remove("hidden");
  }
}

boot();

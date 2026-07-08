let client;
let matches = [];

const el = {
  matchBadge: document.getElementById("matchBadge"),
  stateLoading: document.getElementById("stateLoading"),
  stateError: document.getElementById("stateError"),
  stateEmpty: document.getElementById("stateEmpty"),
  stateResults: document.getElementById("stateResults"),
  matchSelect: document.getElementById("matchSelect"),
  matchSelectLabel: document.getElementById("matchSelectLabel"),
  statusBadge: document.getElementById("statusBadge"),
  summaryOpenTickets: document.getElementById("summaryOpenTickets"),
  summaryPendingTickets: document.getElementById("summaryPendingTickets"),
  viewDetailsBtn: document.getElementById("viewDetailsBtn")
};

function setState(next) {
  el.stateLoading.classList.add("hidden");
  el.stateError.classList.add("hidden");
  el.stateEmpty.classList.add("hidden");
  el.stateResults.classList.add("hidden");

  if (next === "loading") el.stateLoading.classList.remove("hidden");
  else if (next === "error") el.stateError.classList.remove("hidden");
  else if (next === "empty") el.stateEmpty.classList.remove("hidden");
  else if (next === "results") el.stateResults.classList.remove("hidden");
}

function getStatusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("approved")) return "status-approved";
  if (s.includes("pending")) return "status-pending";
  if (s.includes("no doc")) return "status-nodocs";
  return "";
}

function isOverOne(value) {
  const n = parseInt(value, 10);
  return !isNaN(n) && n > 1;
}

function renderSummary(record) {
  const statusText = record.status || "N/A";
  el.statusBadge.textContent = statusText;
  const sc = getStatusClass(statusText);
  el.statusBadge.className = "info-value" + (sc ? " " + sc : "");

  const acctStatus = record.accountStatus || "";
  if (acctStatus) {
    el.matchBadge.textContent = acctStatus;
    const badgeClass = acctStatus.toLowerCase().includes("inactive") ? "no-match" : "match";
    el.matchBadge.className = "match-badge " + badgeClass;
  } else {
    el.matchBadge.textContent = "";
    el.matchBadge.className = "match-badge";
  }
}

function renderMatches() {
  el.matchSelectLabel.textContent = matches[0]?.name || "Unnamed contact";
  el.matchSelect.innerHTML = "";
  el.matchSelect.onchange = null;
  matches.forEach((record, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `POB: ${record.mailboxNumber || "N/A"}`;
    el.matchSelect.appendChild(option);
  });
  el.matchSelect.onchange = (e) => renderSummary(matches[Number(e.target.value)]);
  renderSummary(matches[0]);
}

async function fetchTicketCounts(email) {
  try {
    const res = await fetch(`https://freshdesk-admin-express.vercel.app/api/tickets?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.status !== "ok") return { open: "N/A", pending: "N/A", lifetime: "N/A" };
    return { open: String(data.open), pending: String(data.pending), lifetime: String(data.lifetime) };
  } catch (e) {
    return { open: "N/A", pending: "N/A", lifetime: "N/A" };
  }
}

async function lookupMatchesByEmail(email) {
  const res = await fetch(`https://freshdesk-admin-express.vercel.app/api/lookup?email=${encodeURIComponent(email)}`);
  const response = await res.json();
  if (!response || response.status !== "ok") {
    throw new Error(response?.message || "Unable to fetch Freshsales matches.");
  }
  return response.matches || [];
}

async function run() {
  setState("loading");
  el.matchBadge.textContent = "...";
  el.matchBadge.className = "match-badge";
  el.statusBadge.textContent = "";
  el.statusBadge.className = "info-value";
  el.summaryOpenTickets.textContent = "—";
  el.summaryOpenTickets.className = "info-value";
  el.summaryPendingTickets.textContent = "—";

  try {
    const requesterData = await client.data.get("requester");
    const requesterEmail = (requesterData?.requester?.email || "").trim().toLowerCase();

    if (!requesterEmail) {
      el.matchBadge.textContent = "No Match";
      el.matchBadge.className = "match-badge no-match";
      el.stateError.textContent = "Requester email is missing.";
      setState("error");
      return;
    }

    const [freshsalesMatches, ticketCounts] = await Promise.all([
      lookupMatchesByEmail(requesterEmail),
      fetchTicketCounts(requesterEmail)
    ]);
    matches = freshsalesMatches;
    el.summaryOpenTickets.textContent = ticketCounts.open;
    el.summaryOpenTickets.className = "info-value" + (isOverOne(ticketCounts.open) ? " ticket-alert" : "");
    el.summaryPendingTickets.textContent = ticketCounts.pending;

    if (matches.length === 0) {
      el.matchBadge.textContent = "No Match";
      el.matchBadge.className = "match-badge no-match";
      setState("empty");
      return;
    }

    renderMatches();
    setState("results");

  } catch (error) {
    el.stateError.textContent = error.message || "Unexpected app error";
    setState("error");
  }
}

async function boot() {
  try {
    client = await app.initialized();

    el.viewDetailsBtn.addEventListener("click", () => {
      client.interface.trigger("showModal", {
        title: "Customer Details",
        template: "modal.html"
      });
    });

    await run();

    let currentTicketId = null;
    const ticketData = await client.data.get("ticket");
    currentTicketId = ticketData?.ticket?.id;

    setInterval(async () => {
      try {
        const data = await client.data.get("ticket");
        const id = data?.ticket?.id;
        if (id && id !== currentTicketId) {
          currentTicketId = id;
          run();
        }
      } catch (e) {}
    }, 800);

  } catch (error) {
    el.stateError.textContent = error.message || "Unexpected app error";
    setState("error");
  }
}

boot();

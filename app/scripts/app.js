let client;
let matches = [];

const el = {
  matchBadge: document.getElementById("matchBadge"),
  stateLoading: document.getElementById("stateLoading"),
  stateError: document.getElementById("stateError"),
  stateEmpty: document.getElementById("stateEmpty"),
  stateResults: document.getElementById("stateResults"),
  matchSelect: document.getElementById("matchSelect"),
  summaryMailboxId: document.getElementById("summaryMailboxId"),
  summaryStatus: document.getElementById("summaryStatus"),
  summaryOpenTickets: document.getElementById("summaryOpenTickets"),
  summaryLifetimeTickets: document.getElementById("summaryLifetimeTickets"),
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

function renderSummary(record) {
  el.summaryMailboxId.textContent = record.mailboxId || "N/A";
  const statusText = record.status || "N/A";
  el.summaryStatus.textContent = statusText;
  const sc = getStatusClass(statusText);
  el.summaryStatus.className = "info-value" + (sc ? " " + sc : "");
}

function renderMatches() {
  el.matchSelect.innerHTML = "";
  matches.forEach((record, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${record.name || "Unnamed"} - POB: ${record.mailboxNumber || "N/A"}`;
    el.matchSelect.appendChild(option);
  });

  el.matchSelect.addEventListener("change", (e) => renderSummary(matches[Number(e.target.value)]));
  renderSummary(matches[0]);
}

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

async function lookupMatchesByEmail(email) {
  const res = await fetch(`https://freshdesk-admin-express.vercel.app/api/lookup?email=${encodeURIComponent(email)}`);
  const response = await res.json();
  if (!response || response.status !== "ok") {
    throw new Error(response?.message || "Unable to fetch Freshsales matches.");
  }
  return response.matches || [];
}

async function boot() {
  setState("loading");
  try {
    client = await app.initialized();
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
    el.summaryLifetimeTickets.textContent = ticketCounts.lifetime;

    if (matches.length === 0) {
      el.matchBadge.textContent = "No Match";
      el.matchBadge.className = "match-badge no-match";
      setState("empty");
      return;
    }

    el.matchBadge.textContent = "Match";
    el.matchBadge.className = "match-badge match";
    renderMatches();
    setState("results");

    el.viewDetailsBtn.addEventListener("click", () => {
      client.interface.trigger("showModal", {
        title: "Customer Details",
        template: "modal.html"
      });
    });

  } catch (error) {
    el.stateError.textContent = error.message || "Unexpected app error";
    setState("error");
  }
}

boot();

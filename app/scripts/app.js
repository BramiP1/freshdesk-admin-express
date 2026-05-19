let client;
let matches = [];

const el = {
  matchBadge: document.getElementById("matchBadge"),
  stateLoading: document.getElementById("stateLoading"),
  stateError: document.getElementById("stateError"),
  stateEmpty: document.getElementById("stateEmpty"),
  stateResults: document.getElementById("stateResults"),
  matchSelect: document.getElementById("matchSelect"),
  detailCard: document.getElementById("detailCard"),
  detailName: document.getElementById("detailName"),
  detailMailboxId: document.getElementById("detailMailboxId"),
  detailPlan: document.getElementById("detailPlan"),
  detailPlanDates: document.getElementById("detailPlanDates"),
  detailStatus: document.getElementById("detailStatus"),
  detailMcName: document.getElementById("detailMcName"),
  detailMcPhone: document.getElementById("detailMcPhone"),
  detailMcAddress: document.getElementById("detailMcAddress"),
  detailMcFeatures: document.getElementById("detailMcFeatures"),
  detailLink: document.getElementById("detailLink")
};

function setState(next) {
  el.stateLoading.classList.add("hidden");
  el.stateError.classList.add("hidden");
  el.stateEmpty.classList.add("hidden");
  el.stateResults.classList.add("hidden");

  if (next === "loading") {
    el.stateLoading.classList.remove("hidden");
  } else if (next === "error") {
    el.stateError.classList.remove("hidden");
  } else if (next === "empty") {
    el.stateEmpty.classList.remove("hidden");
  } else if (next === "results") {
    el.stateResults.classList.remove("hidden");
  }
}

function renderDetails(record) {
  if (!record) {
    el.detailCard.classList.add("hidden");
    return;
  }

  el.detailName.textContent = record.name || "Unnamed contact";
  el.detailMailboxId.textContent = record.mailboxId || "N/A";
  el.detailPlan.textContent = record.plan || "N/A";

  let planDates = [];
  if (record.planStartDate) planDates.push(`Start: ${record.planStartDate}`);
  if (record.planExpiryDate) planDates.push(`Expires: ${record.planExpiryDate}`);
  el.detailPlanDates.textContent = planDates.length > 0 ? planDates.join(" | ") : "N/A";

  el.detailStatus.textContent = record.status || "N/A";
  el.detailMcName.textContent = record.name || "N/A";
  el.detailMcPhone.textContent = record.storePhone || "N/A";
  el.detailMcAddress.textContent = record.storeAddress || "N/A";

  if (record.mcFeatures) {
    el.detailMcFeatures.textContent = record.mcFeatures
      .split(";")
      .map((f) => f.trim())
      .filter(Boolean)
      .join("\n");
    document.getElementById("mcFeaturesRow").classList.remove("hidden");
  } else {
    document.getElementById("mcFeaturesRow").classList.add("hidden");
  }

  el.detailLink.href = record.url || "#";
  el.detailCard.classList.remove("hidden");
}

function renderMatches() {
  el.matchSelect.innerHTML = "";

  matches.forEach((record, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${record.name || "Unnamed"} (${record.mailboxId || "N/A"}) - Plan: ${record.plan || "N/A"}`;
    el.matchSelect.appendChild(option);
  });

  el.matchSelect.addEventListener("change", (event) => {
    const selected = matches[Number(event.target.value)];
    renderDetails(selected);
  });

  renderDetails(matches[0]);
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
    client.interface.trigger("resize", { height: "600px" });
    const requesterData = await client.data.get("requester");
    const requesterEmail = (requesterData?.requester?.email || "").trim().toLowerCase();

    if (!requesterEmail) {
      el.matchBadge.textContent = "No Match";
      el.matchBadge.className = "match-badge no-match";
      el.stateError.textContent = "Requester email is missing. Cannot run Freshsales lookup.";
      setState("error");
      return;
    }

    matches = await lookupMatchesByEmail(requesterEmail);

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
  } catch (error) {
    el.stateError.textContent = error.message || "Unexpected app error";
    setState("error");
  }
}

boot();

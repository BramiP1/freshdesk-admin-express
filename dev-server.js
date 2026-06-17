// Quick local dev server — run with: node dev-server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const [key, ...rest] = line.trim().split("=");
    if (key && rest.length) process.env[key] = rest.join("=");
  });
} else {
  console.warn("Warning: no .env file found — create one from .env.example");
}

const handler = require("./api/lookup");

const PORT = 3456;

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  req.query = Object.fromEntries(url.searchParams.entries());

  const originalJson = (data) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data, null, 2));
  };
  const originalStatus = (code) => { res.statusCode = code; return { json: originalJson, end: () => res.end() }; };

  res.json = originalJson;
  res.status = originalStatus;

  handler(req, res);
}).listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log(`Test with: http://localhost:${PORT}/?email=customer@example.com`);
});

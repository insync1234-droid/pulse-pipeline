import "./env.js";
import express from "express";
import { webhookHandler } from "./webhook.js";
import { analyzeRepo } from "./pipeline.js";
const app = express();
app.use((req, res, next) => {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    req.rawBody = data;
    try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
    next();
  });
});
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.post("/webhook", webhookHandler);
app.get("/analyze/:owner/:repo", async (req, res) => {
  try { res.json(await analyzeRepo(req.params.owner, req.params.repo)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/message", async (req, res) => {
  const { prompt, system, max_tokens = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const { ask } = await import("./claude.js");
    const content = await ask(prompt, { system, max_tokens });
    res.json({ content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
const PORT = parseInt(process.env.PORT || "3000", 10);
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nPulse Pipeline on port ${PORT}`);
  console.log(`  POST /webhook`);
  console.log(`  GET  /analyze/:owner/:repo\n`);
});
server.on("error", (err) => { console.error("Server error:", err); process.exit(1); });
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));

import { runPipeline } from "./pipeline.js";
const SUPPORTED = new Set(["push","pull_request","issues","release"]);
export async function webhookHandler(req, res) {
  const event = req.headers["x-github-event"];
  res.status(202).json({ received: true, event });
  if (!SUPPORTED.has(event)) return;
  const repo = req.body.repository?.full_name || "unknown";
  console.log(`[webhook] ${event} → ${repo}`);
  try {
    const result = await runPipeline(event, req.body);
    if (result.analysis) console.log(`\n${"─".repeat(60)}\n${result.analysis}\n${"─".repeat(60)}\n`);
  } catch (err) { console.error(`[pipeline] ${err.message}`); }
}

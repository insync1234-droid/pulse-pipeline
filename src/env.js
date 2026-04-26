import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv(path = ".env") {
  try {
    const file = readFileSync(resolve(process.cwd(), path), "utf-8");
    for (const line of file.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}
loadEnv();
const REQUIRED = ["GROQ_API_KEY", "GITHUB_TOKEN", "WEBHOOK_SECRET"];
const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].startsWith("your_"));
if (missing.length > 0) {
  console.error(`\n[pulse] Missing env vars:\n`);
  missing.forEach((key) => console.error(`  ✗ ${key}`));
  console.error(`\nEdit .env and restart.\n`);
  process.exit(1);
}
export const env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  PORT: parseInt(process.env.PORT || "3000", 10),
};
export default env;

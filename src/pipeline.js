import { readFileSync } from "fs";
import { resolve } from "path";
import { ask } from "./claude.js";
import github from "./github.js";
const pulseSystem = readFileSync(resolve(process.cwd(), "pulse-system.txt"), "utf-8");
const opts = { system: pulseSystem, max_tokens: 2048 };
export async function runPipeline(event, payload) {
  switch (event) {
    case "push": return analyzePush(payload);
    case "pull_request": return analyzePR(payload);
    case "issues": return analyzeIssue(payload);
    default: return { mode: "SKIP", analysis: null };
  }
}
async function analyzePush({ repository, commits = [], pusher, ref }) {
  const [owner, repo] = repository.full_name.split("/");
  const branch = ref.replace("refs/heads/", "");
  const recent = await github.getCommits(owner, repo, { limit: 20 }).catch(() => commits);
  const prompt = `MODE: COMMIT_PULSE\nREPO: ${repository.full_name}\nBRANCH: ${branch}\nPUSHER: ${pusher?.name}\n\nNEW COMMITS:\n${commits.map(c=>`- ${c.message?.split("\n")[0]} (${c.author?.name})`).join("\n")}\n\nRECENT HISTORY:\n${recent.slice(0,20).map(c=>`- ${c.commit?.message?.split("\n")[0]} (${c.commit?.author?.date?.slice(0,10)})`).join("\n")}\n\nAnalyze velocity, anomalies, risk.`;
  return { mode: "COMMIT_PULSE", repo: repository.full_name, analysis: await ask(prompt, opts) };
}
async function analyzePR({ action, pull_request: pr, repository }) {
  if (!["opened","reopened","closed"].includes(action)) return { mode: "SKIP", analysis: null };
  const [owner, repo] = repository.full_name.split("/");
  const [files, openPRs] = await Promise.allSettled([github.getPRFiles(owner, repo, pr.number), github.getPullRequests(owner, repo, { state: "open", limit: 20 })]);
  const age = Math.round((Date.now() - new Date(pr.created_at).getTime()) / 3600000);
  const prompt = `MODE: PR_REVIEW\nREPO: ${repository.full_name}\n\nTHIS PR: ${pr.title} by ${pr.user?.login}, ${age}h old, +${pr.additions}/-${pr.deletions} lines\nFILES:\n${files.status==="fulfilled"?files.value.slice(0,15).map(f=>`- ${f.filename}`).join("\n"):"unavailable"}\n\nOPEN PRs:\n${openPRs.status==="fulfilled"?openPRs.value.map(p=>{const d=Math.round((Date.now()-new Date(p.created_at).getTime())/86400000);return`- #${p.number} "${p.title}" ${d}d old`}).join("\n"):"unavailable"}\n\nAnalyze PR health, bottlenecks, risk.`;
  return { mode: "PR_REVIEW", repo: repository.full_name, analysis: await ask(prompt, opts) };
}
async function analyzeIssue({ action, issue, repository }) {
  if (!["opened","reopened"].includes(action)) return { mode: "SKIP", analysis: null };
  const [owner, repo] = repository.full_name.split("/");
  const open = await github.getIssues(owner, repo, { state: "open", limit: 30 }).catch(() => []);
  const prompt = `MODE: ISSUE_TRIAGE\nREPO: ${repository.full_name}\n\nNEW ISSUE: "${issue.title}" by ${issue.user?.login}\n${issue.body?.slice(0,400)||""}\n\nOPEN ISSUES (${open.length}):\n${open.slice(0,20).map(i=>`- #${i.number} "${i.title}"`).join("\n")}\n\nTriage and report issue health.`;
  return { mode: "ISSUE_TRIAGE", repo: repository.full_name, analysis: await ask(prompt, opts) };
}
export async function analyzeRepo(owner, repo) {
  const [repoData, commits, prs, issues, contributors] = await Promise.allSettled([
    github.getRepo(owner, repo), github.getCommits(owner, repo, { limit: 30 }),
    github.getPullRequests(owner, repo, { state: "all", limit: 20 }),
    github.getIssues(owner, repo, { state: "open", limit: 20 }), github.getContributors(owner, repo),
  ]);
  const r = repoData.status === "fulfilled" ? repoData.value : {};
  const prompt = `MODE: REPO_HEALTH\nREPO: ${owner}/${repo}\nStars: ${r.stargazers_count} Forks: ${r.forks_count} Issues: ${r.open_issues_count} Language: ${r.language} Last push: ${r.pushed_at}\n\nCONTRIBUTORS:\n${contributors.status==="fulfilled"?contributors.value.slice(0,10).map(c=>`- ${c.login}: ${c.contributions}`).join("\n"):"unavailable"}\n\nCOMMITS:\n${commits.status==="fulfilled"?commits.value.slice(0,20).map(c=>`- ${c.commit?.message?.split("\n")[0]}`).join("\n"):"unavailable"}\n\nFull REPO_HEALTH analysis. Health score, risks, strengths, verdict.`;
  return { mode: "REPO_HEALTH", repo: `${owner}/${repo}`, analysis: await ask(prompt, opts) };
}

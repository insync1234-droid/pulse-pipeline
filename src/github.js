import fetch from "node-fetch";
const BASE = "https://api.github.com";
function createClient(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  async function request(path, options = {}) {
    const url = path.startsWith("http") ? path : `${BASE}${path}`;
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(`GitHub ${res.status}: ${e.message}`); }
    return res.status === 204 ? null : res.json();
  }
  const getRepo = (o, r) => request(`/repos/${o}/${r}`);
  const getCommits = (o, r, { limit = 30 } = {}) => request(`/repos/${o}/${r}/commits?per_page=${Math.min(limit,100)}`);
  const getIssues = (o, r, { state = "open", limit = 30 } = {}) => request(`/repos/${o}/${r}/issues?state=${state}&per_page=${Math.min(limit,100)}`);
  const getPullRequests = (o, r, { state = "open", limit = 20 } = {}) => request(`/repos/${o}/${r}/pulls?state=${state}&per_page=${Math.min(limit,100)}`);
  const getPRFiles = (o, r, n) => request(`/repos/${o}/${r}/pulls/${n}/files`);
  const getContributors = (o, r) => request(`/repos/${o}/${r}/contributors?per_page=100`);
  return { request, getRepo, getCommits, getIssues, getPullRequests, getPRFiles, getContributors };
}
const github = createClient(process.env.GITHUB_TOKEN);
export { createClient };
export default github;

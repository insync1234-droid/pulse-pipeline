import Groq from "groq-sdk";
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";
export async function ask(prompt, options = {}) {
  const { system = "You are a helpful assistant.", max_tokens = 1024 } = options;
  const response = await client.chat.completions.create({
    model: MODEL, max_tokens,
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
}
export default { ask };

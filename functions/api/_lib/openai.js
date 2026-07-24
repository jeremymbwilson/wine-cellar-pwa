import { extractOutputText } from "./http.js";

export async function callOpenAI(env, input, schemaName, schema) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY has not been configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6",
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "The AI service request failed.";
    throw new Error(message);
  }
  return JSON.parse(extractOutputText(payload));
}

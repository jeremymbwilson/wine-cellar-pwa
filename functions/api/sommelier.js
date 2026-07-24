import { json, error, readJson, requireAppKey } from "./_lib/http.js";
import { callOpenAI } from "./_lib/openai.js";

const SOMMELIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          wineId: { type: "string" }, rank: { type: "integer" },
          bottlesSuggested: { type: "integer" }, reason: { type: "string" }
        },
        required: ["wineId", "rank", "bottlesSuggested", "reason"]
      }
    },
    cautions: { type: "array", items: { type: "string" } }
  },
  required: ["summary", "recommendations", "cautions"]
};

export async function onRequestPost(context) {
  const denied = requireAppKey(context); if (denied) return denied;
  try {
    const body = await readJson(context.request, 500_000);
    const candidates = Array.isArray(body.candidateWines) ? body.candidateWines.slice(0, 80) : [];
    if (!candidates.length) return error("No candidate wines were supplied.");
    const prompt = `Act as a cautious personal wine adviser. Rank only wines in the supplied candidate list. Use the exact wineId values and do not invent bottles. Prefer wines currently ready, respect the stated meal, number of people and preferences, and avoid recommending bottles whose drinking status is keep unless there is a compelling reason. Return up to five recommendations.

Request: ${JSON.stringify({ meal: body.meal, numberOfPeople: body.numberOfPeople, preferences: body.preferences, candidateWines: candidates })}`;
    const result = await callOpenAI(context.env, [{ role: "user", content: [{ type: "input_text", text: prompt }] }], "sommelier_recommendations", SOMMELIER_SCHEMA);
    return json(result);
  } catch (e) {
    console.error("sommelier", e?.message);
    return error(e?.message || "Sommelier request failed.", e?.status || 500);
  }
}

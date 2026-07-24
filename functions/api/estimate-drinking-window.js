import { json, error, readJson, requireAppKey } from "./_lib/http.js";
import { callOpenAI } from "./_lib/openai.js";

const WINDOW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    drinkFromYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    peakFromYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    peakToYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    drinkByYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    confidence: { type: "string", enum: ["low", "medium", "high", "insufficient"] },
    sourceType: { type: "string", enum: ["estimated", "general-style", "insufficient-information"] },
    basis: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    warning: { type: "string" }
  },
  required: ["drinkFromYear", "peakFromYear", "peakToYear", "drinkByYear", "confidence", "sourceType", "basis", "assumptions", "warning"]
};

export async function onRequestPost(context) {
  const denied = requireAppKey(context); if (denied) return denied;
  try {
    const wine = await readJson(context.request, 100_000);
    if (!wine.name || !wine.vintage) return error("A confirmed wine name and vintage are required.");

    const prompt = `Estimate a cautious drinking window for the confirmed wine data below. This is guidance, not certainty. Never invent a named critic or published source. Set sourceType to estimated unless the identity is too weak, then use insufficient-information. Avoid false precision and explain the basis and assumptions. Consider bottle size and storage.

${JSON.stringify(wine)}`;
    const result = await callOpenAI(context.env, [{ role: "user", content: [{ type: "input_text", text: prompt }] }], "drinking_window", WINDOW_SCHEMA);
    return json(result);
  } catch (e) {
    console.error("estimate-window", e?.message);
    return error(e?.message || "Drinking-window estimation failed.", e?.status || 500);
  }
}

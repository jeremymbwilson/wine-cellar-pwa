import { json, error, readJson } from "./_lib/http.js";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    drinkFromYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    peakFromYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    peakToYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    drinkByYear: { anyOf: [{ type: "integer" }, { type: "null" }] },
    confidence: { type: "string", enum: ["low", "medium", "high", "insufficient"] },
    styleSummary: { type: "string" },
    foodPairings: { type: "array", items: { type: "string" } },
    servingTemperature: { type: "string" },
    basis: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    warning: { type: "string" }
  },
  required: [
    "drinkFromYear", "peakFromYear", "peakToYear", "drinkByYear",
    "confidence", "styleSummary", "foodPairings", "servingTemperature",
    "basis", "assumptions", "warning"
  ]
};

function geminiMessage(payload) {
  const message = payload?.error?.message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Gemini enrichment request failed.";
}

export async function onRequestPost(context) {
  try {
    if (!context.env.GEMINI_API_KEY) {
      return error("Wine enrichment is not configured yet.", 503);
    }

    const wine = await readJson(context.request, 100_000);
    if (!wine.name || !wine.vintage) {
      return error("A confirmed wine name and vintage are required before estimating a drinking window.", 400);
    }

    const prompt = `You are assisting a private wine collector.
Given the confirmed wine information below, provide a cautious ESTIMATED drinking window and practical serving guidance.

Important rules:
- This is an AI estimate, not a published critic or producer drinking window.
- Do not invent named critics, scores, reviews, quotations or sources.
- If the wine identity is too uncertain, set confidence to "insufficient" and leave years null.
- Avoid false precision. Use broad, sensible windows.
- Consider vintage, region/appellation, wine style, bottle size and storage condition when provided.
- A 750ml bottle under cool stable storage is the default assumption if information is missing.
- "drinkFromYear" means reasonable to begin drinking.
- "peakFromYear" and "peakToYear" describe a likely broad peak.
- "drinkByYear" is a cautious suggested upper end, not a guarantee.
- Keep foodPairings to 3 concise suggestions.
- servingTemperature should be a short practical phrase.
- warning must remind the user that bottle condition, storage and personal taste can materially change the result.

Confirmed wine data:
${JSON.stringify(wine)}`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": context.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            temperature: 0.15
          }
        })
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = geminiMessage(payload);
      console.error("enrich-wine-gemini Gemini error", { status: response.status, message });
      return error(`Gemini rejected the enrichment request (${response.status}): ${message}`, response.status);
    }

    const text =
      payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";

    if (!text) return error("The enrichment service returned no result.", 502);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("enrich-wine-gemini invalid JSON", text.slice(0, 1000));
      return error("The enrichment service returned an invalid structured result.", 502);
    }

    return json(result);
  } catch (e) {
    console.error("enrich-wine-gemini", e?.message || e);
    return error(e?.message || "Wine enrichment failed.", e?.status || 500);
  }
}

export function onRequest() {
  return error("Method not allowed.", 405);
}

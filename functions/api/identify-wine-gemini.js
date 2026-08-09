import { json, error, readJson } from "./_lib/http.js";

/*
 * Preview 2:
 * Use Gemini's JSON-Schema field (responseJsonSchema) rather than the older
 * OpenAPI-style responseSchema. This avoids the INVALID_ARGUMENT response
 * seen in Preview 1 and keeps the output predictable for the PWA.
 */
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    identified: { type: "boolean" },
    producer: { type: "string" },
    wineName: { type: "string" },
    vintage: {
      anyOf: [
        { type: "integer" },
        { type: "null" }
      ]
    },
    country: { type: "string" },
    region: { type: "string" },
    appellation: { type: "string" },
    colour: {
      type: "string",
      enum: ["Red", "White", "Rosé", "Sparkling", "Dessert", "Fortified", "Orange", "Other", ""]
    },
    grapeVarieties: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    visibleLabelText: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: [
    "identified", "producer", "wineName", "vintage", "country", "region",
    "appellation", "colour", "grapeVarieties", "confidence",
    "visibleLabelText", "warnings"
  ]
};

function geminiMessage(payload) {
  const message = payload?.error?.message;
  if (typeof message === "string" && message.trim()) return message.trim();
  return "Gemini recognition request failed.";
}

export async function onRequestPost(context) {
  try {
    if (!context.env.GEMINI_API_KEY) {
      return error(
        "Smart Recognition is not configured yet. Add the GEMINI_API_KEY secret in Cloudflare.",
        503
      );
    }

    const body = await readJson(context.request, 2_500_000);
    const image = String(body.image || "");
    const m = image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
    if (!m) return error("A JPEG, PNG or WebP front-label image is required.");

    const mime = `image/${m[1].toLowerCase()}`;

    const prompt = `Identify the wine from this front-label photograph conservatively.
Extract what is visible and use wine knowledge only where strongly supported.
Never invent a vintage, producer, appellation or grape variety.
If a string field is uncertain, return an empty string.
If vintage is uncertain, return null.
Explain meaningful uncertainty in warnings.
wineName should be the useful wine/cuvée name and producer should be the producer/estate.
Return colour using exactly one of: Red, White, Rosé, Sparkling, Dessert, Fortified, Orange, Other, or an empty string.
confidence is the overall confidence in the identification.
Accuracy is more important than filling every field.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": context.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mime, data: m[2] } }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            temperature: 0.1
          }
        })
      }
    );

    let payload;
    try {
      payload = await response.json();
    } catch {
      const raw = await response.text().catch(() => "");
      console.error("identify-wine-gemini non-JSON Gemini response", response.status, raw.slice(0, 800));
      return error(`Gemini returned an unreadable response (${response.status}).`, 502);
    }

    if (!response.ok) {
      const message = geminiMessage(payload);
      console.error("identify-wine-gemini Gemini error", {
        status: response.status,
        message,
        statusText: response.statusText
      });
      return error(
        `Gemini rejected the recognition request (${response.status}): ${message}`,
        response.status
      );
    }

    const text =
      payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";

    if (!text) {
      console.error("identify-wine-gemini empty result", {
        finishReason: payload?.candidates?.[0]?.finishReason || "",
        promptFeedback: payload?.promptFeedback || null
      });
      return error("The recognition service returned no result.", 502);
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("identify-wine-gemini invalid JSON result", text.slice(0, 1000));
      return error("The recognition service returned an invalid structured result.", 502);
    }

    return json(result);
  } catch (e) {
    console.error("identify-wine-gemini", e?.message || e);
    return error(e?.message || "Wine recognition failed.", e?.status || 500);
  }
}

export function onRequest() {
  return error("Method not allowed.", 405);
}

import { json, error, readJson, requireAppKey } from "./_lib/http.js";
import { callOpenAI } from "./_lib/openai.js";

const IDENTIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identified: { type: "boolean" },
    producer: { type: "string" },
    wineName: { type: "string" },
    vintage: { anyOf: [{ type: "integer" }, { type: "null" }] },
    country: { type: "string" },
    region: { type: "string" },
    appellation: { type: "string" },
    classification: { type: "string" },
    colour: { type: "string" },
    grapeVarieties: { type: "array", items: { type: "string" } },
    alcoholPercentage: { anyOf: [{ type: "number" }, { type: "null" }] },
    visibleLabelText: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["identified", "producer", "wineName", "vintage", "country", "region", "appellation", "classification", "colour", "grapeVarieties", "alcoholPercentage", "visibleLabelText", "confidence", "warnings"]
};

export async function onRequestPost(context) {
  const denied = requireAppKey(context); if (denied) return denied;
  try {
    const body = await readJson(context.request, 2_500_000);
    const image = String(body.image || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(image)) return error("A JPEG, PNG or WebP label image is required.");

    const result = await callOpenAI(context.env, [{
      role: "user",
      content: [
        { type: "input_text", text: "Analyse this wine label conservatively. Extract only visible or strongly supported details. Do not invent producer, vintage, appellation or grapes. Use empty strings or null when uncertain. Grapes may be inferred only when strongly associated with an appellation, and any uncertainty must be included in warnings. This step identifies the wine only; do not estimate a drinking window." },
        { type: "input_image", image_url: image, detail: "high" }
      ]
    }], "wine_identification", IDENTIFICATION_SCHEMA);

    return json(result);
  } catch (e) {
    console.error("identify-wine", e?.message);
    return error(e?.message || "Wine identification failed.", e?.status || 500);
  }
}

export function onRequest() { return error("Method not allowed.", 405); }

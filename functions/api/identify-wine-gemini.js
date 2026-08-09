import { json, error, readJson } from "./_lib/http.js";

const schema = {
  type: "OBJECT",
  properties: {
    identified: { type: "BOOLEAN" },
    producer: { type: "STRING" },
    wineName: { type: "STRING" },
    vintage: { type: "INTEGER", nullable: true },
    country: { type: "STRING" },
    region: { type: "STRING" },
    appellation: { type: "STRING" },
    colour: { type: "STRING", enum: ["Red","White","Rosé","Sparkling","Dessert","Fortified","Orange","Other",""] },
    grapeVarieties: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "STRING", enum: ["low","medium","high"] },
    visibleLabelText: { type: "ARRAY", items: { type: "STRING" } },
    warnings: { type: "ARRAY", items: { type: "STRING" } }
  },
  required: ["identified","producer","wineName","vintage","country","region","appellation","colour","grapeVarieties","confidence","visibleLabelText","warnings"]
};

export async function onRequestPost(context) {
  try {
    if (!context.env.GEMINI_API_KEY) return error("Smart Recognition is not configured yet. Add the GEMINI_API_KEY secret in Cloudflare.", 503);
    const body = await readJson(context.request, 2_500_000);
    const image = String(body.image || "");
    const m = image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
    if (!m) return error("A JPEG, PNG or WebP front-label image is required.");
    const mime = `image/${m[1].toLowerCase()}`;
    const prompt = `Identify the wine from this front-label photograph conservatively. Extract what is visible and use wine knowledge only where strongly supported. Never invent a vintage, producer, appellation or grape. If a field is uncertain, return an empty string or null and explain it in warnings. wineName should be the useful wine/cuvée name, producer should be the producer/estate. Return colour using exactly one of: Red, White, Rosé, Sparkling, Dessert, Fortified, Orange, Other, or empty. Confidence is for the overall identification. This is a preview feature: accuracy is more important than filling every field.`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": context.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: m[2] } }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message || "Gemini recognition request failed."), { status: response.status });
    const text = payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("") || "";
    if (!text) throw new Error("The recognition service returned no result.");
    return json(JSON.parse(text));
  } catch (e) {
    console.error("identify-wine-gemini", e?.message);
    return error(e?.message || "Wine recognition failed.", e?.status || 500);
  }
}
export function onRequest() { return error("Method not allowed.", 405); }

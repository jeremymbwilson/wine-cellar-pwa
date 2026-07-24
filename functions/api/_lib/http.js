export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export async function readJson(request, maxBytes = 2_500_000) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength && contentLength > maxBytes) {
    throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error("Invalid JSON request."), { status: 400 }); }
}

export function requireAppKey(context) {
  const expected = context.env.APP_ACCESS_KEY;
  if (!expected) return null;
  const supplied = context.request.headers.get("X-App-Key") || "";
  if (supplied !== expected) return error("Access key is missing or incorrect.", 401);
  return null;
}

export function normalise(value) {
  return String(value || "").trim();
}

export function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("The AI service returned no structured result.");
}

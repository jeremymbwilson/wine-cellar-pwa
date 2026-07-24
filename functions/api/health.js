import { json } from "./_lib/http.js";
export async function onRequestGet(context) {
  return json({
    ok: true,
    databaseConfigured: Boolean(context.env.DB),
    aiConfigured: Boolean(context.env.OPENAI_API_KEY),
    accessKeyConfigured: Boolean(context.env.APP_ACCESS_KEY)
  });
}

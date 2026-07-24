import { json, error, normalise } from "./_lib/http.js";

export async function onRequestGet(context) {
  if (!context.env.DB) return error("The shared catalogue database is not configured.", 503);
  const url = new URL(context.request.url);
  const barcode = normalise(url.searchParams.get("barcode"));
  if (!barcode) return error("A barcode is required.");

  const result = await context.env.DB.prepare(`
    SELECT p.id, p.barcode, p.producer, p.wine_name AS wineName,
           p.country, p.region, p.appellation, p.classification,
           p.colour, p.grape_varieties AS grapeVarieties,
           p.confidence, p.verified_count AS verifiedCount,
           v.vintage, v.drink_from_year AS drinkFromYear,
           v.peak_from_year AS peakFromYear, v.peak_to_year AS peakToYear,
           v.drink_by_year AS drinkByYear, v.confidence AS windowConfidence,
           v.source_type AS windowSourceType, v.rationale AS windowRationale
    FROM wine_products p
    LEFT JOIN wine_vintages v ON v.wine_product_id = p.id
    WHERE p.barcode = ?
    ORDER BY p.verified_count DESC, v.vintage DESC
    LIMIT 20
  `).bind(barcode).all();

  return json({ matches: result.results || [] });
}

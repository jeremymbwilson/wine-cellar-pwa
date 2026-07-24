import { json, error, readJson, requireAppKey, normalise } from "./_lib/http.js";

export async function onRequestPost(context) {
  const denied = requireAppKey(context); if (denied) return denied;
  if (!context.env.DB) return error("The shared catalogue database is not configured.", 503);

  try {
    const body = await readJson(context.request, 100_000);
    const wineName = normalise(body.wineName || body.name);
    const producer = normalise(body.producer);
    const barcode = normalise(body.barcode);
    if (!wineName) return error("Wine name is required.");

    const now = new Date().toISOString();
    let product = null;
    if (barcode) {
      product = await context.env.DB.prepare("SELECT id FROM wine_products WHERE barcode = ? ORDER BY verified_count DESC LIMIT 1").bind(barcode).first();
    }
    if (!product) {
      product = await context.env.DB.prepare(`
        SELECT id FROM wine_products
        WHERE lower(wine_name) = lower(?) AND lower(COALESCE(producer,'')) = lower(?)
        LIMIT 1
      `).bind(wineName, producer).first();
    }

    let productId;
    if (product) {
      productId = product.id;
      await context.env.DB.prepare(`
        UPDATE wine_products SET barcode = COALESCE(NULLIF(?,''), barcode), producer = ?, wine_name = ?,
          country = ?, region = ?, appellation = ?, classification = ?, colour = ?, grape_varieties = ?,
          confidence = ?, verified_count = verified_count + 1, updated_at = ? WHERE id = ?
      `).bind(barcode, producer, wineName, normalise(body.country), normalise(body.region), normalise(body.appellation),
        normalise(body.classification), normalise(body.colour), normalise(body.grape), normalise(body.confidence || "user-confirmed"), now, productId).run();
    } else {
      const inserted = await context.env.DB.prepare(`
        INSERT INTO wine_products
        (barcode, producer, wine_name, country, region, appellation, classification, colour, grape_varieties, source, confidence, verified_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(barcode, producer, wineName, normalise(body.country), normalise(body.region), normalise(body.appellation),
        normalise(body.classification), normalise(body.colour), normalise(body.grape), "user-confirmed", normalise(body.confidence || "user-confirmed"), now, now).run();
      productId = inserted.meta.last_row_id;
    }

    const vintage = Number(body.vintage);
    if (Number.isInteger(vintage) && vintage >= 1800 && vintage <= 2200) {
      await context.env.DB.prepare(`
        INSERT INTO wine_vintages
          (wine_product_id, vintage, drink_from_year, peak_from_year, peak_to_year, drink_by_year, confidence, source_type, rationale, verified_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(wine_product_id, vintage) DO UPDATE SET
          drink_from_year = COALESCE(excluded.drink_from_year, wine_vintages.drink_from_year),
          peak_from_year = COALESCE(excluded.peak_from_year, wine_vintages.peak_from_year),
          peak_to_year = COALESCE(excluded.peak_to_year, wine_vintages.peak_to_year),
          drink_by_year = COALESCE(excluded.drink_by_year, wine_vintages.drink_by_year),
          confidence = COALESCE(NULLIF(excluded.confidence,''), wine_vintages.confidence),
          source_type = COALESCE(NULLIF(excluded.source_type,''), wine_vintages.source_type),
          rationale = COALESCE(NULLIF(excluded.rationale,''), wine_vintages.rationale),
          verified_count = wine_vintages.verified_count + 1,
          updated_at = excluded.updated_at
      `).bind(productId, vintage, body.drinkFromYear || null, body.peakFromYear || null, body.peakToYear || null,
        body.drinkByYear || null, normalise(body.windowConfidence), normalise(body.windowSourceType), normalise(body.windowRationale), now).run();
    }

    return json({ ok: true, productId });
  } catch (e) {
    console.error("confirm-wine", e?.message);
    return error(e?.message || "The confirmed wine could not be saved.", e?.status || 500);
  }
}

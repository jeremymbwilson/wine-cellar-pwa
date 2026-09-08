import { json, error, normalise } from "./_lib/http.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const barcode = normalise(url.searchParams.get("barcode"));

  if (!barcode) {
    return error("A barcode is required.");
  }

  const lookupUrl =
    "https://api.upcitemdb.com/prod/trial/lookup?upc=" +
    encodeURIComponent(barcode);

  const response = await fetch(lookupUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return error("UPCitemdb lookup temporarily unavailable.", response.status);
  }

  const data = await response.json();
  const item = data?.items?.[0];

  if (!item) {
    return json({ match: null });
  }

  const looksLikeWine =
    /wine|vin|vino|champagne|prosecco|cava|chardonnay|merlot|cabernet|sauvignon|pinot|shiraz|syrah|riesling|malbec|rioja|burgundy|bordeaux/i.test(
      `${item.title || ""} ${item.brand || ""} ${item.category || ""} ${item.description || ""}`
    );

  return json({
    match: {
      barcode: String(item.ean || item.upc || barcode),
      name: item.title || "",
      producer: item.brand || "",
      country: "",
      region: "",
      colour: "",
      photo: item.images?.[0] || "",
      source: "UPCitemdb",
      looksLikeWine,
      confidence: item.title || item.brand ? "medium" : "low",
    },
  });
}
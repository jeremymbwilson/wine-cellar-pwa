const WineLookup = (() => {
  function cleanTag(value = "") {
    return String(value)
      .replace(/^[a-z]{2}:/i, "")
      .replaceAll("-", " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  async function lookupOpenFoodFacts(barcode) {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error("The external product lookup is unavailable.");
    }

    const result = await response.json();
    if (result.status !== 1 || !result.product) return null;

    const product = result.product;
    const categories = [
      product.categories,
      ...(product.categories_tags || [])
    ].join(" ").toLowerCase();

    const looksLikeWine =
      categories.includes("wine") ||
      categories.includes("wines") ||
      categories.includes("alcoholic") ||
      String(product.product_name || "").toLowerCase().includes("wine");

    return {
      name: product.product_name_en || product.product_name || "",
      producer: product.brands || "",
      country: cleanTag(product.countries_tags?.[0] || product.countries || ""),
      region: cleanTag(product.origins_tags?.[0] || product.origins || ""),
      colour: "",
      grape: "",
      vintage: "",
      photo: product.image_front_url || product.image_url || "",
      looksLikeWine,
      source: "Open Food Facts"
    };
  }

  return { lookupOpenFoodFacts };
})();

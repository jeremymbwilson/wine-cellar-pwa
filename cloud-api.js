const WineCloud = (() => {
  const keyName = "wine-cellar-app-key";

  function getAppKey() {
    return localStorage.getItem(keyName) || "";
  }

  function setAppKey(value) {
    const cleaned = String(value || "").trim();
    if (cleaned) localStorage.setItem(keyName, cleaned);
    else localStorage.removeItem(keyName);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const key = getAppKey();
    if (key) headers.set("X-App-Key", key);

    const response = await fetch(path, { ...options, headers });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  const health = () => request("/api/health");
  const catalogueByBarcode = barcode => request(`/api/catalogue?barcode=${encodeURIComponent(barcode)}`);
  const identifyWine = image => request("/api/identify-wine", {
    method: "POST",
    body: JSON.stringify({ image })
  });
  const confirmWine = wine => request("/api/confirm-wine", {
    method: "POST",
    body: JSON.stringify(wine)
  });
  const estimateWindow = wine => request("/api/estimate-drinking-window", {
    method: "POST",
    body: JSON.stringify(wine)
  });
  const sommelier = payload => request("/api/sommelier", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    getAppKey, setAppKey, health, catalogueByBarcode,
    identifyWine, confirmWine, estimateWindow, sommelier
  };
})();

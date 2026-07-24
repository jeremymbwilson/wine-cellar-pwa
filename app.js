const App = (() => {
  let wines = [];
  let currentPhoto = "";
  let deferredPrompt = null;

  const $ = id => document.getElementById(id);
  const currentYear = new Date().getFullYear();

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    $(`${name}View`).classList.add("active");
    document.querySelector(`.tab[data-view="${name}"]`)?.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dateYear(value) {
    return value ? new Date(`${value}T12:00:00`).getFullYear() : null;
  }

  function statusFor(wine) {
    const from = dateYear(wine.drinkFrom);
    const by = dateYear(wine.drinkBy);
    if (!from && !by) return "unknown";
    if (by && currentYear > by) return "past";
    if (from && currentYear < from) return from <= currentYear + 1 ? "soon" : "keep";
    return "ready";
  }

  function statusLabel(status) {
    return ({
      ready: "Ready now",
      soon: "Ready within 12 months",
      keep: "Keep",
      past: "Past drinking window",
      unknown: "No drinking dates"
    })[status];
  }

  function wineTitle(wine) {
    return `${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}`;
  }

  function formatMoney(value) {
    if (value === "" || value === null || value === undefined) return "";
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
  }

  function wineCard(wine) {
    const status = statusFor(wine);
    const meta = [
      wine.producer,
      wine.region,
      wine.country,
      wine.location ? `Location: ${wine.location}` : ""
    ].filter(Boolean).join(" · ");

    return `
      <article class="wine-card" data-id="${wine.id}">
        ${wine.photo
          ? `<img class="wine-thumb" src="${wine.photo}" alt="Label for ${escapeHtml(wineTitle(wine))}">`
          : `<div class="wine-thumb wine-placeholder" aria-hidden="true">🍷</div>`}
        <div>
          <h3>${escapeHtml(wineTitle(wine))}</h3>
          <p class="wine-meta">${escapeHtml(meta || "No additional details")}</p>
          <p class="wine-meta"><strong>${Number(wine.quantity || 0)}</strong> bottle${Number(wine.quantity || 0) === 1 ? "" : "s"}</p>
          <span class="badge ${status}">${statusLabel(status)}</span>
        </div>
        <div class="wine-actions">
          <button data-action="details">Details</button>
          <button data-action="edit">Edit</button>
          <button data-action="add-one">+1 bottle</button>
          <button data-action="drink" ${Number(wine.quantity || 0) < 1 ? "disabled" : ""}>Drink one</button>
          <button data-action="delete">Delete</button>
        </div>
      </article>`;
  }

  function renderList(elementId, list) {
    const el = $(elementId);
    el.innerHTML = list.length
      ? list.map(wineCard).join("")
      : `<div class="empty-state">No wines match this view.</div>`;
  }

  function renderDashboard() {
    const totalBottles = wines.reduce((sum, wine) => sum + Number(wine.quantity || 0), 0);
    $("totalBottles").textContent = `${totalBottles} bottle${totalBottles === 1 ? "" : "s"}`;
    $("totalWines").textContent = `${wines.length} wine${wines.length === 1 ? "" : "s"} recorded`;

    const counts = { ready: 0, soon: 0, keep: 0, past: 0, unknown: 0 };
    wines.forEach(wine => counts[statusFor(wine)]++);
    $("readyCount").textContent = counts.ready;
    $("soonCount").textContent = counts.soon;
    $("keepCount").textContent = counts.keep;
    $("pastCount").textContent = counts.past;

    const filter = $("dashboardFilter").value;
    renderList("dashboardList", wines.filter(wine => statusFor(wine) === filter));
  }

  function renderInventory() {
    const query = $("searchInput").value.trim().toLowerCase();
    const filter = $("inventoryFilter").value;

    let list = wines.filter(wine => {
      const haystack = [
        wine.name, wine.producer, wine.region, wine.country,
        wine.location, wine.grape, wine.barcode
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    if (filter !== "all") {
      list = list.filter(wine => statusFor(wine) === filter);
    }

    list.sort((a, b) => wineTitle(a).localeCompare(wineTitle(b)));
    renderList("inventoryList", list);
  }

  async function refresh() {
    wines = await WineDB.getAll();
    renderDashboard();
    renderInventory();
  }

  function resetForm() {
    $("wineForm").reset();
    $("wineId").value = "";
    $("quantity").value = 1;
    $("formTitle").textContent = "Add a wine";
    currentPhoto = "";
    updatePhotoPreview();
  }

  function updatePhotoPreview() {
    if (currentPhoto) {
      $("photoPreview").src = currentPhoto;
      $("photoPreviewWrap").classList.remove("hidden");
    } else {
      $("photoPreview").removeAttribute("src");
      $("photoPreviewWrap").classList.add("hidden");
    }
  }

  async function resizeImage(file, maxDimension = 1100, quality = .78) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  function formValue(id) {
    return $(id).value.trim();
  }

  async function saveWine(event) {
    event.preventDefault();

    const drinkFrom = $("drinkFrom").value;
    const drinkBy = $("drinkBy").value;
    if (drinkFrom && drinkBy && drinkBy < drinkFrom) {
      showToast("Drink-by date cannot be before drink-from date.");
      return;
    }

    const id = $("wineId").value || uid();
    const existing = wines.find(w => w.id === id);

    const wine = {
      id,
      name: formValue("name"),
      producer: formValue("producer"),
      vintage: formValue("vintage"),
      country: formValue("country"),
      region: formValue("region"),
      colour: $("colour").value,
      grape: formValue("grape"),
      quantity: Number($("quantity").value || 0),
      location: formValue("location"),
      price: formValue("price"),
      purchaseDate: $("purchaseDate").value,
      drinkFrom,
      drinkBy,
      barcode: formValue("barcode"),
      rating: $("rating").value,
      notes: formValue("notes"),
      photo: currentPhoto,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!wine.name) {
      showToast("Please enter the wine name.");
      return;
    }

    await WineDB.put(wine);
    await refresh();
    resetForm();
    switchView("inventory");
    showToast("Wine saved.");
  }

  function populateForm(wine) {
    const fields = [
      "name", "producer", "vintage", "country", "region", "colour", "grape",
      "quantity", "location", "price", "purchaseDate", "drinkFrom", "drinkBy",
      "barcode", "rating", "notes"
    ];
    $("wineId").value = wine.id;
    fields.forEach(field => $(field).value = wine[field] ?? "");
    currentPhoto = wine.photo || "";
    updatePhotoPreview();
    $("formTitle").textContent = "Edit wine";
    switchView("add");
  }

  function showDetails(wine) {
    $("dialogContent").innerHTML = `
      ${wine.photo ? `<img class="dialog-photo" src="${wine.photo}" alt="Wine label">` : ""}
      <h2>${escapeHtml(wineTitle(wine))}</h2>
      <p><span class="badge ${statusFor(wine)}">${statusLabel(statusFor(wine))}</span></p>
      <p><strong>Producer:</strong> ${escapeHtml(wine.producer || "—")}</p>
      <p><strong>Region:</strong> ${escapeHtml([wine.region, wine.country].filter(Boolean).join(", ") || "—")}</p>
      <p><strong>Style:</strong> ${escapeHtml(wine.colour || "—")}</p>
      <p><strong>Grape:</strong> ${escapeHtml(wine.grape || "—")}</p>
      <p><strong>Quantity:</strong> ${Number(wine.quantity || 0)}</p>
      <p><strong>Location:</strong> ${escapeHtml(wine.location || "—")}</p>
      <p><strong>Purchase price:</strong> ${escapeHtml(formatMoney(wine.price) || "—")}</p>
      <p><strong>Drinking window:</strong> ${escapeHtml(wine.drinkFrom || "—")} to ${escapeHtml(wine.drinkBy || "—")}</p>
      <p><strong>Barcode:</strong> ${escapeHtml(wine.barcode || "—")}</p>
      <p><strong>Rating:</strong> ${escapeHtml(wine.rating ? `${wine.rating}/5` : "—")}</p>
      <p><strong>Notes:</strong><br>${escapeHtml(wine.notes || "—")}</p>`;
    $("detailsDialog").showModal();
  }

  async function handleCardAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".wine-card");
    const wine = wines.find(item => item.id === card.dataset.id);
    if (!wine) return;

    const action = button.dataset.action;
    if (action === "details") showDetails(wine);
    if (action === "edit") populateForm(wine);

    if (action === "add-one") {
      wine.quantity = Number(wine.quantity || 0) + 1;
      wine.updatedAt = new Date().toISOString();
      await WineDB.put(wine);
      await refresh();
      showToast("Bottle added.");
    }

    if (action === "drink") {
      if (Number(wine.quantity || 0) < 1) return;
      wine.quantity = Number(wine.quantity) - 1;
      wine.updatedAt = new Date().toISOString();
      await WineDB.put(wine);
      await refresh();
      showToast("One bottle marked as consumed.");
    }

    if (action === "delete" && confirm(`Delete ${wineTitle(wine)}?`)) {
      await WineDB.remove(wine.id);
      await refresh();
      showToast("Wine deleted.");
    }
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function exportJson() {
    const backup = {
      app: "My Wine Cellar",
      version: 1,
      exportedAt: new Date().toISOString(),
      wines
    };
    download(`wine-cellar-backup-${dateStamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
    showToast("Backup exported.");
  }

  function csvCell(value) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }

  function exportCsv() {
    const headers = [
      "Name","Producer","Vintage","Country","Region","Colour","Grape","Quantity",
      "Location","Price","Purchase date","Drink from","Drink by","Barcode","Rating","Notes"
    ];
    const rows = wines.map(w => [
      w.name,w.producer,w.vintage,w.country,w.region,w.colour,w.grape,w.quantity,
      w.location,w.price,w.purchaseDate,w.drinkFrom,w.drinkBy,w.barcode,w.rating,w.notes
    ].map(csvCell).join(","));
    download(`wine-cellar-${dateStamp()}.csv`, [headers.map(csvCell).join(","), ...rows].join("\r\n"), "text/csv;charset=utf-8");
    showToast("CSV exported.");
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Array.isArray(parsed) ? parsed : parsed.wines;
      if (!Array.isArray(imported)) throw new Error("No wines array");

      if (!confirm(`Restore ${imported.length} wine records? This replaces the current inventory.`)) return;

      const cleaned = imported.map(w => ({
        ...w,
        id: w.id || uid(),
        quantity: Number(w.quantity || 0),
        updatedAt: w.updatedAt || new Date().toISOString(),
        createdAt: w.createdAt || new Date().toISOString()
      }));

      await WineDB.replaceAll(cleaned);
      await refresh();
      showToast("Backup restored.");
    } catch (error) {
      console.error(error);
      showToast("That file is not a valid wine-cellar backup.");
    } finally {
      $("importJson").value = "";
    }
  }

  async function clearAll() {
    if (!confirm("Delete every wine stored on this device? This cannot be undone without a backup.")) return;
    await WineDB.clear();
    await refresh();
    showToast("All local data deleted.");
  }


  function fillIfBlank(id, value) {
    if (!value) return;
    const field = $(id);
    if (field && !field.value.trim()) field.value = value;
  }

  async function lookupBarcode(barcode) {
    const cleaned = String(barcode || "").trim();
    if (!cleaned) {
      showToast("Enter or scan a barcode first.");
      return;
    }

    $("barcode").value = cleaned;

    const localMatch = wines.find(wine => String(wine.barcode || "").trim() === cleaned);
    if (localMatch) {
      const useLocal = confirm(
        `This barcode is already saved as ${wineTitle(localMatch)}.\n\n` +
        "Select OK to use its product details in the form."
      );
      if (useLocal) {
        const copy = { ...localMatch, id: "", quantity: 1, vintage: "" };
        $("wineId").value = "";
        [
          "name", "producer", "country", "region", "colour", "grape",
          "location", "price", "rating", "notes"
        ].forEach(field => $(field).value = copy[field] ?? "");
        $("quantity").value = 1;
        $("barcode").value = cleaned;
        currentPhoto = copy.photo || "";
        updatePhotoPreview();
        switchView("add");
        showToast("Known wine details loaded. Please confirm the vintage.");
      }
      return;
    }

    showToast("Looking up barcode…");

    try {
      const product = await WineLookup.lookupOpenFoodFacts(cleaned);
      if (!product) {
        showToast("No external product match was found. Enter the wine manually.");
        return;
      }

      const summary = [
        product.name ? `Name: ${product.name}` : "",
        product.producer ? `Producer/brand: ${product.producer}` : "",
        product.country ? `Country: ${product.country}` : "",
        product.region ? `Origin: ${product.region}` : "",
        "",
        product.looksLikeWine
          ? "The source appears to classify this as a wine or alcoholic product."
          : "The source did not clearly classify this as wine.",
        "",
        "Use these suggested details? Please verify every field, especially the vintage."
      ].filter(line => line !== undefined).join("\n");

      if (!confirm(summary)) return;

      fillIfBlank("name", product.name);
      fillIfBlank("producer", product.producer);
      fillIfBlank("country", product.country);
      fillIfBlank("region", product.region);
      $("barcode").value = cleaned;

      if (!currentPhoto && product.photo) {
        currentPhoto = product.photo;
        updatePhotoPreview();
      }

      switchView("add");
      showToast("Suggested product details loaded. Please check them before saving.");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Barcode lookup failed.");
    }
  }

  async function startBarcodeScan() {
    try {
      await BarcodeScanner.start(async barcode => {
        $("barcode").value = barcode;
        await lookupBarcode(barcode);
      });
    } catch (error) {
      console.error(error);
      showToast(error.message || "The barcode scanner could not start.");
    }
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(console.error);
      });
    }
  }

  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredPrompt = event;
      $("installButton").classList.remove("hidden");
    });

    $("installButton").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      $("installButton").classList.add("hidden");
    });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach(tab =>
      tab.addEventListener("click", () => switchView(tab.dataset.view))
    );

    $("wineForm").addEventListener("submit", saveWine);
    $("cancelEdit").addEventListener("click", () => {
      resetForm();
      switchView("inventory");
    });
    $("addFromInventory").addEventListener("click", () => {
      resetForm();
      switchView("add");
    });

    $("searchInput").addEventListener("input", renderInventory);
    $("inventoryFilter").addEventListener("change", renderInventory);
    $("dashboardFilter").addEventListener("change", renderDashboard);

    $("inventoryList").addEventListener("click", handleCardAction);
    $("dashboardList").addEventListener("click", handleCardAction);

    $("labelPhoto").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        currentPhoto = await resizeImage(file);
        updatePhotoPreview();
      } catch {
        showToast("The photograph could not be processed.");
      }
    });

    $("removePhoto").addEventListener("click", () => {
      currentPhoto = "";
      $("labelPhoto").value = "";
      updatePhotoPreview();
    });

    $("exportJson").addEventListener("click", exportJson);
    $("exportCsv").addEventListener("click", exportCsv);
    $("importJson").addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) importJson(file);
    });
    $("clearAll").addEventListener("click", clearAll);

    $("scanBarcodeButton").addEventListener("click", startBarcodeScan);
    $("lookupBarcodeButton").addEventListener("click", () => lookupBarcode($("barcode").value));
    $("closeScannerButton").addEventListener("click", BarcodeScanner.stop);
    document.querySelectorAll(".tab").forEach(tab =>
      tab.addEventListener("click", () => BarcodeScanner.stop())
    );
  }

  async function initialise() {
    bindEvents();
    registerServiceWorker();
    setupInstallPrompt();
    resetForm();
    await refresh();
  }

  return { initialise };
})();

document.addEventListener("DOMContentLoaded", App.initialise);

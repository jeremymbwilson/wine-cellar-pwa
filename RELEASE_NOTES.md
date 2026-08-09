# My Wine Cellar v3.2.1 Preview 2

## iPhone scanner fix
- ZXing now loads on demand when Scan Barcode is tapped.
- Uses the ZXing project's documented UNPKG browser loading route first, with jsDelivr as a fallback.
- Requests the rear-facing camera at a higher ideal resolution for easier barcode focus.
- Bumps the service-worker cache so iPhones receive the updated scanner code.
- Smart Capture lookup, local duplicate matching and Add One Bottle behaviour are unchanged.

# Version 3.2.1 Preview 1 — Smart Capture

- Barcode-first add workflow.
- Local barcode duplicate detection.
- One-tap quantity increase for known wines.
- External Open Food Facts lookup for unknown barcodes.
- Review panel with confidence indication before applying suggestions.
- Scanner library reference updated to @zxing/browser 0.2.1.
- Service-worker cache bumped for this preview.

# Version 3.1 Release Notes

## New

- Premium responsive interface with five primary areas: Dashboard, Cellar, Add, Insights and Settings.
- Richer wine records: cellar/rack/bin, case reference, bottle size, appellation, merchant, current value, favourites and tasting history.
- Three photographs per wine: front label, rear label and bottle.
- Advanced cellar search, filtering and sorting.
- Collection-value and composition insights.
- CSV import in addition to CSV export.
- Backwards-compatible import of Version 2 and Version 3A JSON backups.

## Retained

- Local-only inventory.
- Offline use.
- Drinking-window dashboard.
- Barcode scanning.
- Open Food Facts lookup.
- JSON backup and restore.

## Not included

Cloud AI, a shared online catalogue and an AI sommelier are deliberately excluded from Version 3.1. They will be developed as a separate, tested backend release.

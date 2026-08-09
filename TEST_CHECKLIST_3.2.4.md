# v3.2.4 Testing Preview 1 — Test Checklist

Do not alter the live v3.2.3 external-test deployment.

## Smart Capture
- Scan a known local barcode: existing-wine flow still works.
- Scan a new recognised barcode: external match still works.
- Scan an unknown barcode: label fallback appears.
- Use Photograph label instead: camera opens.
- Accept the photo: Smart Recognition starts automatically.
- Confirm recognition still returns correct wine details.

## Enrichment
- Choose **Use details + estimate drinking window**.
- Confirm an estimate appears.
- Check drink-from / peak / drink-by years are plausible.
- Confirm food pairing and serving guidance appear.
- Confirm the screen clearly says the result is an AI estimate.
- Choose Apply estimated dates and confirm the date fields populate.
- Correct the dates manually and save.

## Manual record
- Enter a wine name and vintage manually.
- Tap Estimate drinking window.
- Confirm the estimate works without label recognition.

## Regression
- Save a wine.
- Reopen it.
- Edit and save.
- Export a JSON backup.
- Confirm barcode Add one bottle still works.

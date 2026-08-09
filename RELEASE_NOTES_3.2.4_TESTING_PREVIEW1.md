# My Wine Cellar v3.2.4 — Testing Preview 1

## Status

TESTING ONLY. Do not deploy over the frozen v3.2.3 Preview 3 external-test build.

## Main changes

### 1. Faster label fallback
When **Photograph label instead** is used from Smart Capture, label recognition now starts automatically after the photograph is accepted.

### 2. Recognition metadata retained
The saved wine record can retain:
- recognition method
- recognition confidence
- recognition warnings
- recognition timestamp

This prepares the data model for later confidence and audit views.

### 3. Drinking-window enrichment
After a successful label recognition, the user can choose:
**Use details + estimate drinking window**

The new Gemini enrichment function returns cautious AI guidance for:
- Drink from year
- Likely peak range
- Drink by year
- Style summary
- Food pairing ideas
- Serving temperature
- Confidence
- Basis and assumptions

The dates are NEVER applied automatically. The user must explicitly choose **Apply estimated dates**.

### 4. Manual enrichment
Any wine with a confirmed name and vintage can use the new **Estimate drinking window** button, even if it was entered manually or found by barcode.

## Important

Drinking-window results are explicitly labelled as **AI estimates**, not published critic or producer recommendations.

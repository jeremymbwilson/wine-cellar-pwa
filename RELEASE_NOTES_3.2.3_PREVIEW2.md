# My Wine Cellar v3.2.3 Preview 2 — Smart Recognition fix

## Purpose

A focused fix for the Gemini `400 INVALID_ARGUMENT` response seen in Preview 1.

## Changes

- Uses Gemini's JSON Schema configuration (`responseJsonSchema`) rather than the older OpenAPI-style `responseSchema`.
- Uses standard JSON Schema types (`object`, `string`, `integer`, `boolean`, `array`).
- Allows an unknown vintage to be returned as `null` without inventing a year.
- Adds clearer server-side Gemini error logging.
- Returns the Gemini API error message to the preview UI when a recognition request is rejected.
- Leaves barcode scanning, local duplicate handling and label capture unchanged.

## Test

1. Photograph a front label.
2. Tap **Recognise wine from label**.
3. Confirm that suggested details appear.
4. Check producer, wine, vintage, country, region and appellation against the physical bottle.
5. Do not rely on AI suggestions without reviewing them.

# My Wine Cellar v3.2.3 Preview 3 — Gemini model update

## Purpose

A surgical fix for the Gemini model availability error found in Preview 2.

## Change

- Updated Smart Recognition from `gemini-2.5-flash-lite` to the stable `gemini-3.1-flash-lite` model.
- No barcode, label-capture, inventory, UI or storage logic has been changed.
- Preview 2's enhanced Gemini error logging remains in place.

## Test

Repeat the same no-barcode label test:
1. Photograph the front label.
2. Tap **Recognise wine from label**.
3. Review the returned suggestions before saving.

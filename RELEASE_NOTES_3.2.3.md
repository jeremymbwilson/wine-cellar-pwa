# v3.2.3 Preview 1 — Smart Recognition

- Adds **Recognise wine from label** after a front-label photograph is captured.
- Sends the compressed label image to a Cloudflare Pages Function.
- The server-side function calls Gemini 2.5 Flash-Lite and requests structured wine metadata.
- Returns producer, wine name, vintage, country, region, appellation, style, grapes, confidence and warnings.
- Suggestions are never saved automatically; the user must choose **Use these details** and review/correct them.
- API key remains server-side in the `GEMINI_API_KEY` Cloudflare secret.
- Barcode and local duplicate workflows from v3.2.1/v3.2.2 remain unchanged.

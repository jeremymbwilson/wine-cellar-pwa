# My Wine Cellar v3.2.3 Preview 1 — Smart Recognition test

1. Open Add Wine and tap Photograph label instead.
2. Photograph a front wine label and accept the photo.
3. Confirm the label preview appears.
4. Tap **Recognise wine from label**.
5. Confirm a result appears with confidence plus producer/wine/vintage/origin where identifiable.
6. Check every suggestion against the physical bottle.
7. Tap **Use these details** and confirm blank fields are populated.
8. Correct anything necessary, add location/quantity, and Save.
9. Test one difficult/old/obscure label and confirm uncertain fields are not confidently invented.

If you see “Smart Recognition is not configured yet”, add the `GEMINI_API_KEY` secret to the Cloudflare Pages project and redeploy.


## Preview 2 regression
- Repeat the label that returned HTTP 400 in Preview 1.
- If it fails, record the full on-screen Gemini error message and Cloudflare response status.


## Preview 3 model update
- Repeat the same label that reached Gemini but failed because the 2.5 Flash-Lite model was unavailable.
- Confirm Smart Recognition returns structured wine suggestions using Gemini 3.1 Flash-Lite.

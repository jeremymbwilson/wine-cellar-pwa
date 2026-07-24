# Wine Cellar Version 3B–D: implementation guide

This package adds:

- AI wine-label identification
- Private Cloudflare D1 shared wine catalogue
- Barcode-first lookup against the shared catalogue
- User-confirmed catalogue learning
- Suggested drinking windows with confidence and rationale
- Personal sommelier recommendations based on a restricted local shortlist
- Existing local inventory, photographs, backup and offline support

## Important design

Your quantities, purchase prices, storage locations and personal notes remain in IndexedDB on each phone. Only confirmed reusable wine metadata is sent to D1 when the checkbox is selected.

## A. Back up the live app

1. Open the existing PWA and select **Backup → Export full backup**.
2. Download the current GitHub repository as a ZIP.
3. Keep both backups safely.

## B. Install Node.js and Wrangler on Windows

1. Install the current Node.js LTS release from the official Node.js website.
2. Restart Visual Studio Code.
3. Open this package folder in Visual Studio Code.
4. Select **Terminal → New Terminal**.
5. Run: `npm install -D wrangler`
6. Run: `npx wrangler login` and authorise Cloudflare in the browser.

## C. Create the D1 database

In the Visual Studio Code terminal run:

`npx wrangler d1 create wine-cellar-catalogue`

Copy the returned `database_id`.

1. Rename `wrangler.toml.example` to `wrangler.toml`.
2. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the copied ID.
3. Run the migration remotely:

`npx wrangler d1 migrations apply wine-cellar-catalogue --remote`

Answer **Yes** when asked.

## D. Upload the package to GitHub

Upload all package contents to the root of your existing repository, including:

- `functions`
- `migrations`
- `cloud-api.js`
- `wrangler.toml`
- all existing PWA files

Commit message: `Add label recognition shared catalogue and sommelier`

Do not upload an API key. `wrangler.toml` contains only the database ID, not a secret.

## E. Bind D1 in Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages**.
2. Open your Wine Cellar Pages project.
3. **Settings → Bindings → Add → D1 database binding**.
4. Variable name: `DB`.
5. Select `wine-cellar-catalogue`.
6. Save.
7. Repeat for Preview if you use branch previews.
8. Redeploy the latest deployment.

## F. Create an OpenAI API key and budget

ChatGPT Plus does not include API usage.

1. Sign in to the OpenAI developer platform.
2. Add a payment method or prepaid credit.
3. Set a low project budget and usage alert.
4. Create an API key and copy it once.

## G. Add Cloudflare secrets and variables

In the Pages project, open **Settings → Variables and Secrets** for Production.

Add secrets:

- `OPENAI_API_KEY` = your OpenAI API key
- `APP_ACCESS_KEY` = a private password-like value you invent, ideally 20+ random characters

Optional plain-text variable:

- `OPENAI_MODEL` = `gpt-5.6`

Repeat for Preview if required, then redeploy.

## H. Test the API

Open your live site and add `/api/health` to the end of its address. You should see JSON showing database and AI configured.

In the PWA:

1. Open **Backup**.
2. Enter the same `APP_ACCESS_KEY`.
3. Select **Save key on this device**.
4. Select **Test cloud connection**.

## I. Test label identification

1. Open **Add wine**.
2. Take a clear photograph of the front label.
3. Select **Identify wine from label**.
4. Review the proposed fields.
5. Select **Use suggested details**.
6. Correct anything wrong, especially vintage.
7. Save the wine.

## J. Test drinking-window estimation

1. Confirm wine name and vintage.
2. Select storage conditions and bottle size.
3. Select **Suggest drinking window**.
4. Review confidence, rationale and warning.
5. Select **Apply suggested dates** or retain your own dates.
6. Save the wine.

The generated dates are estimates unless you independently enter a source-backed recommendation.

## K. Test shared catalogue learning

1. Save a wine with **Share confirmed wine metadata** selected.
2. Scan the same barcode on the other iPhone.
3. The private catalogue should be checked before Open Food Facts.
4. The second phone should receive the confirmed reusable metadata.

## L. Test the sommelier

1. Add several wines with quantities above zero.
2. Open **Sommelier**.
3. Enter a meal or occasion and number of people.
4. Select **Ask the sommelier**.
5. The endpoint receives only a restricted candidate list, not price, location, photograph or personal notes.

## M. Restore your existing cellar

Use **Backup → Restore backup** and select the JSON exported from the previous version. Older records remain valid; new fields will be blank until edited.

## Troubleshooting

- **401 Access key**: the key saved in the PWA does not exactly match `APP_ACCESS_KEY` in Cloudflare.
- **Database missing**: confirm the Pages binding is named exactly `DB`, then redeploy.
- **AI missing**: confirm `OPENAI_API_KEY` is a Secret for the correct environment, then redeploy.
- **Function 404**: confirm the `functions` folder is at the repository root.
- **Live Server does not run APIs**: use the deployed Cloudflare URL, or run `npx wrangler pages dev .` for local full-stack testing.
- **Old version appears**: close and reopen the PWA twice, or remove and re-add it after exporting a backup.

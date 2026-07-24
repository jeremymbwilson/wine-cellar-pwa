# My Wine Cellar PWA

A local-first progressive web app for tracking a personal wine cellar.

## Included features

- Add, edit and delete wine records
- Bottle quantities and "drink one" action
- Drinking-window dashboard
- Search and filtering
- Label photograph capture with automatic resizing
- Local IndexedDB storage
- JSON backup and restore
- CSV export
- Offline app shell
- Installable PWA manifest

## Run locally

1. Open this folder in Visual Studio Code.
2. Install the Live Server extension.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

## Publish

Upload all files to a GitHub repository and connect that repository to Cloudflare Pages.

Framework preset: **None**
Build command: leave blank
Output directory: `/` or leave blank if permitted.

## Important

Data is stored only on each device. Export a JSON backup regularly.


## Version 3A additions

- Live barcode scanning using the iPhone rear camera
- Local barcode matching
- Open Food Facts product lookup
- Suggested form population with manual confirmation

The scanner library is loaded from jsDelivr. Internet access is required the first time the scanner is used.

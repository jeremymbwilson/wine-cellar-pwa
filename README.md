# My Wine Cellar — Version 3.1

A stable, offline-first Progressive Web App for personal wine-cellar management.

## Version 3.1 features

- Redesigned dashboard and navigation
- Advanced search, filters and sorting
- Multiple cellars, racks, bins and case references
- Bottle sizes, purchase price and estimated current value
- Favourites, ratings, tasting notes and last-tasted date
- Front-label, rear-label and bottle photographs
- Drinking-window dashboard
- Collection insights by country, style, vintage and location
- Barcode scanning and Open Food Facts lookup
- JSON backup/restore
- CSV export and import
- Backwards compatibility with older JSON backups
- Offline app shell and iPhone Home Screen installation

## Run locally

Open the folder in Visual Studio Code, right-click `index.html`, and choose **Open with Live Server**.

## Publish

Upload the contents of this folder to the root of your existing GitHub repository. Your static Cloudflare deployment can then publish the repository.

## Privacy

Personal inventory remains in IndexedDB on the device. Open Food Facts is contacted only when the user chooses barcode lookup.

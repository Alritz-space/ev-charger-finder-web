# EV Charger Finder Web

Responsive browser version of the EV Charger Finder MVP.

## What is included

- Email, first name, and country onboarding.
- Country selection using a fast bundled country list generated from the station Sheet.
- Optional vehicle and address profile fields.
- Current-location search using browser geolocation.
- Country-based fallback suggestions.
- Google Maps preview for the selected station.
- Responsive layout for desktop and mobile browsers.

## Run locally

This web app reads live station data from a published Google Sheet CSV URL.

Start the web app:

```bash
cd web
npm run start
```

Confirm `web/config.js` has your published Sheet CSV URL:

```js
window.EV_CHARGER_CONFIG = {
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv"
};
```

Open:

```text
http://localhost:5174
```

If `GOOGLE_SHEET_CSV_URL` is empty or the Sheet is not public, the app will not show charging-station results.
The country dropdown appears immediately from `countries.js`. When the larger
station CSV later loads for recommendations, the app can refresh the dropdown
from the live Sheet data without blocking Step 1.

## Weekly country-list refresh

The repository includes a GitHub Actions workflow:

```text
.github/workflows/update-countries.yml
```

It runs every Sunday at **11:00 PM IST** and updates `countries.js` plus
`countries.json` from the published Google Sheet CSV. You can also run it
manually from GitHub:

```text
Actions > Update country list > Run workflow
```

## Configure Google Sheet URL

Edit `config.js` when your published Sheet URL changes:

```js
window.EV_CHARGER_CONFIG = {
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv"
};
```

Do not put secrets in this file. It is sent to every browser user.

Expected Sheet columns:

```text
sourceId,country,address,latitude,longitude,vehicleSupport,portCount,capacityKw,priceType
```

## Publish on GitHub Pages

Upload these files to the root of a GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `countries.js`
- `countries.json`
- `package.json`
- `README.md`
- `DATABASE_UPDATE.md`
- `.github/workflows/update-countries.yml`
- `scripts/update-countries-from-sheet.mjs`

Then open repository **Settings > Pages**, choose **Deploy from a branch**,
select `main` and `/root`, then click **Save**.

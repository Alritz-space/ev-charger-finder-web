# How to update the EV charging-station database

The public web app reads station data from a published Google Sheet CSV URL configured in `config.js`.

Expected Sheet columns:

```text
sourceId,country,address,latitude,longitude,vehicleSupport,portCount,capacityKw,priceType
```

To update station data:

1. Open your Google Sheet.
2. Add/edit station rows under the header row.
3. Keep the Sheet published to web as CSV.
4. Refresh the GitHub Pages website.

The onboarding country dropdown appears immediately from `countries.js`, which
contains the country names generated from the station data. When the larger CSV
loads for station recommendations, the app can refresh the dropdown from the
live Sheet without blocking Step 1.

If you add a brand-new country and want it to appear immediately on first page
load, also add that country name to `countries.js`.

## Automatic weekly country update

GitHub Actions can refresh `countries.js` and `countries.json` automatically
from the published Google Sheet CSV every Sunday at **11:00 PM IST**.

Required files in your GitHub repository:

```text
.github/workflows/update-countries.yml
scripts/update-countries-from-sheet.mjs
```

The workflow can also be run manually from:

```text
Actions > Update country list > Run workflow
```

For your repository, the public country JSON URL should be:

```text
https://alritz-space.github.io/ev-charger-finder-web/countries.json
```

Your current CSV URL:

```text
https://docs.google.com/spreadsheets/d/e/2PACX-1vSO7uiuMy5HgadxV_7xisR_PL58tUbJ4bXEDDFN0xReNb38tt3kpkgzp6wwkC1tpryT5Rnf2sOPku7C/pub?gid=0&single=true&output=csv
```

## Optional large database mode

Use the backend project for real charging-station updates.

### 1. Start backend database

```bash
cd backend
docker compose up -d db
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Run migrations

```bash
npm run migrate
```

### 4. Configure source feeds

Create `.env` from `.env.example`, then configure:

```text
OCM_EXPORT_URL
AFDC_DOWNLOAD_URL
FRANCE_IRVE_DOWNLOAD_URL
INDIA_BEE_CEA_DOWNLOAD_URL
INDIA_BEE_CEA_LOCAL_CSV
WEEKLY_REFRESH_CRON
```

### 5. Refresh station data

All configured sources:

```bash
npm run refresh:all
```

Individual sources:

```bash
npm run refresh
npm run refresh:afdc
npm run refresh:france
npm run refresh:india
```

### 6. Export or host data

For the current Google Sheet approach, export/import curated rows into the Sheet.

## Weekly updates

The backend can refresh weekly using:

```text
WEEKLY_REFRESH_CRON=0 3 * * 0
```

This means every Sunday at 03:00 on the backend server.

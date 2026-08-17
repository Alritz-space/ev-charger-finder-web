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

The onboarding country dropdown is generated automatically from the unique
values in the `country` column. If a country does not appear, make sure at least
one station row uses that country name and wait for the published CSV to refresh.

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

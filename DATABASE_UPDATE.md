# How to update the EV charging-station database

The public web app can run in browser-only demo mode, but live station data needs the backend/database.

## Demo mode

The public GitHub Pages version uses demo stations inside `app.js` when no backend API is configured.

To change demo stations:

1. Open `app.js`.
2. Find `demoStations`.
3. Add/edit station records.
4. Upload the updated `app.js` to GitHub.

## Live database mode

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

### 6. Host backend and update web config

After hosting the backend, update `config.js`:

```js
window.EV_CHARGER_CONFIG = {
  API_BASE_URL: "https://your-hosted-backend.example.com"
};
```

Then upload the updated `config.js` to GitHub.

## Weekly updates

The backend can refresh weekly using:

```text
WEEKLY_REFRESH_CRON=0 3 * * 0
```

This means every Sunday at 03:00 on the backend server.

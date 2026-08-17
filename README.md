# EV Charger Finder Web

Responsive browser version of the EV Charger Finder MVP.

## What is included

- Email, first name, and country onboarding.
- Optional vehicle and address profile fields.
- Current-location search using browser geolocation.
- Country-based fallback suggestions.
- Google Maps preview for the selected station.
- Responsive layout for desktop and mobile browsers.

## Run locally

The public web app can run in browser-only demo mode without a backend.

Start the web app:

```bash
cd web
npm run start
```

Open:

```text
http://localhost:5174
```

To test with the local demo API, start the backend:

```bash
cd backend
npm run dev:demo
```

Then edit `web/config.js`:

```js
window.EV_CHARGER_CONFIG = {
  API_BASE_URL: "http://localhost:3000"
};
```

If `API_BASE_URL` is empty, the app uses browser-only demo stations.

## Configure backend URL

Edit `config.js` when your backend is hosted somewhere else:

```js
window.EV_CHARGER_CONFIG = {
  API_BASE_URL: "https://your-backend.example.com"
};
```

Do not put secrets in this file. It is sent to every browser user.

## Publish on GitHub Pages

Upload these files to the root of a GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `package.json`
- `README.md`

Then open repository **Settings > Pages**, choose **Deploy from a branch**,
select `main` and `/root`, then click **Save**.

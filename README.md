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

Start the demo API:

```bash
cd ../backend
npm run dev:demo
```

Start the web app:

```bash
cd ../web
python3 -m http.server 5174
```

Open:

```text
http://localhost:5174
```

The app uses `http://localhost:3000` for the backend when opened locally.

## Configure backend URL

Edit `config.js` when your backend is hosted somewhere else:

```js
window.EV_CHARGER_CONFIG = {
  API_BASE_URL: "https://your-backend.example.com"
};
```

Do not put secrets in this file. It is sent to every browser user.

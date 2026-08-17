const configuredApiBaseUrl = window.EV_CHARGER_CONFIG?.API_BASE_URL?.trim();
const apiBaseUrl =
  window.localStorage.getItem("evApiBaseUrl") ||
  configuredApiBaseUrl ||
  "";

const demoStations = [
  {
    sourceId: "demo-in-delhi-001",
    country: "India",
    address: "BEE EV Yatra Demo Charger, Connaught Place, New Delhi",
    latitude: 28.6315,
    longitude: 77.2167,
    vehicleSupport: "Both 2W & 4W",
    portCount: 6,
    capacityKw: "60",
    priceType: "Paid",
    distanceMeters: null
  },
  {
    sourceId: "demo-in-mumbai-001",
    country: "India",
    address: "Demo Fast DC Hub, Bandra Kurla Complex, Mumbai",
    latitude: 19.0676,
    longitude: 72.8676,
    vehicleSupport: "4W",
    portCount: 8,
    capacityKw: "120",
    priceType: "Paid",
    distanceMeters: null
  },
  {
    sourceId: "demo-in-bengaluru-001",
    country: "India",
    address: "Demo 2W Swap and EV Charging Hub, Indiranagar, Bengaluru",
    latitude: 12.9719,
    longitude: 77.6412,
    vehicleSupport: "2W",
    portCount: 12,
    capacityKw: "7.4",
    priceType: "Paid",
    distanceMeters: null
  },
  {
    sourceId: "demo-us-sf-001",
    country: "United States",
    address: "Demo Public EV Charger, Market Street, San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    vehicleSupport: "4W",
    portCount: 10,
    capacityKw: "150",
    priceType: "Paid",
    distanceMeters: null
  }
];

const elements = {
  apiStatusDot: document.querySelector("#apiStatusDot"),
  apiStatusText: document.querySelector("#apiStatusText"),
  onboardingSection: document.querySelector("#onboardingSection"),
  finderSection: document.querySelector("#finderSection"),
  profileForm: document.querySelector("#profileForm"),
  editProfileButton: document.querySelector("#editProfileButton"),
  useLocationButton: document.querySelector("#useLocationButton"),
  browseButton: document.querySelector("#browseButton"),
  welcomeMessage: document.querySelector("#welcomeMessage"),
  message: document.querySelector("#message"),
  stationList: document.querySelector("#stationList"),
  resultCount: document.querySelector("#resultCount"),
  selectedStationTitle: document.querySelector("#selectedStationTitle"),
  openGoogleMapsLink: document.querySelector("#openGoogleMapsLink"),
  mapFrame: document.querySelector("#mapFrame")
};

let currentProfile = JSON.parse(window.localStorage.getItem("evProfile") || "null");
let stations = [];
let selectedStation = null;

async function apiFetch(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error("No backend API configured.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `API request failed with ${response.status}`);
  }

  return body;
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const earthRadiusMeters = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function localRecommendations({ country, lat, lng, limit = 8 }) {
  const countryMatches = country
    ? demoStations.filter((station) => station.country.toLowerCase().includes(country.toLowerCase()))
    : demoStations;
  const candidates = countryMatches.length ? countryMatches : demoStations;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return candidates
      .map((station) => ({
        ...station,
        distanceMeters: distanceMeters(lat, lng, station.latitude, station.longitude)
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);
  }

  return candidates
    .map((station) => ({ ...station, distanceMeters: null }))
    .sort((a, b) => (b.portCount || 0) - (a.portCount || 0))
    .slice(0, limit);
}

async function saveProfile(payload) {
  try {
    const response = await apiFetch("/users/onboarding", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.profile;
  } catch {
    return {
      email: String(payload.email || "").trim().toLowerCase(),
      firstName: String(payload.firstName || "").trim(),
      country: String(payload.country || "").trim(),
      lastName: payload.lastName || null,
      vehicleKind: payload.vehicleKind || "Unknown",
      mobileNumber: payload.mobileNumber || null,
      addressLine1: payload.addressLine1 || null,
      addressLine2: payload.addressLine2 || null,
      state: payload.state || null,
      city: payload.city || null,
      zip: payload.zip || null,
      lastLatitude: null,
      lastLongitude: null
    };
  }
}

async function getRecommendations({ country, lat, lng, limit = 8 }) {
  const params = new URLSearchParams({
    country,
    limit: String(limit)
  });

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  try {
    const response = await apiFetch(`/recommendations?${params.toString()}`);
    return response.stations || [];
  } catch {
    return localRecommendations({ country, lat, lng, limit });
  }
}

function setApiStatus(online) {
  elements.apiStatusDot.classList.toggle("online", online);
  elements.apiStatusDot.classList.toggle("offline", !online);
  elements.apiStatusText.textContent = online ? "API online" : "API offline";
}

function setMessage(text, isError = false) {
  elements.message.textContent = text || "";
  elements.message.classList.toggle("error", isError);
}

function stationDistanceText(station) {
  if (Number.isFinite(station.distanceMeters)) {
    return `${Math.round(station.distanceMeters / 1000)} km`;
  }
  return "Country suggestion";
}

function googleMapsEmbedUrl(station) {
  return `https://maps.google.com/maps?q=${station.latitude},${station.longitude}&z=14&output=embed`;
}

function googleMapsOpenUrl(station) {
  const query = encodeURIComponent(`${station.latitude},${station.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function updateMap(station) {
  selectedStation = station;
  elements.selectedStationTitle.textContent = station.address;
  elements.openGoogleMapsLink.href = googleMapsOpenUrl(station);
  elements.mapFrame.src = googleMapsEmbedUrl(station);
  renderStationList();
}

function renderStationList() {
  elements.resultCount.textContent = String(stations.length);
  elements.stationList.innerHTML = "";

  if (!stations.length) {
    elements.stationList.innerHTML = `<p class="subtle">No station suggestions loaded yet.</p>`;
    return;
  }

  for (const station of stations) {
    const card = document.createElement("button");
    card.className = "station-card";
    card.type = "button";
    card.setAttribute("aria-current", selectedStation?.sourceId === station.sourceId ? "true" : "false");
    card.innerHTML = `
      <h3>${station.address}</h3>
      <div class="station-meta">
        <span><strong>Distance:</strong> ${stationDistanceText(station)}</span>
        <span><strong>Vehicle:</strong> ${station.vehicleSupport}</span>
        <span><strong>Ports:</strong> ${station.portCount ?? "Unknown"}</span>
        <span><strong>Power:</strong> ${station.capacityKw ?? "Unknown"} kW</span>
        <span><strong>Price:</strong> ${station.priceType}</span>
        <span><strong>Country:</strong> ${station.country ?? "Unknown"}</span>
      </div>
    `;
    card.addEventListener("click", () => updateMap(station));
    elements.stationList.append(card);
  }
}

function showFinder() {
  elements.onboardingSection.classList.add("hidden");
  elements.finderSection.classList.remove("hidden");
  elements.welcomeMessage.textContent = `Hi ${currentProfile.firstName}. Suggestions will use your location when available, otherwise ${currentProfile.country}.`;
}

function showOnboarding() {
  elements.finderSection.classList.add("hidden");
  elements.onboardingSection.classList.remove("hidden");
}

function fillProfileForm(profile) {
  if (!profile) {
    return;
  }

  for (const [key, value] of Object.entries(profile)) {
    const input = elements.profileForm.elements[key];
    if (input && value != null) {
      input.value = value;
    }
  }
}

function profilePayloadFromForm() {
  const formData = new FormData(elements.profileForm);
  return Object.fromEntries(formData.entries());
}

async function loadCountrySuggestions(message = null) {
  stations = await getRecommendations({ country: currentProfile.country, limit: 8 });
  setMessage(message || `Showing suggestions based on ${currentProfile.country}.`);
  renderStationList();
  if (stations[0]) {
    updateMap(stations[0]);
  }
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    await loadCountrySuggestions("Location is not supported in this browser. Showing country suggestions.");
    return;
  }

  setMessage("Getting your current location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        await apiFetch("/users/location", {
          method: "POST",
          body: JSON.stringify({
            email: currentProfile.email,
            lat: latitude,
            lng: longitude
          })
        }).catch(() => null);

        stations = await getRecommendations({
          country: currentProfile.country,
          lat: latitude,
          lng: longitude,
          limit: 8
        });
        setMessage("Showing nearest stations from your current location.");
        renderStationList();
        if (stations[0]) {
          updateMap(stations[0]);
        }
      } catch (error) {
        setMessage(error.message, true);
      }
    },
    async () => {
      try {
        await loadCountrySuggestions("Location permission was not enabled. Showing country suggestions.");
      } catch (error) {
        setMessage(error.message, true);
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

elements.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  try {
    currentProfile = await saveProfile(profilePayloadFromForm());
    window.localStorage.setItem("evProfile", JSON.stringify(currentProfile));
    showFinder();
    await loadCountrySuggestions();
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.editProfileButton.addEventListener("click", () => {
  fillProfileForm(currentProfile);
  showOnboarding();
});

elements.browseButton.addEventListener("click", async () => {
  try {
    await loadCountrySuggestions();
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.useLocationButton.addEventListener("click", useCurrentLocation);

async function boot() {
  try {
    await apiFetch("/health");
    setApiStatus(true);
  } catch {
    setApiStatus(false);
    elements.apiStatusText.textContent = "Demo mode";
  }

  fillProfileForm(currentProfile);
  if (currentProfile?.email) {
    showFinder();
    try {
      await loadCountrySuggestions();
    } catch (error) {
      setMessage(error.message, true);
    }
  }
}

boot();

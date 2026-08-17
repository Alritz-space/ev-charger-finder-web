const configuredApiBaseUrl = window.EV_CHARGER_CONFIG?.API_BASE_URL?.trim();
const apiBaseUrl =
  window.localStorage.getItem("evApiBaseUrl") ||
  configuredApiBaseUrl ||
  "http://localhost:3000";

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
  const country = encodeURIComponent(currentProfile.country);
  const response = await apiFetch(`/recommendations?country=${country}&limit=8`);
  stations = response.stations || [];
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

        const params = new URLSearchParams({
          country: currentProfile.country,
          lat: String(latitude),
          lng: String(longitude),
          limit: "8"
        });
        const response = await apiFetch(`/recommendations?${params.toString()}`);
        stations = response.stations || [];
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
    const response = await apiFetch("/users/onboarding", {
      method: "POST",
      body: JSON.stringify(profilePayloadFromForm())
    });
    currentProfile = response.profile;
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

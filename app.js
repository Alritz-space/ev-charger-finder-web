const configuredSheetUrl = window.EV_CHARGER_CONFIG?.GOOGLE_SHEET_CSV_URL?.trim();
const googleSheetCsvUrl =
  window.localStorage.getItem("evGoogleSheetCsvUrl") ||
  configuredSheetUrl ||
  "";

const elements = {
  apiStatusDot: document.querySelector("#apiStatusDot"),
  apiStatusText: document.querySelector("#apiStatusText"),
  onboardingSection: document.querySelector("#onboardingSection"),
  finderSection: document.querySelector("#finderSection"),
  profileForm: document.querySelector("#profileForm"),
  profileMessage: document.querySelector("#profileMessage"),
  countrySelect: document.querySelector("#country"),
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
let stationCache = null;
let stations = [];
let selectedStation = null;

const bundledCountries = Array.isArray(window.EV_CHARGER_COUNTRIES)
  ? window.EV_CHARGER_COUNTRIES
  : [];

const fallbackCountries = bundledCountries.length ? bundledCountries : [
  "India",
  "United States",
  "Canada",
  "United Kingdom",
  "France",
  "Germany",
  "Netherlands",
  "Norway",
  "Sweden",
  "China",
  "Japan",
  "Australia",
  "Brazil",
  "United Arab Emirates",
  "Singapore"
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function valueFromRow(row, aliases) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function numberOrNull(value) {
  const number = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function normalizeStation(row, index) {
  const latitude = numberOrNull(valueFromRow(row, ["latitude", "lat"]));
  const longitude = numberOrNull(valueFromRow(row, ["longitude", "lng", "lon", "long"]));

  return {
    sourceId: valueFromRow(row, ["sourceid", "source_id", "id", "stationid"]) || `sheet-row-${index + 1}`,
    country: valueFromRow(row, ["country"]),
    address: valueFromRow(row, ["address", "stationaddress", "name", "title"]) || "Unknown address",
    latitude,
    longitude,
    vehicleSupport: valueFromRow(row, ["vehiclesupport", "vehicle_support", "support", "vehicletype"]) || "Unknown",
    portCount: numberOrNull(valueFromRow(row, ["portcount", "port_count", "ports", "chargingports", "numberofchargingports"])),
    capacityKw: valueFromRow(row, ["capacitykw", "capacity_kw", "capacity", "chargingcapacity", "powerkw"]),
    priceType: valueFromRow(row, ["pricetype", "price_type", "freeorpaid", "free_paid", "pricing"]) || "Unknown",
    distanceMeters: null
  };
}

async function loadSheetStations() {
  if (!googleSheetCsvUrl) {
    throw new Error("Google Sheet CSV URL is missing. Add GOOGLE_SHEET_CSV_URL in config.js.");
  }

  if (stationCache) {
    return stationCache;
  }

  const response = await fetch(googleSheetCsvUrl, { cache: "no-store" });
  const text = await response.text();

  if (!response.ok || text.trim().startsWith("<!DOCTYPE html") || text.includes("document-root")) {
    throw new Error("Google Sheet did not return CSV. Publish/share the sheet so anyone with the link can view it.");
  }

  const rows = parseCsv(text);
  const headers = rows.shift()?.map(normalizeHeader) || [];
  const rawStations = rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]))
  );

  stationCache = rawStations
    .map(normalizeStation)
    .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude));

  setApiStatus(true, `${stationCache.length} sheet rows`);
  renderCountryDropdown(
    uniqueCountriesFromStations(stationCache),
    elements.countrySelect.value || currentProfile?.country || ""
  );

  return stationCache;
}

function uniqueCountriesFromStations(loadedStations) {
  const countriesByKey = new Map();

  for (const station of loadedStations) {
    const country = String(station.country || "").trim();
    if (!country) {
      continue;
    }

    const key = country.toLowerCase();
    if (!countriesByKey.has(key)) {
      countriesByKey.set(key, country);
    }
  }

  return Array.from(countriesByKey.values()).sort((a, b) => a.localeCompare(b));
}

function renderCountryDropdown(countryNames, selectedCountry = "") {
  const selectedValue = String(selectedCountry || "").trim();
  const countries = [...new Set(countryNames.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  if (selectedValue && !countries.some((country) => country.toLowerCase() === selectedValue.toLowerCase())) {
    countries.unshift(selectedValue);
  }

  elements.countrySelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = countries.length ? "Select country" : "No countries found";
  elements.countrySelect.append(placeholder);

  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    elements.countrySelect.append(option);
  }

  elements.countrySelect.value = selectedValue || "";
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

async function getRecommendations({ country, lat, lng, limit = 8 }) {
  const allStations = await loadSheetStations();
  const countryMatches = country
    ? allStations.filter((station) => String(station.country || "").toLowerCase().includes(country.toLowerCase()))
    : allStations;
  const candidates = countryMatches.length ? countryMatches : allStations;

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

function saveProfile(payload) {
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

function setApiStatus(online, label = null) {
  elements.apiStatusDot.classList.toggle("online", online);
  elements.apiStatusDot.classList.toggle("offline", !online);
  elements.apiStatusText.textContent = label || (online ? "Sheet online" : "Sheet unavailable");
}

function setMessage(text, isError = false) {
  elements.message.textContent = text || "";
  elements.message.classList.toggle("error", isError);
}

function setProfileMessage(text, isError = false) {
  elements.profileMessage.textContent = text || "";
  elements.profileMessage.classList.toggle("error", isError);
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
        <span><strong>Power:</strong> ${station.capacityKw || "Unknown"} kW</span>
        <span><strong>Price:</strong> ${station.priceType}</span>
        <span><strong>Country:</strong> ${station.country || "Unknown"}</span>
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
  setProfileMessage("");

  try {
    currentProfile = saveProfile(profilePayloadFromForm());
    window.localStorage.setItem("evProfile", JSON.stringify(currentProfile));
    showFinder();
    await loadCountrySuggestions();
  } catch (error) {
    setProfileMessage(error.message, true);
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
  const savedCountry = currentProfile?.country || "";
  renderCountryDropdown(fallbackCountries, savedCountry);
  setApiStatus(Boolean(googleSheetCsvUrl), googleSheetCsvUrl ? "Ready" : "Sheet unavailable");

  fillProfileForm(currentProfile);
  if (currentProfile?.email) {
    showFinder();
    setMessage("Ready. Use your location or browse suggestions when you want to load station results.");
    renderStationList();
  }
}

boot();

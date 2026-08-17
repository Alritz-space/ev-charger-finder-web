import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const rootDir = process.cwd();
const configPath = path.join(rootDir, "config.js");
const countriesPath = path.join(rootDir, "countries.js");
const countriesJsonPath = path.join(rootDir, "countries.json");

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

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function readGoogleSheetCsvUrl() {
  const configSource = await fs.readFile(configPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(configSource, sandbox, { filename: "config.js" });
  const url = sandbox.window.EV_CHARGER_CONFIG?.GOOGLE_SHEET_CSV_URL?.trim();

  if (!url) {
    throw new Error("GOOGLE_SHEET_CSV_URL is missing in config.js.");
  }

  return url;
}

function buildCountriesModule(countries) {
  const lines = countries.map((country) => `  ${JSON.stringify(country)}`);
  return `window.EV_CHARGER_COUNTRIES = [\n${lines.join(",\n")}\n];\n`;
}

const googleSheetCsvUrl = await readGoogleSheetCsvUrl();
const response = await fetch(googleSheetCsvUrl, { cache: "no-store" });
const csvText = await response.text();

if (!response.ok || csvText.trimStart().startsWith("<!DOCTYPE html") || csvText.includes("document-root")) {
  throw new Error("Google Sheet did not return public CSV. Check the published CSV URL in config.js.");
}

const rows = parseCsv(csvText);
const headers = rows.shift()?.map(normalizeHeader) || [];
const countryIndex = headers.indexOf("country");

if (countryIndex < 0) {
  throw new Error("CSV must contain a country column.");
}

const countriesByKey = new Map();
for (const row of rows) {
  const country = String(row[countryIndex] || "").trim();
  if (!country) {
    continue;
  }

  const key = country.toLowerCase();
  if (!countriesByKey.has(key)) {
    countriesByKey.set(key, country);
  }
}

const countries = Array.from(countriesByKey.values()).sort((a, b) => a.localeCompare(b));
if (!countries.length) {
  throw new Error("No countries were found in the CSV country column.");
}

await fs.writeFile(countriesPath, buildCountriesModule(countries), "utf8");
await fs.writeFile(countriesJsonPath, `${JSON.stringify(countries, null, 2)}\n`, "utf8");
console.log(`Updated countries.js and countries.json with ${countries.length} countries.`);

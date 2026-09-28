'use strict';

// Open-Meteo: free, no API key, CORS-enabled.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const DEFAULT_PLACE = { name: 'New York', lat: 40.7128, lon: -74.006 };

// WMO weather codes -> [description, day icon, night icon]
const WMO = {
  0: ['Clear', '☀️', '🌙'],
  1: ['Mostly clear', '🌤️', '🌙'],
  2: ['Partly cloudy', '⛅', '☁️'],
  3: ['Overcast', '☁️', '☁️'],
  45: ['Fog', '🌫️', '🌫️'],
  48: ['Freezing fog', '🌫️', '🌫️'],
  51: ['Light drizzle', '🌦️', '🌧️'],
  53: ['Drizzle', '🌦️', '🌧️'],
  55: ['Heavy drizzle', '🌧️', '🌧️'],
  56: ['Freezing drizzle', '🌧️', '🌧️'],
  57: ['Freezing drizzle', '🌧️', '🌧️'],
  61: ['Light rain', '🌦️', '🌧️'],
  63: ['Rain', '🌧️', '🌧️'],
  65: ['Heavy rain', '🌧️', '🌧️'],
  66: ['Freezing rain', '🌧️', '🌧️'],
  67: ['Freezing rain', '🌧️', '🌧️'],
  71: ['Light snow', '🌨️', '🌨️'],
  73: ['Snow', '🌨️', '🌨️'],
  75: ['Heavy snow', '❄️', '❄️'],
  77: ['Snow grains', '🌨️', '🌨️'],
  80: ['Light showers', '🌦️', '🌧️'],
  81: ['Showers', '🌧️', '🌧️'],
  82: ['Violent showers', '⛈️', '⛈️'],
  85: ['Snow showers', '🌨️', '🌨️'],
  86: ['Heavy snow showers', '❄️', '❄️'],
  95: ['Thunderstorm', '⛈️', '⛈️'],
  96: ['Thunderstorm, hail', '⛈️', '⛈️'],
  99: ['Thunderstorm, hail', '⛈️', '⛈️'],
};

const $ = (id) => document.getElementById(id);
const els = {
  form: $('search-form'),
  input: $('search-input'),
  results: $('search-results'),
  locate: $('locate-btn'),
  unit: $('unit-btn'),
  status: $('status'),
  weather: $('weather'),
  place: $('place'),
  icon: $('current-icon'),
  temp: $('current-temp'),
  desc: $('current-desc'),
  range: $('current-range'),
  hourly: $('hourly'),
  daily: $('daily'),
  details: $('details'),
};

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

const state = {
  place: store.get('place', null),
  imperial: store.get('imperial', navigator.language === 'en-US'),
};

function wmo(code, isDay = true) {
  const [desc, day, night] = WMO[code] || ['Unknown', '🌡️', '🌡️'];
  return { desc, icon: isDay ? day : night };
}

function showStatus(msg) {
  els.status.textContent = msg;
  els.status.hidden = !msg;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------- Weather ----------

async function loadWeather(place) {
  state.place = place;
  store.set('place', place);
  if (els.weather.hidden) showStatus('Loading…');

  const params = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  if (state.imperial) {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
    params.set('precipitation_unit', 'inch');
  }

  try {
    const data = await getJSON(`${FORECAST_URL}?${params}`);
    render(place, data);
    showStatus('');
  } catch (err) {
    console.error(err);
    showStatus(navigator.onLine ? 'Could not load weather. Try again.' : 'You are offline.');
  }
}

function fmtHour(iso) {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
}

function fmtTime(iso) {
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

function fmtDay(isoDate, i) {
  if (i === 0) return 'Today';
  // Parse as a plain date (no timezone shift).
  const [y, mo, d] = isoDate.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

function render(place, data) {
  const c = data.current;
  const d = data.daily;
  const h = data.hourly;
  const isDay = c.is_day === 1;
  const now = wmo(c.weather_code, isDay);
  const deg = (t) => `${Math.round(t)}°`;

  document.body.classList.toggle('night', !isDay);

  els.place.textContent = place.name;
  els.icon.textContent = now.icon;
  els.temp.textContent = deg(c.temperature_2m);
  els.desc.textContent = now.desc;
  els.range.textContent = `H: ${deg(d.temperature_2m_max[0])}  L: ${deg(d.temperature_2m_min[0])}`;

  // Hourly: next 24 hours starting from the current hour (times are in the location's local time).
  const currentHour = c.time.slice(0, 13);
  let start = h.time.findIndex((t) => t.slice(0, 13) >= currentHour);
  if (start < 0) start = 0;
  els.hourly.innerHTML = h.time.slice(start, start + 24).map((t, j) => {
    const i = start + j;
    const w = wmo(h.weather_code[i], h.is_day[i] === 1);
    const pop = h.precipitation_probability[i];
    return `<div class="hour">
      <span class="t">${j === 0 ? 'Now' : fmtHour(t)}</span>
      <span class="i">${w.icon}</span>
      <span class="p">${pop >= 20 ? pop + '%' : ''}</span>
      <span>${deg(h.temperature_2m[i])}</span>
    </div>`;
  }).join('');

  // Daily with temperature range bars scaled across the week.
  const weekMin = Math.min(...d.temperature_2m_min);
  const weekMax = Math.max(...d.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  els.daily.innerHTML = d.time.map((t, i) => {
    const w = wmo(d.weather_code[i]);
    const lo = d.temperature_2m_min[i];
    const hi = d.temperature_2m_max[i];
    const pop = d.precipitation_probability_max[i];
    const left = ((lo - weekMin) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    return `<li class="day">
      <span>${fmtDay(t, i)}</span>
      <span class="i" title="${w.desc}">${w.icon}</span>
      <span class="p">${pop >= 20 ? pop + '%' : ''}</span>
      <span class="temps">
        <span class="lo">${deg(lo)}</span>
        <span class="bar"><span style="left:${left}%;width:${width}%"></span></span>
        <span class="hi">${deg(hi)}</span>
      </span>
    </li>`;
  }).join('');

  const u = data.current_units;
  const details = [
    ['Feels like', deg(c.apparent_temperature)],
    ['Humidity', `${c.relative_humidity_2m}%`],
    ['Wind', `${Math.round(c.wind_speed_10m)} ${u.wind_speed_10m.replace("mp/h", "mph")}`],
    ['UV index', Math.round(d.uv_index_max[0])],
    ['Sunrise', fmtTime(d.sunrise[0])],
    ['Sunset', fmtTime(d.sunset[0])],
  ];
  els.details.innerHTML = details.map(([label, value]) =>
    `<div class="detail"><div class="label">${label}</div><div class="value">${value}</div></div>`
  ).join('');

  els.weather.hidden = false;
}

// ---------- Search ----------

let searchTimer;
let searchSeq = 0;

async function search(query) {
  const seq = ++searchSeq;
  if (query.trim().length < 2) {
    els.results.hidden = true;
    return;
  }
  try {
    const params = new URLSearchParams({ name: query.trim(), count: '6', language: 'en', format: 'json' });
    const data = await getJSON(`${GEOCODE_URL}?${params}`);
    if (seq !== searchSeq) return; // a newer search is in flight
    const results = data.results || [];
    if (!results.length) {
      els.results.innerHTML = '<li tabindex="-1"><small>No matches</small></li>';
    } else {
      els.results.innerHTML = results.map((r, i) => {
        const sub = [r.admin1, r.country].filter(Boolean).join(', ');
        return `<li tabindex="0" data-i="${i}">${escapeHtml(r.name)} <small>${escapeHtml(sub)}</small></li>`;
      }).join('');
      els.results._data = results;
    }
    els.results.hidden = false;
  } catch (err) {
    console.error(err);
  }
}

function pickResult(i) {
  const r = els.results._data?.[i];
  if (!r) return;
  els.results.hidden = true;
  els.input.value = '';
  els.input.blur();
  loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
}

els.input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => search(els.input.value), 250);
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTimeout(searchTimer);
  await search(els.input.value);
  pickResult(0);
});

els.results.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-i]');
  if (li) pickResult(Number(li.dataset.i));
});

els.results.addEventListener('keydown', (e) => {
  const li = e.target.closest('li[data-i]');
  if (li && e.key === 'Enter') pickResult(Number(li.dataset.i));
});

document.addEventListener('click', (e) => {
  if (!els.form.contains(e.target)) els.results.hidden = true;
});

// ---------- Geolocation ----------

function locate() {
  if (!('geolocation' in navigator)) {
    showStatus('Location is not available on this device.');
    return;
  }
  showStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let name = 'My Location';
      try {
        const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: 'en' });
        const r = await getJSON(`${REVERSE_URL}?${params}`);
        name = r.city || r.locality || r.principalSubdivision || name;
      } catch { /* keep generic name */ }
      loadWeather({ name, lat, lon });
    },
    (err) => {
      console.warn(err);
      if (!state.place) loadWeather(DEFAULT_PLACE);
      else showStatus('Location permission denied.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
  );
}

els.locate.addEventListener('click', locate);

// ---------- Units ----------

function updateUnitButton() {
  // Button shows the unit you'll switch to.
  els.unit.textContent = state.imperial ? '°C' : '°F';
}

els.unit.addEventListener('click', () => {
  state.imperial = !state.imperial;
  store.set('imperial', state.imperial);
  updateUnitButton();
  if (state.place) loadWeather(state.place);
});

// ---------- Refresh when returning to the app ----------

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.place) loadWeather(state.place);
});

// ---------- Start ----------

updateUnitButton();
if (state.place) loadWeather(state.place);
else locate();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW registration failed', err));
  });
}

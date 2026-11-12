# Väder / Weather

A weather app for phones and computers, in Swedish and English. Installable as a web app (PWA).

- **Now:** temperature, conditions, max / min / feels like, and a short text about the coming hours ("3° colder than yesterday. Rain from about 14 to 17, up to 3 mm an hour."), compared with the same hour yesterday.
- **Rain in the next 2 hours:** shown in 15-minute steps ("Rain in about 25 min").
- **SMHI weather warnings** for places in Sweden.
- **Hour chart:** 24 hours on phones and 48 on wide screens. Drag, hover or use the arrow keys for exact values. The line is coloured by temperature, and precipitation has its own zone.
- **10-day forecast:**
  - Phones: tap a day to open its hours and details in the list.
  - Wide screens: the chart and detail card follow the chosen day.
  - Today counts from now to midnight.
- **Day details:** sunrise and sunset, daylight compared with yesterday, sunshine hours, UV index with sun-protection hours, wind, and moon phase.
- **Right now:** wind and gusts, humidity, pressure with its trend, air quality (European AQI) and pollen in season.
- **Saved places:**
  - Star a place to save it.
  - Phones: swipe between places, with dots under the name.
  - Wide screens: tabs, and the keyboard (/ to search, 1–9 for places, ← → for days).
  - "My location" follows you.
  - Search lists places in your own country first and remembers recent places.
- **Map:**
  - On phones, one finger scrolls the page and two move the map.
  - Tap a point to see its weather, then "Show forecast here".
  - Rain radar from RainViewer with a time slider.
- **Look:** colours follow the weather and the time of day. Meteocons weather icons, Lucide icons for buttons.
- **Swedish and English:** the language follows the system and can be changed in Settings. Units: °C/°F, m/s, km/h or mph, mm/in.
- **Installable:**
  - Works as an iPhone home-screen app, with start-up images.
  - Pull down to refresh.
  - When a new version is out, the app shows a notice.
- **Offline:** the last forecast for each place is kept and shown with the time it was fetched.

Data: [Open-Meteo](https://open-meteo.com/) (forecast, 15-minute precipitation, air quality, place search), [SMHI](https://www.smhi.se/) (warnings), BigDataCloud (place names), [RainViewer](https://www.rainviewer.com/) (radar), [OpenStreetMap](https://www.openstreetmap.org/copyright) (map). None of these need an API key. Icons: [Meteocons](https://github.com/basmilius/weather-icons) (MIT), [Lucide](https://lucide.dev) (ISC).

## Development

Needs Node 22 or later.

```sh
npm install
npm run dev      # development server
npm run test     # unit tests (Vitest)
npm run check    # type check (svelte-check)
npm run build    # production build in dist/
```

Built with Svelte 5, Vite and TypeScript. Maps use Leaflet, and the service worker comes from vite-plugin-pwa. The iPhone start-up images are made by `python3 scripts/make-splash.py`, which needs Pillow. Pushing to `main` builds the app and publishes it on GitHub Pages: https://impola.github.io/weather-app/

## Desktop

`./launch.sh` serves `dist/` on 127.0.0.1:48613 and opens it in a Chromium app window. The server stops when the window is closed. Run `npm run build` first.

The previous version (plain HTML/JS) is in `~/weather-app-v1`.

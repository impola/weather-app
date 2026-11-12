# Väder / Weather

A weather app for phones and computers, in Swedish and English. Installable as a web app (PWA).

- Hour chart for the next 48 hours, or for a chosen day: temperature, precipitation and wind. Drag, hover or use the arrow keys to see exact values.
- 7-day forecast. Click a day to see its hours and details (sunrise, UV, precipitation, wind).
- Saved places: star a place, then switch between places with tabs (or by swiping on a phone).
- Map: click anywhere to see the weather there. Rain radar from RainViewer with a time slider.
- Units: °C/°F, m/s, km/h or mph, mm/in. Language follows the system and can be changed in Settings.
- Offline: the last forecast for each place is kept and shown with the time it was fetched.

Data: [Open-Meteo](https://open-meteo.com/) (forecast, place search), BigDataCloud (place names), [RainViewer](https://www.rainviewer.com/) (radar), [OpenStreetMap](https://www.openstreetmap.org/copyright) (map). None of these need an API key.

## Development

Needs Node 22 or later.

```sh
npm install
npm run dev      # development server
npm run test     # unit tests (Vitest)
npm run check    # type check (svelte-check)
npm run build    # production build in dist/
```

Built with Svelte 5, Vite and TypeScript. Maps use Leaflet, and the service worker comes from vite-plugin-pwa.

## Desktop

`./launch.sh` serves `dist/` on 127.0.0.1:48613 and opens it in a Chromium app window. The server stops when the window is closed. Run `npm run build` first.

The previous version (plain HTML/JS) is in `~/weather-app-v1`.

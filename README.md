# Bauder Home

A homeOS-style home screen for iPad, modeled on Apple's HomeView: clock faces, a widget grid, Home Assistant controls, a cooking mode and timers. It's a plain web app with no build step. You add it to the iPad's home screen, and it runs full screen.

Until Home Assistant and the Bauder HQ feed are connected, every widget shows sample data and is tagged **Sample**.

## What's in it

| Area | What it does |
|---|---|
| Clock faces | Bold, Analog, Photos and Glance. They appear after 2 minutes without a touch (configurable). Swipe to change faces, tap to wake. Night mode dims to red overnight. |
| Home screen | Time and weather, Home favorites (6), Up Next calendar, Cameras, Airbnb, Inspections and EV Projects. |
| Home | Every Home Assistant device by room: lights with brightness, switches, locks, garage doors, thermostats, scenes, speakers and sensors. Locks and garage doors need a second tap to confirm. |
| Calendar | Next 14 days from Home Assistant calendars (Google Calendar, CalDAV and so on). |
| Sous Chef | Paste any recipe. Ingredients become a checklist, directions become big step cards, and times like "bake 25 minutes" become one-tap timers. |
| Timers | Several at once, with a chime and a full-screen alert. |
| Photos | Photos you add stay on the iPad and play on the Photos face. |
| Profiles | Lee, Family and Guest. Guest hides the calendar and work widgets. |

## Run it on your Umbrel (recommended)

Safari won't let an https page talk to an http address. Running the app from the Umbrel keeps both on plain http, so `http://umbrel.local:8123` works with no extra setup.

1. On the Umbrel, install **Portainer** from the App Store.
2. In Portainer: **Stacks → Add stack → Repository**.
   - Repository URL: `https://github.com/alleebauder/home-run-simpson`
   - Turn on **Authentication**. Username `alleebauder`, and a GitHub personal access token with read access to this repo as the password.
   - Compose path: `docker-compose.yml`
3. Deploy. Then open `http://umbrel.local:8686` in Safari on the iPad.

To pick up new changes later, open the stack in Portainer and choose **Pull and redeploy**.

## Or open it from GitHub Pages

Repo **Settings → Pages → Deploy from a branch → main / (root)**. GitHub Pages on a private repo needs a paid GitHub plan.

Pages is https, so Home Assistant needs an https address too. On Umbrel, either:
- **Tailscale app**: reach Home Assistant at its Tailscale https name, or
- **Cloudflare Tunnel app**: give Home Assistant a public https hostname. Home Assistant's own login still protects it.

## Connect Home Assistant

1. Install **Home Assistant** from the Umbrel App Store and add your devices there.
2. In Home Assistant, tap your name at the bottom left → **Security** → **Long-lived access tokens** → **Create token**.
3. In Bauder Home, open **Settings**, enter the address (for example `http://umbrel.local:8123`) and paste the token. Tap **Connect**.

The app talks to Home Assistant over its WebSocket API, so no CORS changes are needed in `configuration.yaml`. Rooms come from Home Assistant areas and need a token from an admin user. Calendars need Home Assistant 2023.12 or newer.

## Bauder HQ feed

The Airbnb, Inspections and EV Projects widgets read one JSON file. Put its address in **Settings → Bauder HQ feed**. When the app runs on Umbrel, drop the file at `data/bauder-hq.json` in the stack's volume and use `http://umbrel.local:8686/data/bauder-hq.json`.

```json
{
  "airbnb": [
    { "listing": "Wall St", "type": "check-in", "date": "2026-10-25", "time": "4:00 PM" }
  ],
  "inspections": {
    "completed": 186,
    "goal": 300,
    "scheduled": [{ "date": "2026-10-26", "time": "9:30 AM", "name": "Annual inspection" }]
  },
  "ev": [
    { "site": "Site A", "status": "Permit approved" }
  ]
}
```

- `type` is `check-in` or `check-out`. Dates are `YYYY-MM-DD`.
- EV `stage` is optional (`good`, `warn` or `crit`). Without it, the status wording decides the color: "approved" or "complete" is green, "denied" or "on hold" is red, everything else is amber.
- The feed refreshes every 5 minutes. If it can't be reached, the last good copy stays on screen.

A full example is in `umbrel/bauder-hq.sample.json`.

## Set up the iPad

1. Open the app in Safari, tap **Share → Add to Home Screen**, and launch it from that icon.
2. **Settings → Display & Brightness → Auto-Lock → Never**, and keep the iPad on its charger.
3. **Settings → Accessibility → Guided Access → On.** Open Bauder Home and triple-click the top button to lock the iPad to it.
4. Tap the screen once after launching so timers are allowed to play sound.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell and dock |
| `styles.css` | All styling. Colors and fonts are tokens at the top, with light and dark sets. |
| `app.js` | Everything else: Home Assistant, widgets, apps, clock faces |
| `sw.js` | Offline support. Bump `CACHE` after changing files. |
| `manifest.webmanifest`, `icons/` | Home-screen install |
| `docker-compose.yml`, `umbrel/` | Self-hosting on Umbrel |

Settings, recipes and timers are saved in the iPad's browser storage, and photos in its IndexedDB. Nothing is stored in this repo or sent anywhere except the Home Assistant, weather (Open-Meteo) and feed addresses you set.

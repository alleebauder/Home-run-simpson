# Bauder Home

A home command center for iPad, modeled on Apple's HomeView. The main screen answers one question: **what's next for our family, and is the house okay?**

It's a web app that runs on iPadOS, not a replacement operating system. There's no build step. You add it to the iPad's home screen and it runs full screen. Until Home Assistant is connected, the house widgets show sample data tagged **Sample**. Airbnb and EV projects read the feed shipped with this app. Inspections stay empty until that feed includes numbers.

## Features

### Core
| # | Feature | How it works |
|---|---|---|
| 1 | At-a-glance dashboard | The top bar sums it up: house status, the next event and tonight's dinner. Below it are the time, weather, house status and Up Next widgets. |
| 2 | Smart-home controls | Lights (with brightness), thermostat, locks, garage and every room from Home Assistant areas. Locks and garage doors need a second tap to confirm. |
| 3 | Family calendar | Day, week and 30-day views from Home Assistant calendars, color-coded by person. Tap a person to hide or show them. |
| 4 | Household tasks | Groceries, chores and reminders with assignments and due dates. Use Home Assistant to-do lists to share them with everyone's phone. |
| 5 | One-tap modes | Morning, Cooking, Leaving, Evening and Bedtime. Each one can run scenes, turn lights on or off, lock doors, close the garage, set the thermostat, open Kitchen or show the night clock. Modes never unlock or open anything. |
| 6 | Shared and private profiles | Each person has a color and a private setting. Guest hides calendars, lists, notes, packages and work widgets. An optional PIN protects leaving Guest, opening Settings and unlocking. |

### Next
| # | Feature | How it works |
|---|---|---|
| 7 | Doorbell, cameras, security | Doorbell rings wake the screen with a chime and camera view. The Security app lists anything unlocked or open with one-tap fixes, plus who's home, cameras and recent rings. Smoke, CO, gas, heat and leak sensors sound a full-screen alert with what to do. |
| 8 | Kitchen | Weekly meal plan, recipes (paste from any site), step-by-step cooking with one-tap timers, several timers at once, and "add this week's ingredients to Groceries". |
| 9 | Music | Now playing, play/pause, skip, volume and source for every speaker in Home Assistant. |
| 10 | Household assistant | Type or speak. Timers, lists, modes, "what's next", "is the house okay", weather and dinner are handled on the iPad. Anything else goes to Home Assistant Assist. |
| 11 | Photo frame | Photos from the iPad play on the idle screen, which dims to a red clock overnight. Bold, Analog and Glance faces too. |

### Future ideas, built in
| # | Feature | How it works |
|---|---|---|
| 12 | Message board | Notes from each person in their color. Can live in a Home Assistant to-do list so phones can post. |
| 13 | Package tracking | Add a tracking number. UPS, USPS, FedEx, DHL and Amazon are detected and Track opens the carrier page. |
| 14 | Energy | Power right now, today's kWh, a 24-hour chart and the devices using the most. |
| 15 | Arrival routines | Run a mode when someone gets home or when everyone leaves, using Home Assistant people. |
| 16 | Emergency info | 911 and your address in large type, contacts, gas/water/electric shutoffs, extinguishers, meeting spot, medical notes and a monthly smoke alarm test log. Visible in Guest mode so sitters can use it. |

The home screen is a widget gallery. In **Settings → Home screen** you choose and order widgets separately for the family screen and the guest screen. The first screen holds 12 squares (4 across, 3 down) and the rest scroll.

## Feasibility notes

- **HomeKit / Apple Home.** A web app can't talk to HomeKit directly. Home Assistant can: its HomeKit Device integration pulls in HomeKit-compatible devices, and its HomeKit Bridge exposes Home Assistant devices back to Apple Home. Matter and Thread devices work through Home Assistant too.
- **Face personalization.** Recognizing who is standing at the iPad needs camera access and on-device face matching, which needs a native app built in Xcode. This app uses tap-to-switch profiles with an optional PIN instead.
- **Siri.** Deep Siri integration also needs a native app. Options here: the built-in assistant, Home Assistant Assist (which can use an AI model you set up there), or Siri Shortcuts that open this app or call Home Assistant.
- **Arrival routines** run only while this app is open. For routines that must always run, build them as automations in Home Assistant.

## Run it on your Umbrel (recommended)

Safari won't let an https page talk to an http address. Running the app from the Umbrel keeps both on plain http, so `http://umbrel.local:8123` works with no extra setup.

1. On the Umbrel, install **Portainer** from the App Store.
2. In Portainer: **Stacks → Add stack → Repository**.
   - Repository URL: `https://github.com/alleebauder/Home-run-simpson`
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
3. In Bauder Home, open **Settings → Connections**, enter the address (for example `http://umbrel.local:8123`) and paste the token. Tap **Connect**.

The app talks to Home Assistant over its WebSocket API, so no CORS changes are needed in `configuration.yaml`. Notes:
- Rooms come from Home Assistant areas and need a token from an admin user.
- Calendars use the `calendar.get_events` action (Home Assistant 2023.12 or newer). Assign each calendar to a person in **Settings → Family**.
- Shared lists use Home Assistant to-do lists. The built-in Shopping List works for groceries. The Local To-do integration supports due dates and assignments for chores and reminders.
- Who's home and arrival routines need people set up with the Home Assistant Companion app on each phone.
- The doorbell is found by name ("doorbell") or picked in **Settings → Devices**. Both `binary_sensor` and newer `event` doorbell entities work.
- Energy uses a whole-home `power` sensor (W or kW) and an `energy` sensor for today's kWh.

## Bauder HQ feed

The Airbnb, Inspections and EV Projects widgets read one JSON file.

When no feed address is saved, the app uses `feed/bauder-hq.json`. That file lives in this repo. The Umbrel image copies it outside the `data/` volume, so the Docker volume cannot hide it, and GitHub Pages serves it from the same path.

To use a file on the Umbrel volume instead, put it at `data/bauder-hq.json` and set **Settings → Connections → Bauder HQ feed** to `http://umbrel.local:8686/data/bauder-hq.json`.

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

- `type` is `check-in` or `check-out`. Dates are `YYYY-MM-DD`. `time` is optional. The widget still lists the stay when the time is blank.
- Leave `inspections` out, or leave `completed` and `goal` empty, when there are no numbers yet. The widget then says there are no inspections yet. It does not keep the sample counts.
- EV `stage` is optional (`good`, `warn` or `crit`). Without it, the status wording decides the color: "approved" or "complete" is green, "denied" or "on hold" is red, everything else is amber.
- The feed refreshes every 5 minutes. If it can't be reached, the last good copy stays on screen.

The file the app loads by default is `feed/bauder-hq.json`. A fuller example with sample numbers is in `umbrel/bauder-hq.sample.json`.

## Household info

`household.json` at the root of this repo pre-fills the iPad. Nginx and GitHub Pages both serve it. On a new iPad, where nothing is saved yet, the app uses that file for:

- place, latitude and longitude
- people (name, color, and the private flag), always keeping the fixed Guest
- the feed address
- emergency info: address, directions, gas, water, power, extinguishers, meeting spot, medical notes, other notes, and contacts

Merge rules:

- Anything already saved on the iPad wins.
- A blank string or an empty list in `household.json` does not erase a value.
- Fields the file leaves out keep the app's built-in defaults. 911 and Poison Control stay in the contact list.
- The Home Assistant address, token, and PIN are never read from the file.

After you change `household.json` or the feed in git:

1. On the Umbrel, open the stack in Portainer and choose **Pull and redeploy**.
2. Open Bauder Home on the iPad so it picks up the new files.
3. If this iPad already had settings saved, open **Settings → Connections** and tap **Re-apply household info**, then tap again to confirm. That copies the non-blank fields from `household.json`, including the feed address. It does not change the Home Assistant token or the PIN. If you use a file in the Umbrel data folder, set that feed address again after re-applying.

A first launch with empty browser storage applies the file on its own. Re-apply is for an iPad that already saved a copy. The coordinates in the file are for 8918 E Dalton Ave, Spokane, WA 99212, from the U.S. Census Bureau geocoder.

## Set up the iPad

1. Open the app in Safari, tap **Share → Add to Home Screen**, and launch it from that icon.
2. **Settings → Display & Brightness → Auto-Lock → Never**, and keep the iPad on its charger.
3. **Settings → Accessibility → Guided Access → On.** Open Bauder Home and triple-click the top button to lock the iPad to it.
4. Tap the screen once after launching so timers, the doorbell and alarms can play sound.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `styles.css` | All styling. Colors and fonts are tokens at the top, with light and dark sets. |
| `app.js` | Everything else: Home Assistant, widgets, apps, modes, assistant, clock faces |
| `household.js` | Merges `household.json` into settings and emergency info |
| `household.json` | Household seed: place, people, feed address, emergency info |
| `feed/bauder-hq.json` | Default Bauder HQ feed |
| `sw.js` | Offline support. Bump `CACHE` after changing files. |
| `manifest.webmanifest`, `icons/` | Home-screen install |
| `docker-compose.yml`, `umbrel/` | Self-hosting on Umbrel |

Settings, lists, recipes, notes, packages and emergency info are saved in the iPad's browser storage, and photos in its IndexedDB, unless you chose Home Assistant lists. `household.json` and `feed/bauder-hq.json` in this repo are the household seed and the default feed. The Home Assistant token and PIN are not stored here. Nothing is sent anywhere except the Home Assistant, weather (Open-Meteo) and feed addresses you set.

# Hanin Skincare

A mobile app for managing a skincare clinic's sessions and patients.

Built with Expo (React Native) and TypeScript. Data is stored on the device
in SQLite on the device, so the app works offline.

## What it does

Each session records:

| Field | Notes |
| --- | --- |
| Patient name | Pick an existing patient, or add a new one inline |
| Start session | Date and time the session begins |
| End session | Date and time the session ends |
| Price | Session price, with the clinic currency |
| Type of session | Facial, HydraFacial, peel, laser, and so on |

A session also tracks whether it is paid, plus optional notes.

## Screens

- Dashboard — today's schedule, expected revenue for today and this week, and the unpaid total.
- Sessions — search by patient name and filter by status or type of session.
- Session detail — full session details, with edit, delete and paid/unpaid actions.
- New / edit session — the form for patient, start and end time, price and type of session.
- Patients — patient list with session counts and spend, expandable for contact details.
- Settings — clinic name, currency, treatment types (name, default price, default length), sample data and reset.

## Treatment types

Types of session are configurable in Settings. Each type has a name, a default
price and a default length. When you pick a type on a new session, the price and
end time are filled in from those defaults, and you can still change them.

## Getting started

```bash
npm install
npm start
```

Then scan the QR code with Expo Go, or press `a` for Android, `i` for iOS, or `w` for web.

Other scripts:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## Running it on a phone

Expo Go is the quickest way to try the app. Install **Expo Go** from the Play
Store or App Store, run `npm start`, and scan the QR code. The phone and the
computer need to be on the same Wi-Fi network.

## Building an installable app (APK / AAB)

To install the app on a phone without Expo Go, or to publish it to a store, build
it with EAS. This runs on Expo's build servers, so no Android SDK or Java is
needed locally.

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then build:

```bash
# Installable Android APK, for sideloading onto a phone
eas build --platform android --profile preview

# Play Store bundle (.aab)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

The `preview` profile produces an APK you can download and install directly on an
Android phone. Build profiles live in `eas.json`.

Notes:

- An Expo account is required, and builds run on Expo's servers.
- iOS builds additionally need an Apple Developer account.
- The Android package is `com.haninskincare.app` and the iOS bundle id is
  `com.haninskincare.app` (both set in `app.json`).
- A local build without EAS is possible with `npx expo run:android`, but that
  needs Android Studio, the Android SDK and Java installed.

## Project layout

```
App.tsx                       App root, loads stored data before showing the UI
index.ts                      Expo entry point
src/
  components/                 Reusable UI (Button, TextField, Card, ChipSelect, ...)
  navigation/                 Stack and tab navigators, route types
  screens/                    One file per screen
  storage/                    SQLite persistence and the data context
  theme/                      Colours, spacing, typography, default treatment types
  types/                      Domain types (Session, Patient, TreatmentType, Settings)
  utils/                      Date and currency helpers
```

## Data

State lives in a React context (`src/storage/DataProvider.tsx`) and is written to
SQLite (`expo-sqlite`) after every change, through
`src/storage/persistence.ts`. Only the rows that changed are written, so an edit
does not rewrite the whole dataset. Stored data is validated on load, so a
corrupt or older record falls back to safe defaults instead of crashing the app.

On first launch the app copies any data left in AsyncStorage into SQLite. The old
AsyncStorage entry is kept as a safety net and is not read again. On web the app
still uses AsyncStorage, because `expo-sqlite` needs a WASM and worker setup
there.

Data stays on the device. Settings has "Load sample data" to fill the app with a
demo dataset, and "Delete all data" to clear everything.

## Notes

- On iOS the date and time pickers open in a bottom sheet; on Android they use the
  platform dialogs. Web has no native picker, so those fields accept typed
  `YYYY-MM-DD` and `HH:MM` input instead.
- Deleting a patient keeps their past sessions, because each session stores the
  patient name directly.
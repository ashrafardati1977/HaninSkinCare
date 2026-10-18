# Hanin Skincare

Expo (React Native) + TypeScript app for a skincare clinic's patient sessions.
Data is stored on the device with AsyncStorage; the app works offline.

## Session model

The five fields the app is built around live in `src/types/index.ts`:

| Field | Property |
| --- | --- |
| Patient name | `patientName` |
| Start session | `startAt` |
| End session | `endAt` |
| Price | `price` |
| Type of session | `typeName` |

`Session` also carries `id`, `patientId`, `paid` and `notes`. Default currency is
USD.

## Commands

```bash
npm install
npm run typecheck    # tsc --noEmit
npm start            # Expo dev server (also serves the web target)
```

## Building an Android APK

The repo uses the Expo managed workflow. `android/` and `ios/` are gitignored and
generated on demand by `npx expo prebuild`.

Local build (needs JDK 21, Android SDK with platform 35, build-tools 35.0.0,
NDK 27.1.12297006):

```bash
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease --no-daemon
# -> android/app/build/outputs/apk/release/app-release.apk
```

Cloud build (no local toolchain needed): `eas build --platform android --profile preview`.
Profiles are in `eas.json`; the `preview` profile emits an APK.

### Gotcha: duplicate expo-font breaks the Gradle build

`@expo/vector-icons` declares `expo-font >=14.0.4`. That loose range lets npm
hoist a much newer `expo-font` (e.g. 58.x) to the repo root while `expo` keeps the
SDK-correct copy nested. Autolinking picks the root copy, and the build fails
with:

```
Field 'version' is required for type with serial name
'expo.modules.plugin.configuration.Publication', but it was missing
at path: $.modules[N].projects[0].publication
```

Fix: keep `expo-font` pinned to the SDK version (`~14.0.12` for SDK 54) in
`package.json` so a single copy exists. To check for the problem, run
`npx expo-modules-autolinking resolve --platform android` and confirm every
`publication:` block has a `version:`.

### Signing

A local `assembleRelease` signs with Expo's checked-in debug keystore
(`android/app/debug.keystore`, alias `androiddebugkey`). That is fine for
sideloading but not for the Play Store, and it means a locally built APK cannot
be installed as an upgrade over one signed with a different key. A Play Store
build needs its own keystore.

## Notes

- `expo-system-ui` is required for `userInterfaceStyle: "light"` to apply on
  native; without it prebuild warns and the theme is not enforced.
- Web has no native date/time picker, so those fields fall back to typed
  `YYYY-MM-DD` / `HH:MM` input there.

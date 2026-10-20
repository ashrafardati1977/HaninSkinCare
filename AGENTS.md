# Hanin Skincare

Expo (React Native) + TypeScript app for a skincare clinic's patient sessions.
Data is stored on the device in SQLite (via `expo-sqlite`); the app works offline.

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
npm test             # backup/restore merge + validation tests (Node test runner)
npm start            # Expo dev server (also serves the web target)
```

`npm test` compiles the suites in `tests/` with `tsc` into `.test-build/` and
runs them under `node --test`. The storage layer is split so this works without a
device: `src/storage/schema.ts`, `src/storage/backup.ts`, `src/storage/rows.ts`
and `src/storage/diff.ts` are pure, while `src/storage/database.ts` and
`src/storage/persistence.ts` own the SQLite calls. The native modules cannot be
imported under Node, so pure logic must not import them.

## Storage

Sessions, patients, treatment types and settings live in SQLite
(`hanin-skincare.db`, four tables plus a `meta` key/value table).

- `src/storage/rows.ts` maps between the domain objects (camelCase) and the
  SQLite columns (snake_case). Keep it pure so it stays unit tested.
- `src/storage/diff.ts` computes the minimal set of row writes between the
  previous and next state, so an edit only touches the rows that changed.
- `src/storage/persistence.ts` keeps the original `loadData`/`saveData`/
  `clearData` API, so `DataProvider` and the backup feature are unaware of the
  change. Web falls back to AsyncStorage because `expo-sqlite` needs a WASM and
  worker setup there.
- On first launch the legacy AsyncStorage payload is copied into SQLite once,
  guarded by the `asyncstorage_migrated_v1` row in `meta`. The AsyncStorage entry
  is intentionally left behind as a safety net, so do not treat it as dead code.
- Default treatment types are seeded into the database on a fresh install. Their
  ids are referenced by sessions, so they must not be regenerated per launch.
- `expo-sqlite` is a native module: adding it requires a rebuild, and it is
  listed in `app.json` plugins.

## Rebuilding the Android toolchain

The JDK and Android SDK are not part of the image and do not survive a workspace
reset. `android/local.properties` is gitignored, so Gradle will fail with
`SDK location not found` until it is recreated. To rebuild from scratch:

```bash
sudo apt-get update && sudo apt-get install -y openjdk-21-jdk-headless unzip
mkdir -p /workspace/android-sdk/cmdline-tools && cd /tmp
curl -sSLo cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q cmdtools.zip -d /workspace/android-sdk/cmdline-tools
mv /workspace/android-sdk/cmdline-tools/cmdline-tools /workspace/android-sdk/cmdline-tools/latest

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=/workspace/android-sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
printf 'sdk.dir=/workspace/android-sdk\n' > android/local.properties
```

The SDK download is ~2.4 GB and the release build takes roughly 8 minutes on 4
CPUs. Run it with `nohup ... > /tmp/build.log 2>&1 &` and poll the log; it
outlives a single command timeout. The debug keystore must also be regenerated
if `~/.android/debug.keystore` is missing:

```bash
mkdir -p ~/.android && keytool -genkeypair -v -keystore ~/.android/debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

### Bumping the version

`android/` is generated and gitignored, so `app.json` is the source of truth for
the version. Bump `expo.version` and `expo.android.versionCode` there, then run
`npx expo prebuild --platform android --no-install` to regenerate the native
project. Android refuses to install an APK whose `versionCode` is not greater
than the installed one, so raise `versionCode` for every APK you hand out.

## Building an Android APK

The repo uses the Expo managed workflow. `android/` and `ios/` are gitignored and
generated on demand by `npx expo prebuild`.

Local build (needs JDK 21, Android SDK with platform 36, build-tools 36.0.0,
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

# Preparation

- To include the newest version of the Engine in the Android project, run `yarn android-prepare` in the root of the Monorepo
  - This creates `universal.js` in the asset folder of the Android project
- If the default configuration `config_default.json` of the Engine has changed, copy the new version into the `app/src/main/assets` folder

---

1. In Android Studio browse: File > Open and select the Android project path `PROCEED-ROOT/src/engine/native/android/`
2. Build > Make Project || Clean Project || Rebuild project
3. [Enable ADB on your Device](https://developer.android.com/studio/command-line/adb#Enabling) and connect it to your computer.
4. Browse: Run > Run 'app'.

# Build APKs

- https://developer.android.com/studio/build/building-cmdline
- https://developer.android.com/studio/build

Until now, we only build _debug_ versions

## Android Studio

- Browse: Build > Build Bundle(s) /APK(s) > Build APK(s)
- Click on "locate" at popup on the bottom right

## Command line

- In the Android project directory is the `gradlew.bat` (Win) and `gradlew.sh` (Linux|Mac) executable. For Linux and Mac you maybe need to make it executable `chmod a+x gradlew`
- `./gradlew assembleDebug`

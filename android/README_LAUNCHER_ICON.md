# Launcher Icon Instructions

Place raster foreground layers named `ic_launcher_foreground.png` for each density under:
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

Background color: `#0A1929` (already defined). Keep the deer logo centered with ~16% inset padding to avoid adaptive mask clipping.

If using vector (preferred), replace foreground with a single `ic_launcher_foreground.xml` (vector drawable) placed in `res/drawable-anydpi-v26/` and remove individual PNGs.

After updating assets, run:
```
cd android
./gradlew clean
./gradlew assembleDebug
```
Then verify the icon on a device or emulator.

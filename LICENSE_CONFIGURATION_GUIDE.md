# License Key Configuration Guide

## Overview
This guide explains how to properly configure license keys to prevent gray screen issues and ensure proper app initialization.

## Background Geolocation License (Optional)

### If You Have a Transistorsoft License:

1. **Add to AndroidManifest.xml**:
   ```xml
   <!-- In android/app/src/main/AndroidManifest.xml -->
   <application>
     <!-- ... other config ... -->
     
     <!-- Background Geolocation license -->
     <meta-data
       android:name="com.transistorsoft.locationmanager.license"
       android:value="YOUR_ACTUAL_LICENSE_KEY_HERE" />
   </application>
   ```

2. **Verify License Format**:
   - Should be a long alphanumeric string
   - No quotes or special formatting
   - Example format: `abc123def456ghi789...`

### If You Don't Have a License:
- **Do Nothing** - The app will run in evaluation mode
- **Never add placeholder text** like "YOUR_LICENSE_KEY"
- The background geolocation will work with limited functionality

## Google Maps API Key (Required for Maps)

### Setup Steps:

1. **Get API Key**:
   - Go to Google Cloud Console
   - Enable "Maps SDK for Android"
   - Create credentials → API Key
   - Restrict to your app package: `com.buzz20`

2. **Add to strings.xml**:
   ```xml
   <!-- In android/app/src/main/res/values/strings.xml -->
   <resources>
     <!-- ... other strings ... -->
     <string name="google_maps_api_key">YOUR_ACTUAL_GOOGLE_MAPS_API_KEY</string>
   </resources>
   ```

3. **Verify AndroidManifest.xml has**:
   ```xml
   <meta-data
     android:name="com.google.android.geo.API_KEY"
     android:value="@string/google_maps_api_key" />
   ```

## Troubleshooting Gray Screen Issues

### Common Causes:
1. **Invalid license keys** - placeholder text being treated as real license
2. **Synchronous initialization failures** - services crashing during startup
3. **Missing error boundaries** - unhandled exceptions causing blank screens

### Solutions Implemented:
1. **Graceful error handling** - Services fail gracefully without crashing UI
2. **Error boundary component** - Catches and displays user-friendly error messages
3. **License validation** - Checks if licenses are valid before using them
4. **Fallback modes** - App continues with limited functionality if services fail

### Debug Steps:
1. Check console logs for specific error messages
2. Look for "license" or "configuration" related warnings
3. Verify all meta-data tags in AndroidManifest.xml are properly formatted
4. Test app launch after each configuration change

## Build Process Verification

### After Making Changes:

1. **Clean and rebuild**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew :app:assemblePlayDebug
   ```

2. **Install and test**:
   ```bash
   adb install -r app/build/outputs/apk/play/debug/app-play-debug.apk
   ```

3. **Check logs**:
   ```bash
   adb logcat | grep -E "(license|geolocation|maps)"
   ```

## Expected Behavior

### With Valid Licenses:
- App loads HomeScreen immediately after login
- Background location tracking works fully
- Maps display with proper styling and data

### With Invalid/Missing Licenses:
- App loads HomeScreen with limited functionality message
- Background location works in evaluation mode
- Maps may show without custom styling

### Never Should Happen:
- Gray or blank screen after login
- App crashes during initialization
- Complete failure to load UI

## Emergency Recovery

If app still shows gray screen:
1. Remove ALL license-related meta-data from AndroidManifest.xml
2. Clean and rebuild
3. The app will run in basic mode but should not crash
4. Check ErrorBoundary logs for specific issues

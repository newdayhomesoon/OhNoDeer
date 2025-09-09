# Oh No Deer - Advanced Features Setup Guide

## Overview
This guide provides step-by-step instructions for implementing the advanced features of the Oh No Deer app, including background geofencing, voice commands, and monetization.

## Part 1: Background Service & Geofencing Setup

### iOS Setup
1. **Enable Background Modes:**
   - Open Xcode project: `ios/buzz20.xcodeproj`
   - Select target `buzz20`
   - Go to Capabilities tab
   - Enable "Background Modes"
   - Check "Location updates"

2. **Add Siri Integration:**
   - In Capabilities tab, enable "Siri"
   - The `AppIntents.swift` file is already created in `ios/OhNoDeer/`

3. **Update Podfile:**
   ```ruby
   target 'buzz20' do
     # ... existing pods ...
     pod 'react-native-background-geolocation', :path => '../node_modules/react-native-background-geolocation'
     pod 'react-native-permissions', :path => '../node_modules/react-native-permissions'
   end
   ```

### Android Setup
1. **Update build.gradle:**
   ```gradle
   dependencies {
       // ... existing dependencies ...
       implementation 'com.reactnativebackgroundgeolocation:react-native-background-geolocation:4.16.0'
       implementation 'com.reactnativepermissions:react-native-permissions:4.1.5'
   }
   ```

2. **Create Background Service:**
   Create `android/app/src/main/java/com/buzz20/BackgroundLocationService.java`:
   ```java
   package com.buzz20;

   import android.app.Notification;
   import android.app.NotificationChannel;
   import android.app.NotificationManager;
   import android.app.Service;
   import android.content.Intent;
   import android.os.Build;
   import android.os.IBinder;
   import androidx.core.app.NotificationCompat;

   public class BackgroundLocationService extends Service {
       private static final String CHANNEL_ID = "location_service";

       @Override
       public void onCreate() {
           super.onCreate();
           createNotificationChannel();
           startForeground(1, createNotification());
       }

       private void createNotificationChannel() {
           if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
               NotificationChannel channel = new NotificationChannel(
                   CHANNEL_ID,
                   "Location Service",
                   NotificationManager.IMPORTANCE_LOW
               );
               NotificationManager manager = getSystemService(NotificationManager.class);
               manager.createNotificationChannel(channel);
           }
       }

       private Notification createNotification() {
           return new NotificationCompat.Builder(this, CHANNEL_ID)
                   .setContentTitle("Oh No Deer")
                   .setContentText("Monitoring for wildlife hotspots")
                   .setSmallIcon(R.mipmap.ic_launcher)
                   .build();
       }

       @Override
       public IBinder onBind(Intent intent) {
           return null;
       }
   }
   ```

## Part 2: Voice Command Integration

### iOS Siri Setup
1. **Add Siri Intent Extension:**
   - In Xcode: File > New > Target
   - Select "Intents Extension"
   - Name: "SiriIntent"
   - Copy the `AppIntents.swift` content to the extension

2. **Configure Siri Phrases:**
   - The phrases are already defined in `AppIntents.swift`
   - Users can add shortcuts via Settings > Siri & Search

### Android App Actions Setup
1. **Update AndroidManifest.xml:**
   The manifest is already updated with the necessary intent filters.

2. **Create App Actions:**
   Create `android/app/src/main/res/xml/actions.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <actions>
       <action intentName="com.buzz20.ohnodeer.REPORT_SIGHTING">
           <parameter name="animalType" type="AnimalType" />
           <parameter name="quantity" type="Number" />
           <fulfillment urlTemplate="ohnodeer://report{?animalType,quantity}" />
       </action>
   </actions>
   ```

3. **Define Types:**
   Create `android/app/src/main/res/xml/entity_types.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <entity-types>
       <entity-type name="AnimalType">
           <entity name="deer" alternateNames="deer,buck,doe" />
           <entity name="bear" alternateNames="bear,grizzly,black bear" />
           <entity name="moose" alternateNames="moose,elk" />
       </entity-type>
   </entity-types>
   ```

## Part 3: Monetization Setup

### iOS In-App Purchase Setup
1. **Create In-App Purchase Products:**
   - Go to App Store Connect
   - Select your app
   - Go to Features > In-App Purchases
   - Create two subscriptions:
     - Product ID: `com.buzz20.ohnodeer.pro.monthly`
     - Product ID: `com.buzz20.ohnodeer.pro.annual`

2. **Configure Shared Secret:**
   - In App Store Connect > Users and Access > Shared Secret
   - Copy the shared secret for server-side verification

### Android In-App Billing Setup
1. **Update build.gradle:**
   ```gradle
   dependencies {
       // ... existing dependencies ...
       implementation 'com.android.billingclient:billing:5.2.0'
   }
   ```

2. **Create Billing Products:**
   - Go to Google Play Console
   - Select your app
   - Go to Monetize > Products > In-app products
   - Create subscriptions:
     - Product ID: `ohno_deer_pro_monthly`
     - Product ID: `ohno_deer_pro_annual`

### AdMob Setup
1. **Get AdMob App IDs:**
   - Go to AdMob console
   - Create app entries for iOS and Android
   - Get the App IDs and Ad Unit IDs

2. **Update Configuration:**
   - Replace the placeholder Ad Unit IDs in `adService.ts`
   - Update the AndroidManifest.xml with your AdMob App ID

## Part 4: Firebase Configuration

### Update Firestore Rules
Add these rules to your Firestore security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Wildlife reports are readable by all authenticated users
    match /wildlife_reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### Cloud Functions Setup
Create these Cloud Functions for hotspot processing:

1. **checkHotspots** function:
```javascript
exports.checkHotspots = functions.https.onCall(async (data, context) => {
  // Implementation for hotspot calculation
  const { latitude, longitude } = data;
  // Return hotspots within 5 miles
});
```

2. **processReports** function:
```javascript
exports.processReports = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // Process recent reports and update hotspots
});
```

## Part 5: Testing Checklist

### Background Service Testing
- [ ] Request location permissions
- [ ] Start background service
- [ ] Verify geofence creation
- [ ] Test hotspot entry notifications
- [ ] Test audio/voice alerts

### Voice Commands Testing
- [ ] iOS: Test Siri shortcuts
- [ ] Android: Test Google Assistant commands
- [ ] Verify report submission via voice
- [ ] Test quantity parsing

### Monetization Testing
- [ ] Test subscription purchase flow
- [ ] Verify receipt validation
- [ ] Test ad display/removal
- [ ] Test restore purchases

### Integration Testing
- [ ] Test Pro user features
- [ ] Verify background service with Pro status
- [ ] Test complete user flow
- [ ] Performance testing with background services

## Part 6: Production Deployment

### Pre-Launch Checklist
1. **Replace Test IDs:**
   - Update AdMob IDs with production values
   - Update Firebase config with production project
   - Update store product IDs

2. **Configure Analytics:**
   - Set up Firebase Analytics
   - Configure AdMob reporting
   - Set up crash reporting

3. **App Store Submissions:**
   - iOS: Submit with Siri integration enabled
   - Android: Submit with background location permissions

4. **Privacy Policy Updates:**
   - Update privacy policy for background location
   - Add voice command data usage
   - Include AdMob data collection

## Troubleshooting

### Common Issues
1. **Background Service Not Starting:**
   - Check location permissions
   - Verify Android manifest permissions
   - Check iOS background modes

2. **Voice Commands Not Working:**
   - Verify Siri/App Actions setup
   - Check intent configurations
   - Test with device restart

3. **In-App Purchases Failing:**
   - Verify product IDs match store setup
   - Check network connectivity
   - Verify receipt validation

4. **Ads Not Displaying:**
   - Check AdMob account status
   - Verify Ad Unit IDs
   - Check ad request limits

## Support Resources
- React Native Background Geolocation: https://transistorsoft.github.io/react-native-background-geolocation/
- React Native IAP: https://github.com/dooboolab/react-native-iap
- AdMob Documentation: https://admob.google.com/
- Firebase Documentation: https://firebase.google.com/docs

---

**Note:** This setup guide assumes you have already configured the basic Firebase and React Native setup. Make sure to test thoroughly on both iOS and Android devices before production deployment.

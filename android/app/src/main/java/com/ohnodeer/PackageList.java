package com.ohnodeer;

import android.app.Application;
import android.content.Context;
import android.content.res.Resources;

import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.List;

import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.reactnativecommunity.geolocation.GeolocationPackage;
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage;
import io.invertase.firebase.firestore.ReactNativeFirebaseFirestorePackage;
import io.invertase.firebase.functions.ReactNativeFirebaseFunctionsPackage;
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingPackage;
import com.reactnativegooglesignin.RNGoogleSigninPackage;
import com.dooboolab.rniap.RNIapPackage;
import com.rnmaps.maps.MapsPackage;
import com.zoontek.rnpermissions.RNPermissionsPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.zmxv.RNSound.RNSoundPackage;
import net.no_mad.tts.TextToSpeechPackage;

public class PackageList {
  private Application application;
  private ReactNativeHost reactNativeHost;
  private MainPackageConfig mConfig;

  public PackageList(ReactNativeHost reactNativeHost) {
    this(reactNativeHost, null);
  }

  public PackageList(Application application) {
    this(application, null);
  }

  public PackageList(ReactNativeHost reactNativeHost, MainPackageConfig config) {
    this.reactNativeHost = reactNativeHost;
    mConfig = config;
  }

  public PackageList(Application application, MainPackageConfig config) {
    this.reactNativeHost = null;
    this.application = application;
    mConfig = config;
  }

  private ReactNativeHost getReactNativeHost() {
    return this.reactNativeHost;
  }

  private Resources getResources() {
    return this.getApplication().getResources();
  }

  private Application getApplication() {
    if (this.reactNativeHost == null) return this.application;
    try {
      java.lang.reflect.Method method = this.reactNativeHost.getClass().getDeclaredMethod("getApplication");
      method.setAccessible(true);
      return (Application) method.invoke(this.reactNativeHost);
    } catch (Exception e) {
      return this.application;
    }
  }

  private Context getApplicationContext() {
    return this.getApplication().getApplicationContext();
  }

  public List<ReactPackage> getPackages() {
    return Arrays.<ReactPackage>asList(
        new MainReactPackage(mConfig),
        new AsyncStoragePackage(),
        new GeolocationPackage(),
        new ReactNativeFirebaseAppPackage(),
        new ReactNativeFirebaseAuthPackage(),
        new ReactNativeFirebaseFirestorePackage(),
        new ReactNativeFirebaseFunctionsPackage(),
        new ReactNativeFirebaseMessagingPackage(),
        new RNGoogleSigninPackage(),
        new RNIapPackage(),
        new MapsPackage(),
        new RNPermissionsPackage(),
        new ReactNativePushNotificationPackage(),
        new RNSoundPackage(),
        new TextToSpeechPackage()
    );
  }
}

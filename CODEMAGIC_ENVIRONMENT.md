Codemagic environment variables and diagnostics

This repository uses a Codespaces-first workflow and relies on Codemagic to perform Android builds and automated runtime checks.

Environment variables to set in Codemagic (Project > Environment variables):

- FIREBASE_API_KEY — your Firebase apiKey
- FIREBASE_AUTH_DOMAIN — firebase authDomain
- FIREBASE_PROJECT_ID — firebase projectId
- FIREBASE_STORAGE_BUCKET — firebase storageBucket
- FIREBASE_MESSAGING_SENDER_ID — firebase messagingSenderId
- FIREBASE_APP_ID — firebase appId

How to use the diagnostics YAML

1. Upload `codemagic.diagnostics.yaml` to Codemagic or copy its contents into a new workflow in the Codemagic UI.
2. Add the above environment variables (secure values for API keys).
3. Run the workflow. The diagnostics job will:
   - install dependencies
   - inject `OrganizedCode/Storage/firebase/config.ts` from the env vars (temporary file during build)
   - build an Android debug APK
   - list drawables inside the APK so you can verify `temp_bg.png` or other assets are packaged
   - attempt to capture logcat output (if an emulator is available) so you can inspect persistence markers and Firestore logs.

Notes:
- `codemagic.yaml` is gitignored in this repo, so you can keep your primary CI config private. Use `codemagic.diagnostics.yaml` for temporary diagnostics or paste into Codemagic UI.
- The app writes a persistence flag to AsyncStorage at key `firebase_persistence_set_v1`. Use the `DebugStorageScreen` (available at `OrganizedCode/UI/DebugStorageScreen.tsx`) to view that key in the app UI during a test run.

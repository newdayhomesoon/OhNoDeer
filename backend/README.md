# Oh No Deer - Backend Setup

This directory contains the Firebase backend infrastructure for the Oh No Deer wildlife reporting app.

## Project Structure

```
backend/
├── functions/           # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts    # Main functions code
│   ├── package.json
│   └── tsconfig.json
├── firebase.json        # Firebase project configuration
├── firestore.rules      # Firestore security rules
└── .firebaserc         # Firebase project ID
```

## Setup Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Project
```bash
cd backend
firebase init
```

### 4. Install Function Dependencies
```bash
cd functions
npm install
```

### 5. Deploy to Firebase
```bash
# Deploy functions and firestore rules
firebase deploy

# Or deploy only functions
firebase deploy --only functions
```

## Cloud Functions

### processReports
- **Trigger**: Scheduled (every 1 hour)
- **Purpose**: Processes wildlife reports and generates dynamic hotspots
- **Algorithm**: Grid-based clustering (1km x 1km cells)
- **Heat Levels**:
  - Low: 1-4 reports in last 4 hours
  - High: 5+ reports in last hour
  - Medium: Everything else

### checkHotspots
- **Trigger**: HTTP callable function
- **Purpose**: Returns hotspots within 5-mile radius of user location
- **Authentication**: Required

## Firestore Collections

### wildlife_reports
```typescript
{
  userId: string;
  timestamp: Timestamp;
  location: GeoPoint;
  animalCount?: number;
  animalType: string;
}
```

### users
```typescript
{
  isPro: boolean;
  email: string;
  authId: string;
}
```

### hotspots
```typescript
{
  coordinates: GeoPoint;
  heatLevel: 'Low' | 'Medium' | 'High';
  reportCount: number;
  lastUpdated: Timestamp;
  gridId: string;
}
```

## Development

### Local Emulation
```bash
firebase emulators:start
```

### Testing Functions
```bash
cd functions
npm run shell
```

### View Logs
```bash
firebase functions:log
```

## Security Rules

- Wildlife reports: Users can only read/write their own reports
- Users: Users can only read/write their own profile
- Hotspots: Read-only for authenticated users, write-only for functions

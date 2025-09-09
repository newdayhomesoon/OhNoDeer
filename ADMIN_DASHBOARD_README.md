# Oh No Deer Admin Dashboard

A web-based admin panel for monitoring wildlife reports, hotspots, and system health.

## Features

- 📊 **Real-time Statistics**: Total reports, hotspot counts by activity level
- 📋 **Recent Reports**: View the 20 most recent wildlife sightings
- 🔥 **Hotspot Monitoring**: Track active wildlife hotspots with activity levels
- 🚨 **Error Logging**: Monitor system errors and issues
- 🔄 **Auto-refresh**: Data updates every 30 seconds
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project or use an existing one
2. Enable Firestore Database
3. Update the Firebase config in `admin-dashboard.html`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 2. Firestore Security Rules

Add these rules to allow admin access to the collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to admin dashboard
    match /wildlife_reports/{reportId} {
      allow read: if true; // Restrict in production
    }
    match /hotspots/{hotspotId} {
      allow read: if true; // Restrict in production
    }
    match /error_logs/{errorId} {
      allow read: if true; // Restrict in production
    }
    match /users/{userId} {
      allow read: if true; // Restrict in production
    }
  }
}
```

⚠️ **Security Warning**: The above rules allow public read access for demo purposes. In production, implement proper authentication and authorization.

### 3. Deployment

#### Option A: Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init hosting
```

4. Deploy:
```bash
firebase deploy --only hosting
```

#### Option B: Manual Deployment

Upload `admin-dashboard.html` to any web server or static hosting service.

## Data Collections

The dashboard reads from these Firestore collections:

### `wildlife_reports`
- `userId`: User identifier
- `timestamp`: Report timestamp
- `location`: GeoPoint with latitude/longitude
- `animalCount`: Number of animals
- `animalType`: Type of animal (deer, bear, etc.)

### `hotspots`
- `gridId`: Unique grid identifier
- `heatLevel`: Activity level (Low/Medium/High)
- `reportCount`: Number of reports in this hotspot
- `coordinates`: GeoPoint location
- `lastUpdated`: Last update timestamp

### `error_logs`
- `timestamp`: Error timestamp
- `source`: Component/function that caused the error
- `errorMessage`: Error description
- `userId`: User identifier (if applicable)

## Usage

1. Open the admin dashboard in a web browser
2. The dashboard will automatically load and display current data
3. Click "🔄 Refresh Data" to manually update all statistics
4. Data auto-refreshes every 30 seconds

## Customization

### Styling
Modify the CSS in `admin-dashboard.html` to match your branding.

### Data Limits
Change the `limit(20)` in the queries to display more or fewer records.

### Auto-refresh Interval
Modify `setInterval(loadData, 30000)` to change the refresh frequency (in milliseconds).

## Security Considerations

- **Authentication**: Implement Firebase Authentication for admin access
- **Firestore Rules**: Restrict access to admin users only
- **API Keys**: Keep Firebase config secure and don't expose sensitive keys
- **HTTPS**: Always serve the dashboard over HTTPS
- **Access Control**: Limit dashboard access to authorized personnel

## Troubleshooting

### Data Not Loading
- Check Firebase config is correct
- Verify Firestore security rules allow read access
- Check browser console for JavaScript errors

### Styling Issues
- Ensure CSS is loading properly
- Check for CSS conflicts with other stylesheets

### Performance Issues
- Reduce the auto-refresh interval
- Limit the number of records displayed
- Optimize Firestore queries with proper indexing

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase configuration
3. Review Firestore security rules
4. Check network connectivity

---

**Dashboard URL**: [Will be provided after deployment]

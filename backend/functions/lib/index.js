"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHotspots = exports.processReports = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Firestore references
const db = admin.firestore();
// Grid-based clustering configuration
const GRID_SIZE_METERS = 1000; // 1km grid cells
const EARTH_RADIUS_KM = 6371;
// Convert degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
// Convert radians to degrees
// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}
// Convert lat/lng to grid coordinates
function latLngToGrid(lat, lng) {
    // Convert to grid coordinates (round to nearest grid cell)
    const gridLat = Math.round(lat * (111320 / GRID_SIZE_METERS)) / (111320 / GRID_SIZE_METERS);
    const gridLng = Math.round(lng * (111320 / GRID_SIZE_METERS) * Math.cos(toRadians(lat))) /
        ((111320 / GRID_SIZE_METERS) * Math.cos(toRadians(lat)));
    const gridId = `${gridLat.toFixed(6)}_${gridLng.toFixed(6)}`;
    return { gridLat, gridLng, gridId };
}
// Calculate heat level based on report count and time
function calculateHeatLevel(reportCount, hoursSinceOldest) {
    if (reportCount >= 5 && hoursSinceOldest <= 1) {
        return 'High';
    }
    else if (reportCount >= 1 && reportCount <= 4 && hoursSinceOldest <= 4) {
        return 'Low';
    }
    else {
        return 'Medium';
    }
}
/**
 * Firebase Cloud Function: processReports
 *
 * Triggered hourly to process wildlife reports and generate dynamic hotspots.
 * Uses a grid-based clustering algorithm to group reports into non-overlapping clusters.
 *
 * Algorithm Overview:
 * 1. Query all reports from the last 24 hours
 * 2. Group reports into grid cells (1km x 1km)
 * 3. Calculate heat level for each grid cell based on report density and recency
 * 4. Update/create hotspot documents in Firestore
 * 5. Clean up old hotspots (older than 24 hours)
 */
exports.processReports = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async () => {
    const functionsLogger = functions.logger;
    try {
        functionsLogger.info('Starting processReports function');
        // Get all reports from the last 24 hours
        const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const reportsSnapshot = await db
            .collection('wildlife_reports')
            .where('timestamp', '>=', twentyFourHoursAgo)
            .get();
        if (reportsSnapshot.empty) {
            functionsLogger.info('No recent reports found');
            return null;
        }
        // Group reports by grid cells
        const gridClusters = {};
        reportsSnapshot.forEach((doc) => {
            const report = doc.data();
            const { gridLat, gridLng, gridId } = latLngToGrid(report.location.latitude, report.location.longitude);
            if (!gridClusters[gridId]) {
                gridClusters[gridId] = {
                    reports: [],
                    centerLat: gridLat,
                    centerLng: gridLng,
                    gridId,
                };
            }
            gridClusters[gridId].reports.push(report);
        });
        // Process each cluster and update/create hotspots
        const batch = db.batch();
        const hotspotsRef = db.collection('hotspots');
        for (const [gridId, cluster] of Object.entries(gridClusters)) {
            const reportCount = cluster.reports.length;
            // Find the oldest report in this cluster to determine time window
            const timestamps = cluster.reports.map(r => r.timestamp.toDate().getTime());
            const oldestTimestamp = Math.min(...timestamps);
            const hoursSinceOldest = (Date.now() - oldestTimestamp) / (1000 * 60 * 60);
            const heatLevel = calculateHeatLevel(reportCount, hoursSinceOldest);
            const hotspotData = {
                coordinates: new admin.firestore.GeoPoint(cluster.centerLat, cluster.centerLng),
                heatLevel,
                reportCount,
                lastUpdated: admin.firestore.Timestamp.now(),
                gridId,
                radius: GRID_SIZE_METERS / 2, // Default radius
            };
            // Update or create hotspot document
            const hotspotDocRef = hotspotsRef.doc(gridId);
            batch.set(hotspotDocRef, hotspotData, { merge: true });
        }
        // Clean up old hotspots (older than 24 hours)
        const oldHotspotsQuery = await hotspotsRef
            .where('lastUpdated', '<', twentyFourHoursAgo)
            .get();
        oldHotspotsQuery.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        functionsLogger.info(`Processed ${reportsSnapshot.size} reports into ${Object.keys(gridClusters).length} hotspots`);
        return null;
    }
    catch (error) {
        functionsLogger.error('Error in processReports function:', error);
        throw error;
    }
});
/**
 * Firebase Cloud Function: checkHotspots
 *
 * Called by the mobile app to retrieve hotspots within a 5-mile radius of the user's location.
 * Uses Firestore's geospatial queries to efficiently find nearby hotspots.
 *
 * @param data - Contains user's latitude and longitude
 * @returns List of hotspots within 5-mile radius
 */
exports.checkHotspots = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to check hotspots');
    }
    const { latitude, longitude } = data;
    if (latitude === undefined || longitude === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Latitude and longitude are required');
    }
    try {
        // Get all current hotspots
        const hotspotsSnapshot = await db.collection('hotspots').get();
        const nearbyHotspots = [];
        hotspotsSnapshot.forEach((doc) => {
            const hotspot = doc.data();
            const distance = calculateDistance(latitude, longitude, hotspot.coordinates.latitude, hotspot.coordinates.longitude);
            // 5 miles = 8.04672 km
            if (distance <= 8.04672) {
                nearbyHotspots.push(hotspot);
            }
        });
        return {
            hotspots: nearbyHotspots,
            count: nearbyHotspots.length,
        };
    }
    catch (error) {
        functions.logger.error('Error in checkHotspots function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve hotspots');
    }
});
//# sourceMappingURL=index.js.map
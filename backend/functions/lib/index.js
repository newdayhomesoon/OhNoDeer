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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerHotspotUpdate = exports.processReports = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Firestore references
const db = admin.firestore();
// Grid-based clustering configuration
const GRID_SIZE_METERS = 1000; // 1km grid cells
// Convert degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
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
exports.processReports = functions.scheduler.onSchedule('every 1 hours', async (event) => {
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
            return;
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
        return;
    }
    catch (error) {
        functionsLogger.error('Error in processReports function:', error);
        throw error;
    }
});
/**
 * Firebase Cloud Function: triggerHotspotUpdate
 *
 * Called immediately after a wildlife report is submitted to update hotspots in real-time.
 * Uses the same grid-based clustering algorithm as processReports but runs on-demand.
 *
 * @param data - Contains the new report data (optional, can process all recent reports)
 * @returns Success confirmation with updated hotspot count
 */
exports.triggerHotspotUpdate = functions.https.onCall(async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to trigger hotspot updates');
    }
    const functionsLogger = functions.logger;
    try {
        functionsLogger.info('Starting triggerHotspotUpdate function');
        // Get all reports from the last 24 hours (same logic as processReports)
        const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const reportsSnapshot = await db
            .collection('wildlife_reports')
            .where('timestamp', '>=', twentyFourHoursAgo)
            .get();
        if (reportsSnapshot.empty) {
            functionsLogger.info('No recent reports found for hotspot update');
            return { success: true, hotspotsUpdated: 0, message: 'No recent reports to process' };
        }
        // Group reports by grid cells (same logic as processReports)
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
        // Process each cluster and update/create hotspots (same logic as processReports)
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
        const hotspotsUpdated = Object.keys(gridClusters).length;
        functionsLogger.info(`Real-time hotspot update: Processed ${reportsSnapshot.size} reports into ${hotspotsUpdated} hotspots`);
        return {
            success: true,
            hotspotsUpdated,
            reportsProcessed: reportsSnapshot.size,
            message: `Successfully updated ${hotspotsUpdated} hotspots from ${reportsSnapshot.size} recent reports`
        };
    }
    catch (error) {
        functionsLogger.error('Error in triggerHotspotUpdate function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update hotspots');
    }
});
//# sourceMappingURL=index.js.map
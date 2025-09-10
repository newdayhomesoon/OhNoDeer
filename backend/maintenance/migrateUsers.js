/**
 * One-time migration: copy users docs with random IDs to users/{authId}.
 *
 * Why: Your Firestore rules require users/{uid} owned by request.auth.uid.
 * Older docs created with addDoc have random IDs and can be blocked by rules.
 *
 * Usage:
 *   1) Ensure you have a Firebase service account JSON file.
 *   2) Set env GOOGLE_APPLICATION_CREDENTIALS to the JSON path, or pass --creds path.
 *   3) node migrateUsers.js --project your-project-id [--deleteOld]
 */

const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { deleteOld: false, projectId: undefined, creds: undefined };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--deleteOld') opts.deleteOld = true;
    else if (a === '--project') opts.projectId = args[++i];
    else if (a === '--creds') opts.creds = args[++i];
  }
  return opts;
}

async function main() {
  const { deleteOld, projectId, creds } = parseArgs();
  try {
    if (creds) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = creds;
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Provide service account with --creds path or GOOGLE_APPLICATION_CREDENTIALS');
    }

    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });
    const db = admin.firestore();

    console.log('Scanning users collection…');
    const snap = await db.collection('users').get();
    console.log(`Found ${snap.size} user docs.`);

    let migrated = 0;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const authId = data.authId;
      if (!authId || typeof authId !== 'string') continue;
      if (doc.id === authId) continue; // already aligned

      const targetRef = db.collection('users').doc(authId);
      await targetRef.set({ ...data, authId }, { merge: true });
      migrated++;
      console.log(`Migrated ${doc.id} -> ${authId}`);

      if (deleteOld) {
        await doc.ref.delete();
        console.log(`Deleted old doc ${doc.id}`);
      }
    }

    console.log(`Migration complete. Migrated: ${migrated}`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();

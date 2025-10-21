/*
CommonJS version of set-admins script so it can be executed when project uses "type": "module".
Usage:
  node .\scripts\set-admins.cjs --serviceAccount=C:\keys\service-account.json --uids=UID1,UID2
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    args.forEach(arg => {
        if (arg.startsWith('--uids')) {
            out.uids = arg.split('=')[1] || '';
        }
        if (arg.startsWith('--emails')) {
            out.emails = arg.split('=')[1] || '';
        }
        if (arg.startsWith('--serviceAccount')) {
            out.serviceAccount = arg.split('=')[1];
        }
    });
    return out;
}

async function main() {
    const args = parseArgs();
    const serviceAccountPath = args.serviceAccount || './service-account.json';
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('Arquivo de service account não encontrado em', serviceAccountPath);
        console.error('Passe --serviceAccount=/caminho/para/service-account.json');
        process.exit(1);
    }

    const serviceAccount = require(path.resolve(serviceAccountPath));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const uids = args.uids ? args.uids.split(',').map(s => s.trim()).filter(Boolean) : [];
    const emails = args.emails ? args.emails.split(',').map(s => s.trim()).filter(Boolean) : [];

    const db = admin.firestore();

    // Process UIDs first
    for (const uid of uids) {
        try {
            console.log('Setting admin claim for UID', uid);
            await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
            console.log('Claim set for', uid);
            // create/update admin doc
            const docRef = db.collection('admins').doc(uid);
            await docRef.set({ role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            console.log('Firestore admin doc created/updated for', uid);
        } catch (err) {
            console.error('Failed for UID', uid, err.message || err);
        }
    }

    // Process emails
    for (const email of emails) {
        try {
            console.log('Looking up user by email', email);
            const user = await admin.auth().getUserByEmail(email);
            const uid = user.uid;
            console.log('Found UID', uid, 'for email', email);
            console.log('Setting admin claim for', uid);
            await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
            console.log('Claim set for', uid);
            const docRef = db.collection('admins').doc(uid);
            await docRef.set({ role: 'admin', email, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            console.log('Firestore admin doc created/updated for', uid);
        } catch (err) {
            console.error('Failed for email', email, err.message || err);
        }
    }

    console.log('Done. Remember to ask users to re-login to refresh tokens.');
    process.exit(0);
}

main().catch(err => {
    console.error('Script error', err);
    process.exit(1);
});

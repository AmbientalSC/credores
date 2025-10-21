/*
Cria/atualiza documentos na coleção `users` com id = UID do Auth para permitir que o painel mostre usuários existentes no Auth.
Uso:
  node .\scripts\create-user-docs.cjs --serviceAccount=./test.json --uids=uid1,uid2
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    args.forEach(arg => {
        if (arg.startsWith('--uids')) out.uids = arg.split('=')[1] || '';
        if (arg.startsWith('--serviceAccount')) out.serviceAccount = arg.split('=')[1];
    });
    return out;
}

async function main() {
    const args = parseArgs();
    const serviceAccountPath = args.serviceAccount || './service-account.json';
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('Arquivo de service account não encontrado em', serviceAccountPath);
        process.exit(1);
    }
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const uids = args.uids ? args.uids.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!uids.length) {
        console.error('Nenhum UID fornecido. Use --uids=uid1,uid2');
        process.exit(1);
    }
    const db = admin.firestore();
    for (const uid of uids) {
        try {
            console.log('Processing UID', uid);
            const userRecord = await admin.auth().getUser(uid);
            const role = (userRecord.customClaims && userRecord.customClaims.role) || 'admin';
            const name = userRecord.displayName || userRecord.email || uid;
            const email = userRecord.email || '';
            const lastLogin = userRecord.metadata && userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : null;
            const createdAt = admin.firestore.FieldValue.serverTimestamp();
            const docRef = db.collection('users').doc(uid);
            await docRef.set({
                email,
                name,
                role,
                status: 'active',
                createdAt,
                lastLogin: lastLogin ? admin.firestore.Timestamp.fromDate(lastLogin) : null,
                createdBy: 'migration'
            }, { merge: true });
            console.log('User doc created/updated for', uid);
        } catch (err) {
            console.error('Failed for UID', uid, err.message || err);
        }
    }
    console.log('Done.');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

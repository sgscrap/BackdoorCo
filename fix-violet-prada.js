process.env.GOOGLE_CLOUD_PROJECT = 'coalition-aec44';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
    initializeApp({ projectId: 'coalition-aec44' });
}

const db = getFirestore();

async function fixVioletPrada() {
    const docId = 'seed-prada-americas-cup-violet-silver';
    const ref = db.collection('products').doc(docId);
    const snap = await ref.get();

    if (!snap.exists) {
        console.log('Doc not found by ID, searching...');
        const all = await db.collection('products').get();
        const match = all.docs.find(d => {
            const name = (d.data().name || '').toLowerCase();
            return name.includes('violet');
        });
        if (!match) { console.log('No violet product found.'); return; }
        console.log(`Found via search: ${match.data().name} | Brand: ${match.data().brand} | ID: ${match.id}`);
        await match.ref.update({ brand: 'Prada' });
        console.log('Fixed brand to Prada!');
        return;
    }

    const data = snap.data();
    console.log(`Found: ${data.name} | Current brand: ${data.brand}`);
    await ref.update({ brand: 'Prada' });
    const updated = (await ref.get()).data();
    console.log(`Brand is now: ${updated.brand} ✓`);
}

fixVioletPrada().catch(console.error);

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
    projectId: 'coalition-aec44'
});

const db = getFirestore();

async function checkPradas() {
    const pradas = await db.collection('products').where('brand', '==', 'Prada').get();
    if (pradas.empty) {
        console.log('No Pradas found in Firestore.');
        return;
    }
    pradas.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (${data.colorway}) - ID: ${doc.id}`);
    });
}

checkPradas().catch(console.error);

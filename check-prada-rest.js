const https = require('https');

const options = {
  hostname: 'firestore.googleapis.com',
  port: 443,
  path: '/v1/projects/coalition-aec44/databases/(default)/documents/products?pageSize=100',
  method: 'GET'
};

const req = https.request(options, res => {
  let responseData = '';
  res.on('data', d => responseData += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(responseData);
      const pradas = (data.documents || []).filter(doc => {
          const fields = doc.fields || {};
          return fields.brand && fields.brand.stringValue === 'Prada';
      });
      console.log(`Found ${pradas.length} Pradas in Firestore.`);
      pradas.forEach(p => {
          console.log(`- ${p.fields.name.stringValue} (${p.fields.colorway ? p.fields.colorway.stringValue : 'N/A'})`);
      });
    } catch(e) {
      console.log('Error parsing JSON:', e.message);
      console.log(responseData.substring(0, 200));
    }
  });
});

req.on('error', console.error);
req.end();

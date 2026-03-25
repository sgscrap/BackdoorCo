const https = require('https');

const data = JSON.stringify({
  "fields": {
    "images": {
      "arrayValue": {
        "values": [
          { "stringValue": "https://media-photos.depop.com/b1/42678270/3567658097_e3af944c0d6a496180c8ec87d6d27ef1/P0.jpg" },
          { "stringValue": "https://media-photos.depop.com/b1/42678270/3567658102_88003859c7154a9b97c3d163eb13fef2/P0.jpg" },
          { "stringValue": "https://media-photos.depop.com/b1/42678270/3567658099_73b5671008c1440aa1bdcc9cfeaa13e7/P0.jpg" }
        ]
      }
    }
  }
});

const options = {
  hostname: 'firestore.googleapis.com',
  port: 443,
  path: '/v1/projects/coalition-aec44/databases/(default)/documents/products/HFSGZ0pgRmDo1EWHgtUJ?updateMask.fieldPaths=images&key=AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseData = '';
  res.on('data', d => responseData += d);
  res.on('end', () => console.log(responseData));
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();

const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function testApi() {
  const endpoints = [
    'http://localhost:8000/api/weather/BHARATI/current',
    'http://localhost:8000/api/weather/BHARATI/history',
    'http://localhost:8000/api/weather/MAITRI/current',
    'http://localhost:8000/api/weather/MAITRI/history',
  ];

  console.log('=== API ENDPOINT AUDIT ===');
  for (const ep of endpoints) {
    try {
      const res = await fetchJson(ep);
      console.log(`Endpoint: ${ep} | Status: ${res.status}`);
      if (res.status === 200 && res.body && res.body.data && Array.isArray(res.body.data)) {
        console.log(`  -> Items: ${res.body.data.length} | Sample: ${JSON.stringify(res.body.data[0])}`);
      } else if (res.status === 200) {
        console.log(`  -> Payload: ${JSON.stringify(res.body)}`);
      } else {
        console.log(`  -> Non-200 Payload: ${JSON.stringify(res.body)}`);
      }
    } catch (e) {
      console.log(`Endpoint: ${ep} | Error: ${e.message}`);
    }
  }
}

testApi();

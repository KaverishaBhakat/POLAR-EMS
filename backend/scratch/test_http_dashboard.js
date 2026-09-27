const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const maitriStationId = '5e70a9cf-fe6b-4c3a-a615-79fd2e453b60';
  const bharatiStationId = '195d6d64-43fb-4cf1-9a1a-dae1aba84322';

  console.log('Fetching Maitri dashboard via HTTP...');
  const resMaitri = await get(`http://localhost:8000/api/dashboard/${maitriStationId}`);
  console.log('Maitri HTTP Status:', resMaitri.status);
  console.log('Maitri Top-level Solar:', {
    solarPowerKW: resMaitri.body.data.solarPowerKW,
    solarSource: resMaitri.body.data.solarSource,
    isTelemetryLive: resMaitri.body.data.isTelemetryLive,
    solarAvailable: resMaitri.body.data.solarAvailable,
  });

  console.log('\nFetching Bharati dashboard via HTTP...');
  const resBharati = await get(`http://localhost:8000/api/dashboard/${bharatiStationId}`);
  console.log('Bharati HTTP Status:', resBharati.status);
  console.log('Bharati Top-level Solar:', {
    solarPowerKW: resBharati.body.data.solarPowerKW,
    solarSource: resBharati.body.data.solarSource,
    isTelemetryLive: resBharati.body.data.isTelemetryLive,
    solarAvailable: resBharati.body.data.solarAvailable,
  });
}

main().catch(console.error);

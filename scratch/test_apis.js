const http = require('http');

function testUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch(e) {
          resolve({ status: res.statusCode, data: data.substring(0, 200) });
        }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function run() {
  const tests = [
    'http://localhost:5000/api/stations',
    'http://localhost:5000/api/stations/MAITRI',
    'http://localhost:5000/api/stations/maitri',
    'http://localhost:5000/api/stations/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
    'http://localhost:5000/api/stations/BHARATI',
    'http://localhost:5000/api/stations/bharati',
    'http://localhost:5000/api/solar-generation-history/MAITRI',
    'http://localhost:5000/api/solar-generation-history/maitri',
    'http://localhost:5000/api/solar-generation-history/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
    'http://localhost:5000/api/solar-generation-history/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60/summary',
    'http://localhost:5000/api/solar-generation-history/maitri/summary',
    'http://localhost:5000/api/solar-resource/climatology?stationId=5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
    'http://localhost:5000/api/solar-resource/summary?stationId=5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
    'http://localhost:5000/api/weather/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60/current',
    'http://localhost:5000/api/weather/maitri/current',
    'http://localhost:5000/api/energy/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60/current',
    'http://localhost:5000/api/energy/maitri/current',
    'http://localhost:5000/api/renewable/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60/current',
    'http://localhost:5000/api/renewable/maitri/current',
    'http://localhost:5000/api/optimization/maitri',
    'http://localhost:5000/api/optimization/5e70a9cf-fe6b-4c3a-a615-79fd2e453b60',
    'http://localhost:5000/api/forecast/maitri',
    'http://localhost:5000/api/forecast/weather/maitri',
    'http://localhost:5000/api/simulation/scenarios',
    'http://localhost:5000/api/simulation/run/maitri/polar-night',
    'http://localhost:8001/health',
  ];

  for (const url of tests) {
    const res = await testUrl(url);
    console.log(`URL: ${url}`);
    console.log(`STATUS: ${res.status || 'ERROR'}`);
    if (res.error) {
      console.log(`ERROR: ${res.error}`);
    } else if (res.data) {
      if (typeof res.data === 'object') {
        console.log(`RESPONSE:`, JSON.stringify(res.data).substring(0, 300));
      } else {
        console.log(`RESPONSE: ${String(res.data).substring(0, 200)}`);
      }
    }
    console.log('----------------------------------------------------');
  }
}

run().then(() => process.exit(0));

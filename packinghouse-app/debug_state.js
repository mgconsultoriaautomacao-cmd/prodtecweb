const db = require('./src/db.js');
const appService = require('./src/services/appService.js');

(async () => {
  try {
    const state = await appService.stateGet({ stationId: 'ST01', role: 'EMBALADOR' });
    console.log("Top 10:");
    for (const r of state.top10) {
      console.log(r.name, " -> photoPath:", r.photoPath);
    }
  } catch (err) {
    console.error(err);
  }
})();

const fs = require('fs');
const p = '/root/hotelcrs_backend//cron.log';
fs.appendFileSync(p, `${new Date().toISOString()} - cron ran\n`);
console.log('done');

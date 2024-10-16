require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Schedule a task to run every Monday at 00:00 (midnight)
// * * * * *
// minute hour day(month) month day(week)

cron.schedule(
  '* * * * *', //'0 0 * * 1',
  async () => {
    // TODO : authentication ? BEARER TOKEN ???
    const res = await fetch(`${BASE_URL}/api/file-manager/run-sweeper`);
    console.log(res.status, res.statusText);
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

console.log('Weekly cron job running.....');

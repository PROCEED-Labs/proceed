require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Schedule a task to run every Monday at 00:00 (midnight)
cron.schedule(
  '0 0 * * 1',
  async () => {
    const res = await fetch(`${BASE_URL}/api/file-manager/run-sweeper`);
    console.log(res.status, res.statusText);
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

console.log('Weekly cron job scheduled for midnight');

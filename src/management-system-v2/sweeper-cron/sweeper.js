require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const token = process.env.SCHEDULER_TOKEN;
if (!token || token.length === 0) {
  throw new Error('No token, please set SCHEDULER_TOKEN');
}

// Schedule a task to run every Monday at 00:00 (midnight)
// * * * * *
// minute hour day(month) month day(week)

cron.schedule(
  '0 0 * * 1', // Adjust cron timing as needed
  async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/private/run-sweeper`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(res.status, res.statusText);
    } catch (error) {
      console.error('Error running sweeper:', error.message);
    }
  },
  {
    scheduled: true,
    timezone: 'UTC',
  },
);

console.log('Weekly cron job running.....');

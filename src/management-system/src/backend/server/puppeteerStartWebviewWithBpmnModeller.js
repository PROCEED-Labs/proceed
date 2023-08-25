import puppeteer from 'puppeteer';
import logger from '../shared-electron-server/logging.js';
import ports from '../../../ports.js';

export default async function startWebviewWithPuppeteer() {
  // start puppeteer headless in production but let it open a window for debugging in development mode
  const headless = process.env.NODE_ENV === 'production' ? true : false;
  // necessary for Puppeteer in Docker: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
  const args = ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'];

  if (process.env.NODE_ENV === 'development') {
    // adding flag to enable debugging in dev mode
    args.push('--remote-debugging-port=9223');
  }

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args,
    headless,
  });
  const page = await browser.newPage();

  const port =
    process.env.NODE_ENV === 'production' ? ports.puppeteer : ports['dev-server'].puppeteer;
  try {
    await page.goto(`https://localhost:${port}/bpmn-modeller.html`);
  } catch (err) {
    logger.error(
      'Failed to start client that applies bpmn events for backend. Bpmn changes will not be saved!',
    );
  }

  logger.debug('Puppet running');
}

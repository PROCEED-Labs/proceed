import { test as base } from '@playwright/test';
import { ProcessListPage } from './process-list.page';
import { mockClipboardAPI } from '../testUtils';

type MyFixtures = {
  processListPage: ProcessListPage;
};

export const test = base.extend<MyFixtures>({
  processListPage: async ({ page }, use) => {
    // set up the fixture

    await mockClipboardAPI(page);

    const processListPage = new ProcessListPage(page);
    await processListPage.login();

    // use the fixture value in the test
    await use(processListPage);

    // ensure any created processes are cleaned up
    await processListPage.removeAllProcesses();
  },
});

export { expect } from '@playwright/test';

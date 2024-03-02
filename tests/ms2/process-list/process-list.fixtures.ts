import { test as base } from '@playwright/test';
import { ProcessListPage } from './process-list.page';

type MyFixtures = {
  processListPage: ProcessListPage;
};

export const test = base.extend<MyFixtures>({
  processListPage: async ({ page }, use) => {
    // set up the fixture
    await page.goto('http://localhost:3000');
    const processListPage = new ProcessListPage(page);
    await processListPage.login();

    // use the fixture value in the test
    await use(processListPage);
  },
});

export { expect } from '@playwright/test';

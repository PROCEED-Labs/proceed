import { test as base } from '@playwright/test';
import { ProcessListPage } from './process-list.page';
import { MS2Page } from '../ms2.page';
import { mockClipboardAPI } from '../testUtils';

type MyFixtures = {
  processListPage: ProcessListPage;
  ms2Page: MS2Page;
};

export const test = base.extend<MyFixtures>({
  ms2Page: async ({ page }, use) => {
    const ms2Page = new MS2Page(page);
    await ms2Page.login();

    use(ms2Page);
  },
  processListPage: async ({ page, ms2Page }, use) => {
    // set up the fixture
    await mockClipboardAPI(page);

    const processListPage = new ProcessListPage(page);
    await processListPage.goto();

    // use the fixture value in the test
    await use(processListPage);

    // ensure any created processes are cleaned up
    await processListPage.removeAllProcesses();
  },
});

export { expect } from '@playwright/test';

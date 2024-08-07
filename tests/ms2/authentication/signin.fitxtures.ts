import { test as base } from '@playwright/test';
import { SigninPage } from './signin.page';
import { MS2Page } from '../ms2.page';
import { ProcessListPage } from '../processes/process-list.page';

export const test = base.extend<{
  signinPage: SigninPage;
  ms2Page: MS2Page;
  processListPage: ProcessListPage;
}>({
  ms2Page: async ({ page }, use) => {
    const ms2Page = new MS2Page(page);
    await use(ms2Page);
  },
  processListPage: async ({ page, ms2Page }, use) => {
    const processListPage = new ProcessListPage(page);
    await use(processListPage);
    await processListPage.removeAllProcesses();
  },
  signinPage: async ({ page, processListPage }, use) => {
    const signinPage = new SigninPage(page);
    await use(signinPage);

    // TODO: move this somewhere else + avoid race conditions
    await signinPage.deleteTestUser();
  },
});

export { expect } from '@playwright/test';

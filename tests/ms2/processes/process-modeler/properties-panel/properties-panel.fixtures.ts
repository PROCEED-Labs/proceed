import { test as base } from '@playwright/test';
import { PropertiesPanelPage } from './properties-panel.page';
import { MS2Page } from '../../../ms2.page';
import { ProcessListPage } from '../../process-list.page';
import { ProcessModelerPage } from '../process-modeler.page';

// Declare the types of your fixtures.
type MyFixtures = {
  propertiesPanelPage: PropertiesPanelPage;
  ms2Page: MS2Page;
  processListPage: ProcessListPage;
  processModelerPage: ProcessModelerPage;
};

// Extend base test by providing "propertiesPanelPage".
// This new "test" can be used in multiple test files, and each of them will get the fixtures.
export const test = base.extend<MyFixtures>({
  ms2Page: async ({ page }, use) => {
    const ms2Page = new MS2Page(page);
    await ms2Page.login();
    use(ms2Page);
  },
  processListPage: async ({ page, ms2Page }, use) => {
    const processListPage = new ProcessListPage(page);
    await use(processListPage);
    await processListPage.removeAllProcesses();
  },
  processModelerPage: async ({ page, processListPage }, use) => {
    const processModelerPage = new ProcessModelerPage(page);
    await use(processModelerPage);
  },
  propertiesPanelPage: async ({ page, processModelerPage }, use) => {
    const propertiesPanelPage = new PropertiesPanelPage(page);
    await use(propertiesPanelPage);
  },
});

export { expect } from '@playwright/test';

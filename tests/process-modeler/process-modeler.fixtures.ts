import { test as base } from '@playwright/test';
import { ProcessModelerPage } from './process-modeler.page';

// Declare the types of your fixtures.
type MyFixtures = {
  processModelerPage: ProcessModelerPage;
};

// Extend base test by providing "processModelerPage".
// This new "test" can be used in multiple test files, and each of them will get the fixtures.
export const test = base.extend<MyFixtures>({
  processModelerPage: async ({ page }, use) => {
    // Set up the fixture.
    await page.goto('/');
    const processModelerPage = new ProcessModelerPage(page);
    await processModelerPage.login();
    await processModelerPage.createProcess();
    // await processModelerPage.goto();

    // Use the fixture value in the test.
    await use(processModelerPage);

    // Clean up the fixture.
    await processModelerPage.removeAllProcesses();
    await page.waitForTimeout(1000);
  },
});

export { expect } from '@playwright/test';

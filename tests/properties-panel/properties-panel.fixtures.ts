import { test as base } from '@playwright/test';
import { PropertiesPanelPage } from './properties-panel.page';

// Declare the types of your fixtures.
type MyFixtures = {
  propertiesPanelPage: PropertiesPanelPage;
};

// Extend base test by providing "propertiesPanelPage".
// This new "test" can be used in multiple test files, and each of them will get the fixtures.
export const test = base.extend<MyFixtures>({
  propertiesPanelPage: async ({ page }, use) => {
    // Set up the fixture.
    await page.goto('http://localhost:3000/processes/');
    const propertiesPanelPage = new PropertiesPanelPage(page);
    await propertiesPanelPage.login();
    await propertiesPanelPage.createProcess();
    await propertiesPanelPage.goto();

    // Use the fixture value in the test.
    await use(propertiesPanelPage);

    // Clean up the fixture.
    await propertiesPanelPage.removeAllProcesses();
    await page.waitForTimeout(1000);
  },
});

export { expect } from '@playwright/test';

import { test as base } from '@playwright/test';
import { TasklistPage } from './tasklist.page';

// Declare the types of your fixtures.
type MyFixtures = {
  tasklistPage: TasklistPage;
};

// Extend base test by providing "tasklistPage".
// This new "test" can be used in multiple test files, and each of them will get the fixtures.
export const test = base.extend<MyFixtures>({
  tasklistPage: async ({ page }, use) => {
    // Set up the fixture.
    await page.goto('https://localhost:33083/#/');
    const tasklistPage = new TasklistPage(page);
    await tasklistPage.goto();

    // Use the fixture value in the test.
    await use(tasklistPage);

    // Clean up the fixture.
    await tasklistPage.removeAll();
    await page.waitForTimeout(1000);
  },
});

export { expect } from '@playwright/test';

import { test, expect } from './tasklist.fixtures';

test('shows the active tasks', async ({ tasklistPage }) => {
  await expect(tasklistPage.emptyTasklist).toBeVisible();
  await tasklistPage.addTask();
  await tasklistPage.addTask();
  await tasklistPage.addTask();
  // Wait for task to propagate.
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
});

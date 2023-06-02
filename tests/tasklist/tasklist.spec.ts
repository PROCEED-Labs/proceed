import { test, expect } from './tasklist.fixtures';

test('shows the active task with stored information', async ({ tasklistPage }) => {
  await expect(tasklistPage.emptyTasklist).toBeVisible();
  await tasklistPage.createUsertaskProcess();
  await tasklistPage.addTask();

  // Wait for task to propagate.
  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);

  // check attributes of userTask in userTaskCard inside of tasklist
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .user > div > span').textContent()
    ).trim()
  ).toEqual('Not specified');
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .priority > div > span').textContent()
    ).trim()
  ).toEqual('1/10');
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .status > div > span').textContent()
    ).trim()
  ).toEqual('NEW');
  expect(
    (
      await tasklistPage.page
        .locator('.mainInfo > .rightCol > .runningTime > div > span')
        .textContent()
    ).trim()
  ).toEqual('0min');
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .rightCol > .due > div > span').textContent()
    ).trim()
  ).toEqual('Not specified');

  await tasklistPage.changePriorityOfTask(3);
  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .priority > div > span').textContent()
    ).trim()
  ).toEqual('3/10');
});

test('shows multiple active tasks in tasklist', async ({ tasklistPage }) => {
  await expect(tasklistPage.emptyTasklist).toBeVisible();
  // Add 2 different Processes and Tasks
  await tasklistPage.createUsertaskProcess({
    processName: 'My Process 1',
    priority: 1,
    duration: { minutes: 30 },
  });
  await tasklistPage.createUsertaskProcess({
    processName: 'My Process 2',
    priority: 10,
    duration: { minutes: 10 },
  });
  await tasklistPage.addTask('My Process 1');
  await tasklistPage.addTask('My Process 2');

  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
  await expect(tasklistPage.page.locator('.tasks .task')).toHaveCount(2);

  // sort by priority ascendingly
  await tasklistPage.sortTask('Priority');
  expect(
    (
      await tasklistPage.page
        .locator('.tasks .task')
        .nth(0)
        .locator('.mainInfo > .leftCol > .priority > div > span')
        .textContent()
    ).trim()
  ).toEqual('1/10');
  expect(
    (
      await tasklistPage.page
        .locator('.tasks .task')
        .nth(1)
        .locator('.mainInfo > .leftCol > .priority > div > span')
        .textContent()
    ).trim()
  ).toEqual('10/10');

  // sort by priority descendingly
  await tasklistPage.sortTask('Priority');
  expect(
    (
      await tasklistPage.page
        .locator('.tasks .task')
        .nth(0)
        .locator('.mainInfo > .leftCol > .priority > div > span')
        .textContent()
    ).trim()
  ).toEqual('10/10');
  expect(
    (
      await tasklistPage.page
        .locator('.tasks .task')
        .nth(1)
        .locator('.mainInfo > .leftCol > .priority > div > span')
        .textContent()
    ).trim()
  ).toEqual('1/10');
});

test('submits task', async ({ tasklistPage }) => {
  await tasklistPage.createUsertaskProcess();
  await tasklistPage.addTask();

  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();

  // submit task and wait for tasklist to remove the usertask
  await tasklistPage.submitTask();
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).toBeVisible();

  // filter for completed task, tasklist should show the submitted task again
  await tasklistPage.filterCompletedTasks();
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .status > div > span').textContent()
    ).trim()
  ).toEqual('COMPLETED');
});

test('pauses task', async ({ tasklistPage }) => {
  await tasklistPage.createUsertaskProcess();
  await tasklistPage.addTask();

  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .status > div > span').textContent()
    ).trim()
  ).toEqual('NEW');

  // pause task and wait for tasklist to remove the usertask
  await tasklistPage.pauseTask();
  await tasklistPage.page.getByRole('link', { name: 'Tasklist' }).click();
  await tasklistPage.page.waitForTimeout(5000);
  await expect(tasklistPage.emptyTasklist).toBeVisible();

  // filter for paused task, tasklist should show the submitted task again
  await tasklistPage.filterPausedTasks();
  await expect(tasklistPage.emptyTasklist).not.toBeVisible();
  expect(
    (
      await tasklistPage.page.locator('.mainInfo > .leftCol > .status > div > span').textContent()
    ).trim()
  ).toEqual('PAUSED');
});

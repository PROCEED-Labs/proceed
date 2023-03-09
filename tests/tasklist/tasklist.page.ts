import { Locator, Page } from '@playwright/test';

export class TasklistPage {
  readonly page: Page;
  readonly emptyTasklist: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyTasklist = page.getByText('There are currently no tasks in your queue.');
  }

  async goto() {
    await this.page.goto('/#/tasklist');
  }

  async addTask() {
    const page = this.page;

    // Start instance.
    await page.getByRole('link', { name: 'Executions' }).click();
    await page
      .getByRole('row', { name: 'My Process' })
      .getByRole('button', { name: 'Show Instances' })
      .click();
    await page.locator('span:nth-child(4) > .v-btn').first().click();
    await page.getByRole('link', { name: 'Tasklist' }).click();
  }

  async createUsertaskProcess() {
    const page = this.page;
    // TODO: reuse other page models for these set ups.
    // Add a new process.
    await page.goto('https://localhost:33083/#/process');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByLabel('Name*').fill('My Process');
    await page.getByLabel('Description').fill('Very important process!');
    await page.getByLabel('Department', { exact: true }).click();
    await page.getByRole('option', { name: 'Marketing' }).locator('i').click();
    await page.getByRole('option', { name: 'Purchasing' }).locator('i').click();
    await page.locator('div').filter({ hasText: 'Add Process' }).first().click();
    await page.getByRole('button', { name: 'Add Process' }).click();

    // Add Usertask.
    await page.mouse.move(600, 200);
    await page.mouse.down();
    await page.mouse.move(300, 200);
    await page.mouse.up();
    await page.locator('svg').nth(3).click();
    await page.locator('rect').first().click();
    await page.getByTitle('Append Task').click();
    await page.getByTitle('Append EndEvent').click();
    await page.locator('g:nth-child(2) > .djs-element > .djs-hit').click();
    await page.getByTitle('Change type').click();
    await page.getByRole('listitem', { name: 'User Task' }).locator('span').first().click();

    // Deploy.
    await page.getByRole('link', { name: 'Executions' }).click();
    await page.getByRole('button', { name: 'Deploy Process' }).click();
    await page
      .getByRole('row', { name: 'My Process' })
      .getByRole('button', { name: 'dynamic' })
      .click();
    await page.getByLabel('Version Name').fill('1');
    await page.getByLabel('Version Description').fill('1');
    await page.getByRole('button', { name: 'Create Version' }).click();
  }

  async removeAll() {
    const page = this.page;
    await page.getByRole('link', { name: 'Executions' }).click();
    await page.getByRole('button', { name: '󰆴' }).click();
    await page.getByRole('button', { name: 'Delete Deployment' }).click();
    await page.getByRole('link', { name: 'Processes' }).click();
    await page
      .getByRole('row', {
        name: 'Name: Not sorted. Activate to sort ascending. Last Edited: Not sorted. Activate to sort ascending. Departments',
      })
      .locator('div')
      .nth(2)
      .click();
    await page.getByRole('button', { name: 'Select Action' }).click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'Delete Process' }).click();
  }
}

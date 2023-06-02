import { Locator, Page } from '@playwright/test';

export class TasklistPage {
  readonly page: Page;
  readonly emptyTasklist: Locator;
  readonly priority: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyTasklist = page.getByText('There are currently no tasks in your queue.');
  }

  async goto() {
    await this.page.goto('/#/tasklist');
  }

  async addTask(processName = 'My Process') {
    const page = this.page;

    // Start instance.
    await page.getByRole('link', { name: 'Executions' }).click();
    await page
      .getByRole('row', { name: processName })
      .getByRole('button', { name: 'Show Instances' })
      .click();
    await page.locator('span:nth-child(4) > .v-btn').first().click();
  }
  /**
   * Creating a process with a UserTask including certain attributes
   * @param options options for the process to be created or the usertask inside of the process
   */
  async createUsertaskProcess(
    options: {
      processName?: string;
      priority?: number;
      duration?: {
        years?: number;
        months?: number;
        days?: number;
        hours?: number;
        minutes?: number;
        seconds?: number;
      };
    } = { processName: 'My Process' }
  ) {
    const page = this.page;
    const { processName, priority, duration } = options;

    // TODO: reuse other page models for these set ups.
    // Add a new process.
    await page.getByRole('link', { name: 'Processes' }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByLabel('Name*').fill(`${processName}`);
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
    await page.locator('.djs-direct-editing-content').fill('usertask');
    await page.getByTitle('Append EndEvent').click();
    await page.locator('g:nth-child(2) > .djs-element > .djs-hit').click();
    await page.getByTitle('Change type').click();
    await page.getByText('User Task').click();
    await page
      .getByRole('combobox')
      .filter({ hasText: 'Select Milestones' })
      .locator('div')
      .nth(1)
      .click();
    await page.getByLabel('Select Milestones').fill('Test');
    await page
      .getByRole('menuitem', { name: 'No result found. Create new Milestone?' })
      .locator('i')
      .click();
    await page.getByLabel('ID', { exact: true }).click();
    await page.getByLabel('ID', { exact: true }).fill('12345');
    await page
      .locator(
        '.v-dialog .v-input__control > .v-input__slot > .v-text-field__slot > input[for="Name"]'
      )
      .click();
    await page
      .locator(
        '.v-dialog .v-input__control > .v-input__slot > .v-text-field__slot > input[for="Name"]'
      )
      .fill('Test');
    await page.getByLabel('Description').click();
    await page.getByLabel('Description').fill('Test');
    await page.locator('.v-dialog').getByRole('button', { name: 'Save' }).click();

    // add priority for UserTask if given
    if (priority) {
      await page.getByLabel('Priority').click();
      await page.getByPlaceholder('Enter value from 1 to 10').fill(`${priority}`);
    }

    // add duration for UserTask if given
    if (duration) {
      const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = duration;
      await page.getByLabel('Planned Duration').click();
      await page.getByLabel('Years').click();
      await page.getByLabel('Years').fill(`${years}`);
      await page.getByLabel('Months').click();
      await page.getByLabel('Months').fill(`${months}`);
      await page.getByLabel('Days').click();
      await page.getByLabel('Days').fill(`${days}`);
      await page.getByLabel('Hours').click();
      await page.getByLabel('Hours').fill(`${hours}`);
      await page.getByLabel('Minutes').click();
      await page.getByLabel('Minutes').fill(`${minutes}`);
      await page.getByLabel('Seconds').click();
      await page.getByLabel('Seconds').fill(`${seconds}`);
      await page.getByRole('button', { name: 'Ok' }).click();
    }

    // Deploy.
    await page.getByRole('link', { name: 'Executions' }).click();
    await page.getByRole('button', { name: 'Deploy Process' }).click();
    await page
      .getByRole('row', { name: `${options.processName || 'My Process'}` })
      .getByRole('button', { name: 'dynamic' })
      .click();
    await page.getByLabel('Version Name').fill('1');
    await page.getByLabel('Version Description').fill('1');
    await page.getByRole('button', { name: 'Create Version' }).click();
    await page.waitForTimeout(2000);
  }

  async sortTask(attribute: string) {
    const page = this.page;
    await page.getByRole('button', { name: '󰒺', exact: true }).click();
    await page.getByRole('option', { name: 'Priority' }).click();
    await page.getByRole('button', { name: '󰒺', exact: true }).click();
  }

  async submitTask() {
    const page = this.page;
    await page.getByRole('link', { name: 'Tasklist' }).click();
    await page.getByRole('main').getByText('userTask').click();
    await page.frameLocator('iframe').getByRole('button', { name: 'Submit' }).click();
  }

  async filterPausedTasks() {
    const page = this.page;
    await page.getByRole('link', { name: 'Tasklist' }).click();
    await page.getByRole('button', { name: '󰈲 Filter Tasks' }).click();
    await page
      .locator(
        'div:nth-child(4) > .v-input__control > .v-input__slot > .v-input--selection-controls__input > .v-input--selection-controls__ripple'
      )
      .click();
    await page.getByRole('button', { name: '󰈲 Filter Tasks' }).click();
  }

  async filterCompletedTasks() {
    const page = this.page;
    await page.getByRole('link', { name: 'Tasklist' }).click();
    await page.getByRole('button', { name: '󰈲 Filter Tasks' }).click();
    await page
      .locator(
        'div:nth-child(3) > .v-input__control > .v-input__slot > .v-input--selection-controls__input > .v-input--selection-controls__ripple'
      )
      .click();
    await page.getByRole('button', { name: '󰈲 Filter Tasks' }).click();
  }

  async pauseTask() {
    const page = this.page;
    await page.getByRole('link', { name: 'Executions' }).click();
    await page.getByRole('button', { name: 'Show Instances' }).click();
    await page.locator('span:nth-child(5) > .v-btn').click();
    await page.getByRole('button', { name: 'Pause Instance' }).click();
    await page.getByRole('link', { name: 'Tasklist' }).click();
  }

  async changeProgressOfTask() {
    const page = this.page;
    await page.locator('div').filter({ hasText: 'usertask' }).click();
    await page
      .frameLocator('iframe')
      .getByLabel(
        'Milestone ID: 123 | Name: Milestone1 | Description: Beschreibung.Beschreibung.Beschreibung.\n            \n            0%'
      )
      .click();
  }

  async changePriorityOfTask(priority: Number) {
    const page = this.page;
    await page.getByRole('link', { name: 'Executions' }).click();
    await page.getByRole('button', { name: 'Show Instances' }).click();
    await page.getByRole('button', { name: '󰅖' }).click();
    await page.locator('g:nth-child(3) > .djs-element > .djs-hit').click();
    await page
      .locator(
        '#activityCard .container > div.row.mb-6.justify-center > div.col.col-12 > div:nth-child(3) > div.col.col-4 > div'
      )
      .getByRole('button', { name: '󰏫' })
      .click();
    await page.locator('.v-input--is-focused input').fill(`${priority}`);
    await page.locator('div').filter({ hasText: 'Priority:' }).first().click();
  }

  async removeAll() {
    const page = this.page;
    await page.getByRole('link', { name: 'Executions' }).click();

    const numberOfDeleteButtons = await page.getByRole('button', { name: '󰆴' }).count();
    for (let i = 0; i < numberOfDeleteButtons; i++) {
      await page.getByRole('button', { name: '󰆴' }).first().click();
      await page.getByRole('button', { name: 'Delete Deployment' }).click();
    }

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
    await page.locator('.v-dialog__content--active div.v-card__actions > button.error').click();
  }
}

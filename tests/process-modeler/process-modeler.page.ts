import { Locator, Page } from '@playwright/test';

export class ProcessModelerPage {
  readonly page: Page;
  processName?: string;
  processDescription?: string;
  processDefinitionID?: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    if (this.processDefinitionID) {
      await this.page.goto(
        `http://localhost:3000/credentials%3Adevelopment-id%7Cadmin/processes/${this.processDefinitionID}`,
      );
    } else {
      await this.page.goto('http://localhost:3000/credentials%3Adevelopment-id%7Cadmin/processes');
    }
  }

  async login() {
    const page = this.page;
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('johndoe | admin').click();
    await page.getByPlaceholder('johndoe | admin').fill('admin');
    await page.getByRole('button', { name: 'Sign in with Development Users' }).click();
  }

  /**
   * Creating a process to test the properties panel in
   * @param options options for the process to be created
   */
  async createProcess(
    options: {
      processName?: string;
      description?: string;
    } = { processName: 'My Process', description: 'Process Description' },
  ) {
    const page = this.page;
    const { processName, description } = options;

    // TODO: reuse other page models for these set ups.
    // Add a new process.
    await page.goto('http://localhost:3000/credentials%3Adevelopment-id%7Cadmin/processes');
    await page.getByRole('button', { name: 'New Process' }).click();
    await page.getByRole('textbox', { name: '* Process Name :' }).fill('Process Name');
    await page.getByLabel('Process Description').click();
    await page.getByLabel('Process Description').fill('Process Description');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(2000);

    const pageURL = page.url();
    const processDefinitionID = pageURL
      .split('http://localhost:3000/credentials:development-id%7Cadmin/processes/')
      .pop();
    this.processDefinitionID = processDefinitionID;
    this.processName = processName;
    this.processDescription = description;
  }

  async createSubprocess() {
    const page = this.page;
    await page.locator('.djs-shape[data-element-id^="StartEvent_"]').click();
    await page.getByTitle('Append Task').click();
    await page.getByTitle('Append EndEvent').click();
    await page.locator('.djs-shape[data-element-id^="Activity_"]').click();
    await page.getByTitle('Change type').click();
    await page
      .getByRole('listitem', { name: 'Sub Process (collapsed)' })
      .locator('span')
      .first()
      .click();
  }

  async removeAllProcesses() {
    const page = this.page;

    await page.goto('http://localhost:3000/credentials%3Adevelopment-id%7Cadmin/processes');
    await page.waitForTimeout(500);
    await page.getByLabel('Select all').check();
    await page.getByRole('button', { name: 'delete' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click();

    this.processDefinitionID = undefined;
    this.processName = undefined;
    this.processDescription = undefined;
  }
}

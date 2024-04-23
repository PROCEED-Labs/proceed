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
      await this.page.goto(`/processes/${this.processDefinitionID}`);
    } else {
      await this.page.goto('/processes');
    }
  }

  async login() {
    const page = this.page;
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as a Guest' }).click();
    await page.waitForURL('**/processes');
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
    await page.getByRole('button', { name: 'plus New' }).click();
    await page.getByRole('menuitem', { name: 'file Create Process' }).click();
    await page.getByRole('textbox', { name: '* Process Name :' }).fill('Process Name');
    await page.getByLabel('Process Description').fill('Process Description');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL(/\/processes\/([a-zA-Z0-9-_]+)/);

    const pageURL = page.url();
    const processDefinitionID = pageURL.split('/processes/').pop();
    this.processDefinitionID = processDefinitionID;
    this.processName = processName;
    this.processDescription = description;
  }

  async createSubprocess() {
    const page = this.page;
    await page.locator('.djs-shape[data-element-id^="StartEvent_"]').click();
    await page.getByTitle('Append task').click();
    await page.getByTitle('Append end event').click();
    await page.locator('.djs-shape[data-element-id^="Activity_"]').click();
    await page.getByTitle('Change element').click();
    await page
      .getByRole('listitem', { name: 'Sub-process (collapsed)' })
      .locator('span')
      .first()
      .click();
  }

  async removeAllProcesses() {
    const page = this.page;

    await page.goto('/processes');
    await page.waitForTimeout(500);
    await page.getByLabel('Select all').check();
    await page.getByRole('button', { name: 'delete' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click();

    this.processDefinitionID = undefined;
    this.processName = undefined;
    this.processDescription = undefined;
  }
}

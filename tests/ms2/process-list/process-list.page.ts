import { Locator, Page } from '@playwright/test';
import { PlatformPath } from 'path';
import * as path from 'path';

export class ProcessListPage {
  readonly page: Page;
  readonly path: PlatformPath;
  processListPageURL?: string;
  processDefinitionIds: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.path = path;
  }

  getPageURL() {
    return this.processListPageURL;
  }

  async goto() {
    await this.page.goto(this.processListPageURL);
  }

  async login() {
    const { page } = this;
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Sign in with Guest' }).click();
    await page.waitForTimeout(2000);
    this.processListPageURL = page.url();
  }

  async createProcess(
    options: {
      processName?: string;
      description?: string;
    } = { processName: 'My Process', description: 'Process Description' },
  ) {
    const { page, processListPageURL } = this;
    const { processName, description } = options;

    // TODO: reuse other page models for these set ups.
    // Add a new process.
    await page.goto(processListPageURL);
    await page.getByRole('button', { name: 'New Process' }).click();
    await page.getByRole('textbox', { name: '* Process Name :' }).fill(processName);
    await page.getByLabel('Process Description').click();
    await page.getByLabel('Process Description').fill(description);
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(2000);

    const pageURL = page.url();
    const processDefinitionID = pageURL.split(processListPageURL + '/').pop();
    this.processDefinitionIds.push(processDefinitionID);

    // return to the process list
    await page.goto(processListPageURL);

    return processDefinitionID;
  }

  getDefinitionIds() {
    return this.processDefinitionIds;
  }

  async removeProcess(definitionId: string) {
    const { page } = this;

    await page
      .locator(`tr[data-row-key="${definitionId}"]`)
      .getByRole('button', { name: 'delete' })
      .click();

    await page.getByRole('button', { name: 'OK' }).click();

    this.processDefinitionIds = this.processDefinitionIds.filter((id) => id !== definitionId);
  }

  async removeAllProcesses() {
    const { page, processListPageURL } = this;

    await page.goto(processListPageURL);
    await page.waitForTimeout(500);
    await page.getByLabel('Select all').check();
    await page.getByRole('button', { name: 'delete' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click();

    this.processDefinitionIds = [];
  }
}

import { Page } from '@playwright/test';
import { PlatformPath } from 'path';
import * as path from 'path';
import fs from 'fs';
import JsZip from 'jszip';
import { getDefinitionsInfos } from '@proceed/bpmn-helper';

export class ProcessListPage {
  readonly page: Page;
  readonly path: PlatformPath;
  processListPageURL?: string;
  processDefinitionIds: string[] = [];
  importedProcessInfo: {
    [filename: string]: { definitionId: string; bpmn: string; definitionName: string };
  } = {};

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
    await page.getByRole('button', { name: 'Continue as a Guest' }).click();
    await page.waitForTimeout(2000);
    this.processListPageURL = page.url();
  }

  async importProcess(filename: string) {
    const { page } = this;
    // import the test process
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import Process' }).click();
    const filechooser = await fileChooserPromise;
    const importFilePath = path.join(__dirname, 'fixtures', filename);
    await filechooser.setFiles(importFilePath);
    await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();

    if (!this.importedProcessInfo[filename]) {
      const bpmn = fs.readFileSync(importFilePath, 'utf-8');
      const { id, name } = await getDefinitionsInfos(bpmn);
      this.importedProcessInfo[filename] = { bpmn, definitionId: id, definitionName: name };
    }

    return this.importedProcessInfo[filename];
  }

  async handleDownload(downloadTrigger: () => Promise<void>, type: 'bpmn'): Promise<string>;
  async handleDownload(downloadTrigger: () => Promise<void>, type: 'zip'): Promise<JsZip>;
  async handleDownload(downloadTrigger: () => Promise<void>, type: 'bpmn' | 'zip') {
    const { page } = this;
    const downloadPromise = page.waitForEvent('download');

    await downloadTrigger();

    const download = await downloadPromise;

    const stream = await download.createReadStream();

    // stream to string: https://stackoverflow.com/a/49428486
    const data: Buffer = await new Promise((resolve, reject) => {
      let chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    if (type === 'bpmn') return data.toString('utf-8');
    if (type === 'zip') return JsZip.loadAsync(data.toString('base64'), { base64: true });
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
    // check if there are processes to remove
    if (!(await page.locator('tr[data-row-key]').all()).length) return;
    // remove all processes
    await page.getByLabel('Select all').check();
    await page.getByRole('button', { name: 'delete' }).first().click();
    await page.getByRole('button', { name: 'OK' }).click();

    this.processDefinitionIds = [];
  }
}

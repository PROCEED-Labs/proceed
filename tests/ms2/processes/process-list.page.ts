import { Page } from '@playwright/test';
import * as path from 'path';
import fs from 'fs';
import JsZip from 'jszip';
import { getDefinitionsInfos, setDefinitionsId, setTargetNamespace } from '@proceed/bpmn-helper';
import { v4 } from 'uuid';
import { expect } from './process-list.fixtures';
import { closeModal, openModal } from '../testUtils';

export class ProcessListPage {
  readonly page: Page;
  processDefinitionIds: string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/processes');
  }

  /**
   * Imports a process file that is stored in fixtures into the MS
   *
   * @param filename the name of the file in /fixtures to import
   * @param definitionId will be used to identify the process in the MS (two imports with the same id will clash)
   * @returns meta data about the imported process (id and name)
   */
  async importProcess(filename: string, definitionId = `_${v4()}`) {
    const { page } = this;

    const importFilePath = path.join(__dirname, 'fixtures', filename);
    let bpmn = fs.readFileSync(importFilePath, 'utf-8');
    bpmn = (await setDefinitionsId(bpmn, definitionId)) as string;
    bpmn = (await setTargetNamespace(bpmn, definitionId)) as string;
    const { name } = await getDefinitionsInfos(bpmn);

    // import the test process
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import Process' }).click();
    const filechooser = await fileChooserPromise;

    await filechooser.setFiles({
      name: filename,
      mimeType: 'text/xml',
      buffer: Buffer.from(bpmn, 'utf-8'),
    });
    await closeModal(page.getByRole('dialog').getByRole('button', { name: 'Import' }));

    this.processDefinitionIds.push(definitionId);

    return { definitionName: name as string, definitionId, bpmn };
  }

  /**
   * Helper function that returns the data that is download when an export is triggered in the MS
   *
   * @param downloadTrigger the user input that triggers the download (e.g. confirming the export modal)
   * @param returnType the type of file that is exported (zip or clear text)
   */
  async handleDownload(
    downloadTrigger: () => Promise<void>,
    returnType: 'string',
  ): Promise<{ filename: string; content: string }>;
  async handleDownload(
    downloadTrigger: () => Promise<void>,
    returnType: 'zip',
  ): Promise<{ filename: string; content: JsZip }>;
  async handleDownload(downloadTrigger: () => Promise<void>, returnType: 'string' | 'zip') {
    const { page } = this;
    const downloadPromise = page.waitForEvent('download');

    await downloadTrigger();

    const download = await downloadPromise;

    const stream = await download.createReadStream();

    // stream to string: https://stackoverflow.com/a/49428486
    const data: Buffer = await new Promise((resolve, reject) => {
      let chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    if (returnType === 'string') {
      return { filename: download.suggestedFilename(), content: data.toString('utf-8') };
    }
    if (returnType === 'zip') {
      return {
        filename: download.suggestedFilename(),
        content: await JsZip.loadAsync(data.toString('base64'), { base64: true }),
      };
    }
  }

  getDefinitionIds() {
    return this.processDefinitionIds;
  }

  async removeProcess(definitionId: string) {
    const { page } = this;

    const modal = await openModal(
      page.locator(`tr[data-row-key="${definitionId}"]`).getByRole('button', { name: 'delete' }),
    );

    await closeModal(modal.getByRole('button', { name: 'OK' }));

    this.processDefinitionIds = this.processDefinitionIds.filter((id) => id !== definitionId);
  }

  async createProcess(options: { processName?: string; description?: string }) {
    const page = this.page;
    const { processName, description } = options;

    // Add a new process.
    const modal = await openModal(page.getByRole('button', { name: 'Create Process' }));
    await modal
      .getByRole('textbox', { name: '* Process Name :' })
      .fill(processName ?? 'My Process');
    await modal.getByLabel('Process Description').fill(description ?? 'Process Description');
    await closeModal(modal.getByRole('button', { name: 'Create', exact: true }));
    await page.waitForURL(/processes\/([a-zA-Z0-9-_]+)/);

    const definitionId = page.url().split('processes/').pop();

    this.processDefinitionIds.push(definitionId);

    return definitionId;
  }

  async removeAllProcesses() {
    const { page } = this;

    if (this.processDefinitionIds.length) {
      if (!page.url().endsWith('processes')) {
        await this.goto();
        await page.waitForURL('**/processes');
      }

      // make sure that the list is fully loaded otherwise clicking the select all checkbox will not work as expected
      await page.getByRole('columnheader', { name: 'Name' }).waitFor({ state: 'visible' });

      // remove all processes
      await page.getByLabel('Select all').check();
      const modal = await openModal(page.getByRole('button', { name: 'delete' }).first());
      await closeModal(modal.getByRole('button', { name: 'OK' }));

      // Note: If used in a test, there should be a check for the empty list to
      // avoid double navigations next.

      this.processDefinitionIds = [];
    }
  }

  async readClipboard(readAsText) {
    const { page } = this;
    const result = await page.evaluate(async (readAsText) => {
      if (readAsText) {
        return await navigator.clipboard.readText();
      } else {
        const clipboardItems = await navigator.clipboard.read();
        return clipboardItems[0].types[0];
      }
    }, readAsText);

    return result;
  }

  async createFolder({
    folderName,
    folderDescription,
  }: {
    folderName: string;
    folderDescription?: string;
  }) {
    const { page } = this;

    // NOTE: selecting a table could break
    const table = page.locator('table tbody');
    await table.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Create Folder' }).click();
    await page.getByLabel('Folder name').fill(folderName);
    if (folderDescription) await page.getByLabel('Description').fill(folderDescription);
    await page.getByRole('button', { name: 'OK' }).click();
    // NOTE: this could break if there is another folder with the same name
    const folderRow = page.locator(`tr:has(span:text-is("${folderName}"))`);
    await expect(folderRow).toBeVisible();
  }
}

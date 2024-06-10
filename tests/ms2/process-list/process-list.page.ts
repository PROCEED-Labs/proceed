import { Page, Locator } from '@playwright/test';
import { PlatformPath } from 'path';
import * as path from 'path';
import fs from 'fs';
import JsZip from 'jszip';
import { getDefinitionsInfos, setDefinitionsId, setTargetNamespace } from '@proceed/bpmn-helper';
import { v4 } from 'uuid';

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
    if (this.processListPageURL) await this.page.goto(this.processListPageURL);
  }

  async login() {
    const { page } = this;

    const loginModal = await this.openModal(async () => {
      await page.goto('/');
    });
    await loginModal.getByRole('button', { name: 'Continue as a Guest' }).click();
    await page.waitForURL('**/processes');
    this.processListPageURL = page.url();
  }

  /**
   * Imports a process file that is stored in fixtures into the MS
   *
   * @param filename the name of the file in /fixtures to import
   * @param definitionId will be used to identify the process in the MS (two imports with the same id will clash)
   * @returns meta data about the imported process (id and name)
   */
  async importProcess(
    filename: string,
    definitionId = `_${v4()}`,
    transformBpmn?: (bpmn: string) => Promise<string>,
  ) {
    const { page } = this;

    const importFilePath = path.join(__dirname, 'fixtures', filename);
    let bpmn = fs.readFileSync(importFilePath, 'utf-8');
    bpmn = (await setDefinitionsId(bpmn, definitionId)) as string;
    bpmn = (await setTargetNamespace(bpmn, definitionId)) as string;

    if (transformBpmn) bpmn = await transformBpmn(bpmn);

    const { name } = await getDefinitionsInfos(bpmn);

    // import the test process
    const importModal = await this.openModal(async () => {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import Process' }).click();
      const filechooser = await fileChooserPromise;

      await filechooser.setFiles({
        name: filename,
        mimeType: 'text/xml',
        buffer: Buffer.from(bpmn, 'utf-8'),
      });
    });

    await this.closeModal(importModal, (m) => m.getByRole('button', { name: 'Import' }).click());

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

    const deleteModal = await this.openModal(() =>
      page
        .locator(`tr[data-row-key="${definitionId}"]`)
        .getByRole('button', { name: 'delete' })
        .click(),
    );

    await this.closeModal(deleteModal, (m) => m.getByRole('button', { name: 'OK' }).click());

    this.processDefinitionIds = this.processDefinitionIds.filter((id) => id !== definitionId);
  }

  async createProcess(options: { processName?: string; description?: string }) {
    const page = this.page;
    const { processName, description } = options;

    // TODO: reuse other page models for these set ups.
    // Add a new process.
    const createModal = await this.openModal(() =>
      page.getByRole('button', { name: 'Create Process' }).click(),
    );
    await createModal
      .getByRole('textbox', { name: '* Process Name :' })
      .fill(processName ?? 'My Process');
    await createModal.getByLabel('Process Description').fill(description ?? 'Process Description');
    await this.closeModal(createModal, (m) =>
      m.getByRole('button', { name: 'Create', exact: true }).click(),
    );
    await page.waitForURL(/processes\/([a-zA-Z0-9-_]+)/);

    const definitionId = page.url().split('processes/').pop();

    this.processDefinitionIds.push(definitionId);

    return definitionId;
  }

  async removeAllProcesses() {
    const { page, processListPageURL } = this;

    if (processListPageURL && this.processDefinitionIds.length) {
      await page.goto(processListPageURL);
      await page.waitForURL('**/processes');

      // make sure that the list is fully loaded otherwise clicking the select all checkbox will not work as expected
      await page.getByRole('columnheader', { name: 'Name' }).waitFor({ state: 'visible' });
      // remove all processes
      await page.getByLabel('Select all').check();

      const deleteModal = await this.openModal(() =>
        page.getByRole('button', { name: 'delete' }).first().click(),
      );
      await this.closeModal(deleteModal, (m) => m.getByRole('button', { name: 'OK' }).click());

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

  /**
   * Will open a modal using the given trigger function and ensure that it is fully open before resolving
   *
   * @param trigger the function that triggers the modal opening
   * @param page the page the modal should be opened on (defaults to the default page)
   *
   * @returns a locator that can be used to get the newly opened modal
   */
  async openModal(trigger: () => Promise<void>, page = this.page) {
    // get the modals that might already be open
    const numAlreadyOpenModals = (await page.locator(`div[aria-modal="true"]:visible`).all())
      .length;

    await trigger();

    // wait for the previous amount of modals + 1 modals to be findable
    await page
      .locator(`div[aria-modal="true"]:visible`)
      .and(page.locator(`div[aria-modal="true"]:not(.ant-zoom)`))
      .nth(numAlreadyOpenModals)
      .waitFor();

    // TODO: the following is working for now but it might not work in every case if it is possible that the opened modal is not the last one in the locator list
    // wait for the modal to be visible and finished with its animation
    const currentlyOpenModals = await page
      .locator(`div[aria-modal="true"]:visible`)
      .and(page.locator(`div[aria-modal="true"]:not(.ant-zoom)`));
    await (await currentlyOpenModals.last().elementHandle()).waitForElementState('stable');
    const handle = await currentlyOpenModals.last().elementHandle();

    return await currentlyOpenModals.last();
  }

  /**
   * Will close a modal by clicking the given button and ensure it is fully closed before resolving
   *
   * @param closeButton locator of the button to click for closing the modal
   * @param page the page on which the modal exists (defaults to the default page)
   */
  async closeModal(modalLocator: Locator, trigger: (modalLocator: Locator) => Promise<void>) {
    const elementHandle = await modalLocator.elementHandle();
    await trigger(modalLocator);
    await elementHandle.waitForElementState('hidden');
  }
}

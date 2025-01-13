import { Page } from '@playwright/test';
import { openModal, closeModal } from '../../testUtils';

export class ProcessModelerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
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

  async createVersion(name: string, description: string) {
    const { page } = this;

    let versionModal = await openModal(page, () =>
      page.getByLabel('general-modeler-toolbar').getByRole('button', { name: 'plus' }).click(),
    );
    await versionModal.getByPlaceholder('Version Name').fill(name);
    await versionModal.getByPlaceholder('Version Description').fill(description);
    await closeModal(versionModal, () =>
      versionModal.getByRole('button', { name: 'Create Version' }).click(),
    );
    const url = page.url();
    await page.getByText('Latest Version').click();
    await page.getByText(name).click();
    await page.waitForURL(/\?version=/);
    const versionId = page.url().split('?version=').pop();
    await page.goto(url);
    await page.waitForURL(url);
    return versionId;
  }
}

import { Page } from '@playwright/test';

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
}

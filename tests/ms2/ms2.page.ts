import { Page } from '@playwright/test';
import { mockClipboardAPI, openModal } from './testUtils';

export class MS2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login() {
    await mockClipboardAPI(this.page);
    const modal = await openModal(async () => {
      this.page.goto('/');
    }, this.page);
    await modal.getByRole('button', { name: 'Continue as a Guest' }).click();
    await this.page.waitForURL('**/processes');
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
}
